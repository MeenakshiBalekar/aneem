import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { uploadAsset, isBlobConfigured } from "@/lib/blob";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";
import { PARENT_CATEGORIES } from "@/lib/qikink/category-map";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const payloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  parentSlug: z.enum(["men", "women", "kids", "accessories"]),
  categoryName: z.string().trim().min(1).max(100),
  basePrice: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  initialStock: z.number().int().min(0).max(100000).default(50),
  variants: z
    .array(z.object({ color: z.string().trim().min(1).max(60), size: z.string().trim().min(1).max(30), sku: z.string().trim().min(1).max(80) }))
    .min(1),
});

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let attempt = 1;
  for (;;) {
    const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }
}

/** Manual "Add Product" flow — for a founder building the catalog directly
 * from fixed colors/sizes/categories instead of a spreadsheet import.
 * Unlike CSV-imported products, this is an intentional, complete listing
 * (real title, real category, real price the founder just typed), so it
 * ships with actual stock instead of the "out of stock until proven
 * otherwise" default the CSV importer uses for data it can't vouch for. */
export async function POST(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const formData = await req.formData();
  const rawData = formData.get("data");
  if (typeof rawData !== "string") return NextResponse.json({ error: "Missing form data" }, { status: 400 });

  const parsed = payloadSchema.safeParse(JSON.parse(rawData));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const skuSet = new Set(data.variants.map((v) => v.sku));
  if (skuSet.size !== data.variants.length) {
    return NextResponse.json({ error: "Duplicate SKUs in variant list" }, { status: 400 });
  }
  const existingSkus = await prisma.productVariant.findMany({ where: { sku: { in: Array.from(skuSet) } }, select: { sku: true } });
  if (existingSkus.length > 0) {
    return NextResponse.json({ error: `SKU(s) already in use: ${existingSkus.map((s) => s.sku).join(", ")}` }, { status: 409 });
  }

  const parentDef = PARENT_CATEGORIES[data.parentSlug];
  const parent = await prisma.category.upsert({
    where: { slug: parentDef.slug },
    update: {},
    create: { name: parentDef.name, slug: parentDef.slug },
  });
  const leafSlug = slugify(`${data.parentSlug}-${data.categoryName}`);
  const category = await prisma.category.upsert({
    where: { slug: leafSlug },
    update: {},
    create: { name: data.categoryName, slug: leafSlug, parentId: parent.id },
  });

  const slug = await ensureUniqueSlug(slugify(data.title));
  const product = await prisma.product.create({
    data: {
      qikinkProductId: `manual:${crypto.randomUUID()}`,
      title: data.title,
      slug,
      description: data.description || data.title,
      categoryId: category.id,
      basePrice: data.basePrice,
      compareAtPrice: data.compareAtPrice,
      isActive: true,
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
    },
  });

  for (const v of data.variants) {
    await prisma.productVariant.create({
      data: {
        qikinkVariantId: `manual:${v.sku}`,
        productId: product.id,
        size: v.size,
        color: v.color,
        sku: v.sku,
        price: data.basePrice,
        compareAtPrice: data.compareAtPrice,
        stock: data.initialStock,
        isOutOfStock: data.initialStock <= 0,
      },
    });
  }

  const colors = Array.from(new Set(data.variants.map((v) => v.color)));
  let sortOrder = 0;
  const imageWarnings: string[] = [];
  if (colors.length > 0 && !isBlobConfigured()) {
    imageWarnings.push("Image storage isn't configured (BLOB_READ_WRITE_TOKEN) — product created without photos.");
  } else {
    for (const color of colors) {
      for (const angle of ["front", "back"] as const) {
        const file = formData.get(`${angle}__${color}`);
        if (!(file instanceof File)) continue;
        if (!file.type.startsWith("image/")) {
          imageWarnings.push(`${color} ${angle}: not an image, skipped`);
          continue;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          imageWarnings.push(`${color} ${angle}: over 10MB, skipped`);
          continue;
        }
        try {
          const url = await uploadAsset(file, `products/${product.id}`);
          await prisma.productImage.create({
            data: { productId: product.id, url, color, sortOrder: sortOrder++, isLifestyle: false },
          });
        } catch (err) {
          // The product + variants already exist at this point — a storage
          // hiccup on one photo (bad token, transient network error, quota)
          // must not take down the whole request and leave the founder
          // wondering whether the product was even created.
          imageWarnings.push(`${color} ${angle}: upload failed (${err instanceof Error ? err.message : String(err)})`);
        }
      }
    }
  }

  await logFounderAction({
    founderUserId: session.user.id,
    action: "product.created_manual",
    entityType: "Product",
    entityId: product.id,
    metadata: { title: data.title, variantCount: data.variants.length, colorCount: colors.length },
  });

  return NextResponse.json({ id: product.id, slug: product.slug, imageWarnings }, { status: 201 });
}
