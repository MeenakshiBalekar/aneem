import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";
import { SortSelect } from "@/components/collection/sort-select";
import { getAllActiveProducts, getCategoryWithProducts, getShopCategories } from "@/lib/data/catalog";

export const revalidate = 120;

type SortKey = "newest" | "price-asc" | "price-desc" | "rating";

function toCardData<T extends { basePrice: unknown; compareAtPrice: unknown }>(products: T[]) {
  return products.map((p) => ({
    ...p,
    basePrice: Number(p.basePrice),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
  })) as never[];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "all") return { title: "Shop All", alternates: { canonical: "/collections/all" } };

  const data = await getCategoryWithProducts(slug);
  if (!data) return { title: "Collection Not Found" };

  return {
    title: data.category.name,
    description: data.category.description ?? `Shop ${data.category.name} at Aneem.`,
    alternates: { canonical: `/collections/${slug}` },
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: SortKey; page?: string }>;
}) {
  const { slug } = await params;
  const { sort = "newest", page = "1" } = await searchParams;
  const pageNum = Number(page) || 1;

  const [allCategories, data] =
    slug === "all"
      ? [await getShopCategories(), { category: null, ...(await getAllActiveProducts({ page: pageNum })) }]
      : [await getShopCategories(), await getCategoryWithProducts(slug, { sort, page: pageNum })];

  if (!data) notFound();

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="container-aneem py-10">
      <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-ink-100 pb-6">
        <a
          href="/collections/all"
          className={`px-3 py-1.5 text-xs font-bold uppercase ${slug === "all" ? "bg-ink text-white" : "border border-ink-200"}`}
        >
          All
        </a>
        {allCategories.map((c) => (
          <a
            key={c.slug}
            href={`/collections/${c.slug}`}
            className={`px-3 py-1.5 text-xs font-bold uppercase ${slug === c.slug ? "bg-ink text-white" : "border border-ink-200"}`}
          >
            {c.name}
          </a>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase sm:text-3xl">
            {data.category?.name ?? "Shop All"}
          </h1>
          <p className="text-ink-400 text-sm">{data.total} products</p>
        </div>
        <SortSelect currentSort={sort} />
      </div>

      {data.products.length === 0 ? (
        <p className="text-ink-400 py-20 text-center">No products in this collection yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {toCardData(data.products).map((p: never) => (
            <ProductCard key={(p as { id: string }).id} product={p as never} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-12 flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <a
              key={i}
              href={`?sort=${sort}&page=${i + 1}`}
              className={`h-9 w-9 flex items-center justify-center border text-sm ${pageNum === i + 1 ? "bg-ink text-white" : "border-ink-200"}`}
            >
              {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
