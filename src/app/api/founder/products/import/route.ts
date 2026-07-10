import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";
import {
  parseCatalogWorkbook,
  resolveCategory,
  PARENT_CATEGORIES,
  type CatalogImportProductGroup,
  type CatalogImportRow,
} from "@/lib/founder/catalog-import";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const DEFAULT_CHUNK_SIZE = 20; // product groups per request — keeps each call well under a serverless timeout
const VARIANT_BATCH_SIZE = 40; // upserts per $transaction call

async function ensureUniqueSlug(baseSlug: string, qikinkProductId: string): Promise<string> {
  let slug = baseSlug;
  let attempt = 1;
  for (;;) {
    const existing = await prisma.product.findUnique({ where: { slug }, select: { qikinkProductId: true } });
    if (!existing || existing.qikinkProductId === qikinkProductId) return slug;
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }
}

/** Upserts variants in batched transactions instead of one round-trip per
 * row — 2800 sequential awaits in a single request is what took down the
 * founder portal the first time this ran (serverless timeout + the DB
 * connection pool held open long enough to starve every other page). Each
 * batch is one transaction call; a batch that fails (e.g. a genuine
 * constraint collision) falls back to per-row so one bad SKU doesn't lose
 * the other 39 in it. created-vs-updated is inferred from createdAt vs
 * updatedAt instead of a separate findUnique per row. */
