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
