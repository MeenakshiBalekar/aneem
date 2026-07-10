import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";
import { parseCatalogWorkbook, resolveCategory, PARENT_CATEGORIES, type CatalogImportProductGroup } from "@/lib/founder/catalog-import";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

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

/** Upserts one product-group (already-validated rows sharing a grouping
 * key) plus its variants. CSV/SKU-sheet imports don't carry stock
 * quantities (unlike a real Qikink sync payload) — a fresh variant is
 * created out-of-stock rather than guessing, and re-imports never touch an
 * existing variant's stock, so a later inventory sync/webhook stays the
 * one source of truth for that field. */
async function commitGroup(group: CatalogImportProductGroup, categoryIdByLeafSlug: Map<string, string>) {
  const qikinkProductId = `csv:${group.productKey}`;
  const { slug: leafSlug } = resolveCategory(group.genderName, group.categoryName);
  const categoryId = categoryIdByLeafSlug.get(leafSlug) ?? null;
  const baseSlug = slugify(group.title) || slugify(group.productKey);
  const slug = await ensureUniqueSlug(baseSlug, qikinkProductId);

  const productExisted = (await prisma.product.findUnique({ where: { qikinkProductId }, select: { id: true } })) !== null;

  const product = await prisma.product.upsert({
    where: { qikinkProductId },
    update: {
      title: group.title,
      description: group.description,
      categoryId,
      basePrice: group.basePrice,
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
    },
    create: {
      qikinkProductId,
      title: group.title,
      slug,
      description: group.description,
      categoryId,
      basePrice: group.basePrice,
      isActive: true, // a founder-uploaded catalog sheet is an intentional publish, unlike a passive Qikink sync
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
    },
  });

  const variantErrors: { sku: string; error: string }[] = [];
  let variantsCreated = 0;
  let variantsUpdated = 0;

  for (const row of group.rows) {
    try {
      const existing = await prisma.productVariant.findUnique({ where: { sku: row.sku }, select: { id: true } });
      await prisma.productVariant.upsert({
        where: { sku: row.sku },
        update: {
          size: row.size,
          color: row.colorName || null,
          price: row.basePrice,
          weightGrams: row.shippingWeightGrams ?? undefined,
        },
        create: {
          qikinkVariantId: `csv:${row.sku}`,
          productId: product.id,
          size: row.size,
          color: row.colorName || null,
          sku: row.sku,
          price: row.basePrice,
          stock: 0,
          isOutOfStock: true,
          weightGrams: row.shippingWeightGrams ?? undefined,
        },
      });
      if (existing) variantsUpdated += 1;
      else variantsCreated += 1;
    } catch (err) {
      variantErrors.push({ sku: row.sku, error: err instanceof Error ? err.message : String(err) });
    }
  }

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
    productCreated: !productExisted,
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

  // Ensure every parent + leaf category the sheet references exists before
  // touching any product — same upsert-by-slug pattern as prisma/seed.ts,
  // so this works whether or not the seed script has ever been run.
  const leafCategories = new Map<string, ReturnType<typeof resolveCategory>>();
  for (const group of parsed.groups) {
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
  for (const group of parsed.groups) {
    results.push(await commitGroup(group, categoryIdByLeafSlug));
  }

  const productsCreated = results.filter((r) => r.productCreated).length;
  const variantsCreated = results.reduce((sum, r) => sum + r.variantsCreated, 0);
  const variantsUpdated = results.reduce((sum, r) => sum + r.variantsUpdated, 0);
  const variantErrors = results.flatMap((r) => r.variantErrors.map((e) => ({ ...e, product: r.title })));
  const itemsFailed = variantErrors.length + parsed.rowErrors.length;

  await prisma.syncLog.create({
    data: {
      jobType: "CATALOG_IMPORT",
      status: itemsFailed === 0 ? "SUCCESS" : variantsCreated + variantsUpdated > 0 ? "PARTIAL" : "FAILED",
      itemsSynced: variantsCreated + variantsUpdated,
      itemsFailed,
      errorMessage: itemsFailed > 0 ? `${itemsFailed} rows failed to import` : undefined,
      finishedAt: new Date(),
    },
  });

  await logFounderAction({
    founderUserId: session.user.id,
    action: "catalog.csv_imported",
    metadata: { fileName: file.name, productCount: results.length, variantsCreated, variantsUpdated, itemsFailed },
  });

  return NextResponse.json({
    dryRun: false,
    productCount: results.length,
    productsCreated,
    variantsCreated,
    variantsUpdated,
    variantErrors: variantErrors.slice(0, 100),
    rowErrorCount: parsed.rowErrors.length,
  });
}