async function upsertVariantsBatched(rows: CatalogImportRow[], productId: string) {
  let created = 0;
  let updated = 0;
  const errors: { sku: string; error: string }[] = [];

  function buildUpsert(row: CatalogImportRow) {
    return prisma.productVariant.upsert({
      where: { sku: row.sku },
      update: {
        size: row.size,
        color: row.colorName || null,
        price: row.basePrice,
        weightGrams: row.shippingWeightGrams ?? undefined,
      },
      create: {
        qikinkVariantId: `csv:${row.sku}`,
        productId,
        size: row.size,
        color: row.colorName || null,
        sku: row.sku,
        price: row.basePrice,
        stock: 0,
        isOutOfStock: true,
        weightGrams: row.shippingWeightGrams ?? undefined,
      },
    });
  }

  function tally(v: { createdAt: Date; updatedAt: Date }) {
    if (v.createdAt.getTime() === v.updatedAt.getTime()) created += 1;
    else updated += 1;
  }

  for (let i = 0; i < rows.length; i += VARIANT_BATCH_SIZE) {
    const batch = rows.slice(i, i + VARIANT_BATCH_SIZE);
    try {
      const results = await prisma.$transaction(batch.map((row) => buildUpsert(row)));
      results.forEach(tally);
    } catch {
      for (const row of batch) {
        try {
          tally(await buildUpsert(row));
        } catch (err) {
          errors.push({ sku: row.sku, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }
  }

  return { created, updated, errors };
}

async function commitGroup(group: CatalogImportProductGroup, categoryIdByLeafSlug: Map<string, string>) {
  const qikinkProductId = `csv:${group.productKey}`;
  const { slug: leafSlug } = resolveCategory(group.genderName, group.categoryName);
  const categoryId = categoryIdByLeafSlug.get(leafSlug) ?? null;

  const existingProduct = await prisma.product.findUnique({ where: { qikinkProductId }, select: { id: true } });

  const product = existingProduct
    ? await prisma.product.update({
        where: { qikinkProductId },
        data: {
          title: group.title,
          description: group.description,
          categoryId,
          basePrice: group.basePrice,
          syncStatus: "SYNCED",
          lastSyncedAt: new Date(),
        },
      })
    : await prisma.product.create({
        data: {
          qikinkProductId,
          title: group.title,
          slug: await ensureUniqueSlug(slugify(group.title) || slugify(group.productKey), qikinkProductId),
          description: group.description,
          categoryId,
          basePrice: group.basePrice,
          isActive: true, // a founder-uploaded catalog sheet is an intentional publish, unlike a passive Qikink sync
          syncStatus: "SYNCED",
          lastSyncedAt: new Date(),
        },
      });

  const { created: variantsCreated, updated: variantsUpdated, errors: variantErrors } = await upsertVariantsBatched(
    group.rows,
    product.id,
  );

  const taxRates = Array.from(new Set(group.rows.map((r) => r.taxRatePercent).filter((v): v is number => v !== null)));
  if (taxRates.length > 0) {
    const taxRatePercent = taxRates[0];
    await prisma.productCost.upsert({
      where: { productId: product.id },
      update: { taxRatePercent },
      create: { productId: product.id, taxRatePercent },
    });
  }

  return {
    productId: product.id,
    title: product.title,
    productCreated: !existingProduct,
    variantsCreated,
    variantsUpdated,
    variantErrors,
    mixedTaxRates: taxRates.length > 1,
  };
}

export async function POST(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const formData = await req.formData();
  const file = formData.get("file");
  const dryRun = formData.get("dryRun") !== "false";
  const offset = Math.max(0, Number(formData.get("offset") ?? 0) || 0);
  const chunkSize = Math.max(1, Number(formData.get("chunkSize") ?? DEFAULT_CHUNK_SIZE) || DEFAULT_CHUNK_SIZE);

  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File must be under 15MB" }, { status: 400 });

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = parseCatalogWorkbook(buffer);
  } catch (err) {
    return NextResponse.json(
      { error: `Couldn't read that file as a spreadsheet: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 },
    );
  }

  if (parsed.groups.length === 0) {
    return NextResponse.json({ error: "No valid rows found in the sheet", rowErrors: parsed.rowErrors }, { status: 400 });
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      totalRows: parsed.totalRows,
      importedRows: parsed.importedRows,
      productCount: parsed.groups.length,
      variantCount: parsed.groups.reduce((sum, g) => sum + g.rows.length, 0),
      rowErrors: parsed.rowErrors.slice(0, 100),
      rowErrorCount: parsed.rowErrors.length,
      sampleGroups: parsed.groups.slice(0, 25).map((g) => ({
        title: g.title,
        categoryName: g.categoryName,
        genderName: g.genderName,
        variantCount: g.rows.length,
        colors: Array.from(new Set(g.rows.map((r) => r.colorName).filter(Boolean))),
        sizes: Array.from(new Set(g.rows.map((r) => r.size))),
        basePrice: g.basePrice,
      })),
    });
  }

  // Only this chunk's product groups — committing the whole file in one
  // request is what caused the outage (thousands of sequential DB round
  // trips in a single serverless invocation). The client drives the loop,
  // calling this endpoint repeatedly with an increasing offset.
  const chunkGroups = parsed.groups.slice(offset, offset + chunkSize);
  if (chunkGroups.length === 0) {
    return NextResponse.json({ error: `offset ${offset} is past the end of ${parsed.groups.length} products` }, { status: 400 });
  }

  const leafCategories = new Map<string, ReturnType<typeof resolveCategory>>();
  for (const group of chunkGroups) {
    const resolved = resolveCategory(group.genderName, group.categoryName);
    if (!leafCategories.has(resolved.slug)) leafCategories.set(resolved.slug, resolved);
  }

  const parentIdByKey = new Map<keyof typeof PARENT_CATEGORIES, string>();
  for (const { parentKey } of Array.from(leafCategories.values())) {
    if (parentIdByKey.has(parentKey)) continue;
    const def = PARENT_CATEGORIES[parentKey];
    const parent = await prisma.category.upsert({
      where: { slug: def.slug },
      update: {},
      create: { name: def.name, slug: def.slug },
    });
    parentIdByKey.set(parentKey, parent.id);
  }

  const categoryIdByLeafSlug = new Map<string, string>();
  for (const leaf of Array.from(leafCategories.values())) {
    const category = await prisma.category.upsert({
      where: { slug: leaf.slug },
      update: {},
      create: { name: leaf.name, slug: leaf.slug, parentId: parentIdByKey.get(leaf.parentKey) },
    });
    categoryIdByLeafSlug.set(leaf.slug, category.id);
  }

  const results = [];
  for (const group of chunkGroups) {
    results.push(await commitGroup(group, categoryIdByLeafSlug));
  }

  const productsCreated = results.filter((r) => r.productCreated).length;
  const variantsCreated = results.reduce((sum, r) => sum + r.variantsCreated, 0);
  const variantsUpdated = results.reduce((sum, r) => sum + r.variantsUpdated, 0);
  const variantErrors = results.flatMap((r) => r.variantErrors.map((e) => ({ ...e, product: r.title })));
  const itemsFailed = variantErrors.length;
  const nextOffset = offset + chunkGroups.length;
  const done = nextOffset >= parsed.groups.length;

  if (done) {
    await prisma.syncLog.create({
      data: {
        jobType: "CATALOG_IMPORT",
        status: parsed.rowErrors.length === 0 && itemsFailed === 0 ? "SUCCESS" : "PARTIAL",
        itemsSynced: parsed.groups.reduce((sum, g) => sum + g.rows.length, 0),
        itemsFailed: parsed.rowErrors.length,
        errorMessage: parsed.rowErrors.length > 0 ? `${parsed.rowErrors.length} rows skipped during parsing` : undefined,
        finishedAt: new Date(),
      },
    });
    await logFounderAction({
      founderUserId: session.user.id,
      action: "catalog.csv_imported",
      metadata: { fileName: file.name, totalProducts: parsed.groups.length },
    });
  }

  return NextResponse.json({
    dryRun: false,
    done,
    nextOffset,
    totalGroups: parsed.groups.length,
    productCount: results.length,
    productsCreated,
    variantsCreated,
    variantsUpdated,
    variantErrors: variantErrors.slice(0, 100),
    rowErrorCount: parsed.rowErrors.length,
  });
}
