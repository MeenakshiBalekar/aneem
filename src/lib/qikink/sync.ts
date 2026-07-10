import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { qikinkClient } from "./client";
import type { QikinkFulfillmentUpdate, QikinkProduct } from "./types";

// Category name -> our Category slug. New Qikink categories fall back to
// an auto-created category via ensureCategory(), so a brand-new product
// type in Qikink never gets silently dropped.
const CATEGORY_SLUG_MAP: Record<string, string> = {
  "Men's Oversized T-Shirts": "mens-oversized-tshirts",
  "Men's Gym T-Shirts": "mens-gym-tshirts",
  "Men's Oversized Shirts": "mens-oversized-shirts",
  "Women's Oversized T-Shirts": "womens-oversized-tshirts",
  "Women's Gym T-Shirts": "womens-gym-tshirts",
  Caps: "caps",
  Bottles: "bottles",
  Tumblers: "tumblers",
  Hoodies: "hoodies",
  Sweatshirts: "sweatshirts",
  Jackets: "jackets",
};

async function ensureCategory(qikinkCategoryName: string) {
  const slug = CATEGORY_SLUG_MAP[qikinkCategoryName] ?? slugify(qikinkCategoryName);
  return prisma.category.upsert({
    where: { slug },
    update: {},
    create: { name: qikinkCategoryName, slug },
  });
}

/** Upserts one Qikink product + its variants + images into our catalog. */
export async function upsertProductFromQikink(qp: QikinkProduct) {
  const category = await ensureCategory(qp.category);
  const slug = slugify(qp.name);
  const primaryStock = qp.variants.reduce((sum, v) => sum + v.quantity, 0);

  const product = await prisma.product.upsert({
    where: { qikinkProductId: qp.product_id },
    update: {
      title: qp.name,
      description: qp.description,
      fabricDetails: qp.fabric,
      washCare: qp.care_instructions,
      categoryId: category.id,
      basePrice: qp.base_price,
      compareAtPrice: qp.mrp,
      isActive: qp.status === "active" && primaryStock > 0,
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
    },
    create: {
      qikinkProductId: qp.product_id,
      title: qp.name,
      slug,
      description: qp.description,
      fabricDetails: qp.fabric,
      washCare: qp.care_instructions,
      categoryId: category.id,
      basePrice: qp.base_price,
      compareAtPrice: qp.mrp,
      isActive: qp.status === "active" && primaryStock > 0,
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
    },
  });

  await prisma.productImage.deleteMany({ where: { productId: product.id } });
  if (qp.images.length) {
    await prisma.productImage.createMany({
      data: qp.images.map((img, i) => ({
        productId: product.id,
        url: img.url,
        altText: img.alt_text ?? qp.name,
        sortOrder: img.is_primary ? 0 : i + 1,
        isLifestyle: !img.is_primary,
      })),
    });
  }

  for (const variant of qp.variants) {
    await prisma.productVariant.upsert({
      where: { qikinkVariantId: variant.variant_id },
      update: {
        size: variant.size,
        color: variant.color,
        sku: variant.sku,
        price: variant.price,
        compareAtPrice: variant.mrp,
        stock: variant.quantity,
        isOutOfStock: variant.quantity <= 0,
        weightGrams: variant.weight_grams,
      },
      create: {
        qikinkVariantId: variant.variant_id,
        productId: product.id,
        size: variant.size,
        color: variant.color,
        sku: variant.sku,
        price: variant.price,
        compareAtPrice: variant.mrp,
        stock: variant.quantity,
        isOutOfStock: variant.quantity <= 0,
        weightGrams: variant.weight_grams,
      },
    });
  }

  return product;
}

/** Full catalog sync — safe to run on a schedule (cron) or on demand from admin. */
export async function runFullProductSync() {
  const startedAt = new Date();
  let itemsSynced = 0;
  let itemsFailed = 0;
  let errorMessage: string | undefined;

  try {
    const products = await qikinkClient.listProducts();
    for (const qp of products) {
      try {
        await upsertProductFromQikink(qp);
        itemsSynced++;
      } catch (err) {
        itemsFailed++;
        errorMessage = err instanceof Error ? err.message : String(err);
      }
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  await prisma.syncLog.create({
    data: {
      jobType: "PRODUCT_SYNC",
      status: itemsFailed === 0 && !errorMessage ? "SUCCESS" : itemsSynced > 0 ? "PARTIAL" : "FAILED",
      itemsSynced,
      itemsFailed,
      errorMessage,
      startedAt,
      finishedAt: new Date(),
    },
  });

  return { itemsSynced, itemsFailed, errorMessage };
}

/** Applies a targeted inventory delta pushed via webhook (no full re-sync needed). */
export async function applyInventoryUpdate(updates: { sku: string; quantity: number }[]) {
  let itemsSynced = 0;
  let itemsFailed = 0;

  for (const update of updates) {
    try {
      await prisma.productVariant.update({
        where: { sku: update.sku },
        data: { stock: update.quantity, isOutOfStock: update.quantity <= 0 },
      });
      itemsSynced++;
    } catch {
      itemsFailed++;
    }
  }

  await prisma.syncLog.create({
    data: {
      jobType: "INVENTORY_SYNC",
      status: itemsFailed === 0 ? "SUCCESS" : itemsSynced > 0 ? "PARTIAL" : "FAILED",
      itemsSynced,
      itemsFailed,
      finishedAt: new Date(),
    },
  });

  return { itemsSynced, itemsFailed };
}

const STATUS_MAP: Record<QikinkFulfillmentUpdate["status"], string> = {
  in_production: "IN_PRODUCTION",
  printed: "PRINTED",
  shipped: "SHIPPED",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
  returned: "RETURNED",
  rto: "RTO",
};

/** Applies a fulfillment/tracking update pushed via webhook to the matching order. */
export async function applyFulfillmentUpdate(update: QikinkFulfillmentUpdate) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ qikinkOrderId: update.order_id }, { orderNumber: update.order_number }] },
  });
  if (!order) return null;

  return prisma.order.update({
    where: { id: order.id },
    data: {
      status: STATUS_MAP[update.status] as never,
      trackingNumber: update.tracking_number ?? order.trackingNumber,
      trackingUrl: update.tracking_url ?? order.trackingUrl,
      courierName: update.courier_name ?? order.courierName,
    },
  });
}

/** HMAC-SHA256 verification for inbound Qikink webhook payloads. */
export function verifyQikinkWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.QIKINK_WEBHOOK_SECRET;
  if (!secret) return process.env.QIKINK_USE_MOCK !== "false"; // allow through in mock/dev mode
  if (!signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
