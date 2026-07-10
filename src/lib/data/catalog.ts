import "server-only";
import { prisma } from "@/lib/prisma";

const cardInclude = {
  images: { orderBy: { sortOrder: "asc" as const }, take: 2 },
  variants: { select: { stock: true } },
};

export async function getBestSellers(limit = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isBestSeller: true },
    include: cardInclude,
    take: limit,
    orderBy: { reviewCount: "desc" },
  });
}

export async function getNewArrivals(limit = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isNewArrival: true },
    include: cardInclude,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function getTrending(limit = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isTrending: true },
    include: cardInclude,
    take: limit,
    orderBy: { avgRating: "desc" },
  });
}

export async function getShopCategories() {
  return prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getFeaturedReviews(limit = 6) {
  return prisma.review.findMany({
    where: { rating: { gte: 4 } },
    include: { user: { select: { name: true } }, product: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug, isActive: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { size: "asc" } },
      category: true,
      reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
      crossSellTo: { include: { related: { include: cardInclude } } },
    },
  });
}

export async function getCategoryWithProducts(
  slug: string,
  opts: { sort?: "newest" | "price-asc" | "price-desc" | "rating"; page?: number; pageSize?: number } = {},
) {
  const { sort = "newest", page = 1, pageSize = 24 } = opts;

  const orderBy =
    sort === "price-asc"
      ? { basePrice: "asc" as const }
      : sort === "price-desc"
        ? { basePrice: "desc" as const }
        : sort === "rating"
          ? { avgRating: "desc" as const }
          : { createdAt: "desc" as const };

  const category = await prisma.category.findUnique({ where: { slug }, include: { children: true } });
  if (!category) return null;

  // Parent sections (Men / Women / Accessories) hold no products directly —
  // browsing one should show everything from its sub-categories.
  const categoryIds = category.children.length > 0 ? category.children.map((c) => c.id) : [category.id];
  const where = { isActive: true, categoryId: { in: categoryIds } };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: cardInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return { category, products, total, page, pageSize };
}

export async function getAllActiveProducts(opts: { page?: number; pageSize?: number } = {}) {
  const { page = 1, pageSize = 24 } = opts;
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: cardInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where: { isActive: true } }),
  ]);
  return { products, total, page, pageSize };
}
