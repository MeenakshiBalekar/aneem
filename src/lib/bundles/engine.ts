import "server-only";
import { prisma } from "@/lib/prisma";

/** Active bundles for homepage / PDP "bundle suggestions" surfaces. */
export async function getActiveBundles() {
  return prisma.bundle.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        include: {
          product: {
            include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: true },
          },
        },
      },
    },
  });
}

export function computeBundlePrice(items: { price: number; quantity: number }[], discountPercent: number) {
  const fullPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const bundlePrice = Math.round(fullPrice * (1 - discountPercent / 100));
  return { fullPrice, bundlePrice, youSave: fullPrice - bundlePrice };
}

/** Bundles that include a given product — surfaced on its PDP as "complete the look". */
export async function getBundlesContainingProduct(productId: string) {
  return prisma.bundle.findMany({
    where: { isActive: true, items: { some: { productId } } },
    include: {
      items: { include: { product: { include: { images: { take: 1 }, variants: true } } } },
    },
  });
}
