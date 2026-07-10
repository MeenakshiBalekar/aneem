import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { qikinkClient } from "./client";
import type { QikinkFulfillmentUpdate, QikinkProduct } from "./types";

/** Upserts one Qikink product + its variants + images into our catalog.
 *
 * Category and tags are founder-owned, not sync-owned: Qikink's own category
 * field doesn't reliably map to our Men/Women/Accessories sections (real
 * product names/categories from Qikink don't carry gender info), so the
 * sync never sets categoryId. A brand-new product is created uncategorized
 * and inactive ("hidden until tagged") — the founder assigns a category
 * from /founder/products, which is what actually makes it visible. Re-syncs
 * only ever touch catalog/pricing/stock fields, never category or tags, so
 * a founder's categorization work is never wiped out by the next sync. */
export async function upsertProductFromQikink(qp: QikinkProduct) {
  const slug = slugify(qp.name);
  const primaryStock = qp.variants.reduce((sum, v) => sum + v.quantity, 0);
  const inStockAndListed = qp.status === "active" && primaryStock > 0;

  const existing = await prisma.product.findUnique({
    where: { qikinkProductId: qp.product_id },
    select: { categoryId: true },
  });
  const isActive = inStockAndListed && existing?.categoryId != null;

  const product = await prisma.product.upsert({
    where: { qikinkProductId: qp.product_id },
    update: {
      title: qp.name,
      description: qp.description,
      fabricDetails: qp.fabric,
      washCare: qp.care_instructions,
      basePrice: qp.base_price,
      compareAtPrice: qp.mrp,
      isActive,
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
      basePrice: qp.base_price,
      compareAtPrice: qp.mrp,
      isActive: false, // hidden until the founder assigns a category
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
