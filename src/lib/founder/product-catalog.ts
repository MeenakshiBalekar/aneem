import "server-only";
import { prisma } from "@/lib/prisma";

export interface ProductCatalogFilters {
  search?: string;
  uncategorized?: boolean;
}

const PAGE_SIZE = 50;

/** Products for the Founder Portal's categorization workspace
 * (/founder/products) — every synced-but-uncategorized product lives here
 * until the founder assigns it a category, which is what actually makes it
 * live on the storefront (see upsertProductFromQikink). */
export async function getFilteredProducts(filters: ProductCatalogFilters, opts: { page?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);

  const where = {
    ...(filters.uncategorized ? { categoryId: null } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" as const } },
            { qikinkProductId: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [products, total, uncategorizedCount] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        category: { select: { id: true, name: true } },
        variants: { select: { stock: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.product.count({ where: { categoryId: null } }),
  ]);

  return { products, total, page, pageSize: PAGE_SIZE, uncategorizedCount };
}

export interface ImageAssignmentProduct {
  id: string;
  title: string;
  qikinkProductId: string;
  imageCount: number;
}

/** Lightweight full product list (no pagination) for the bulk image
 * uploader's search-and-assign picker — needs every product to search
 * against, not just one page of the categorizer table. */
export async function getProductsForImageAssignment(): Promise<ImageAssignmentProduct[]> {
  const products = await prisma.product.findMany({
    select: { id: true, title: true, qikinkProductId: true, _count: { select: { images: true } } },
    orderBy: { title: "asc" },
  });
  return products.map((p) => ({ id: p.id, title: p.title, qikinkProductId: p.qikinkProductId, imageCount: p._count.images }));
}

/** Existing colors/sizes across the catalog — suggestions for the "Add
 * Product" form's multi-select so a founder reuses "Navy Blue" instead of
 * accidentally creating a near-duplicate "navy blue" / "NavyBlue". Founders
 * can still type a new one that isn't in either list. */
export async function getDistinctColorsAndSizes(): Promise<{ colors: string[]; sizes: string[] }> {
  const [colorRows, sizeRows] = await Promise.all([
    prisma.productVariant.findMany({ where: { color: { not: null } }, distinct: ["color"], select: { color: true } }),
    prisma.productVariant.findMany({ distinct: ["size"], select: { size: true } }),
  ]);
  return {
    colors: colorRows.map((r) => r.color).filter((c): c is string => !!c).sort(),
    sizes: sizeRows.map((r) => r.size).sort(),
  };
}

export interface CategoryTreeOption {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

/** Category tree for the assignment dropdown — top-level sections with
 * their sub-categories nested, matching the Men/Women/Accessories shape
 * the storefront nav uses. */
export async function getCategoryTree(): Promise<CategoryTreeOption[]> {
  const parents = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      children: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
    },
  });
  return parents;
}
