import { Suspense } from "react";
import { getFilteredProducts, getCategoryTree } from "@/lib/founder/product-catalog";
import { ProductFilterBar } from "@/components/founder/product-filter-bar";
import { ProductCategorizerTable } from "@/components/founder/product-categorizer-table";
import { FounderSyncButton } from "@/components/founder/founder-sync-button";
import { CatalogImportDialog } from "@/components/founder/catalog-import-dialog";
import { UndoCsvImportButton } from "@/components/founder/undo-csv-import-button";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

export default async function FounderProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const filters = { search: sp.search || undefined, uncategorized: sp.uncategorized === "1" };

  const [{ products, total, pageSize, uncategorizedCount }, categoryTree] = await Promise.all([
    getFilteredProducts(filters, { page }),
    getCategoryTree(),
  ]);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Products ({total})</h1>
          <p className="mt-1 text-sm text-white/50">
            Assign a category to make a synced product live on the storefront. New Qikink syncs never overwrite this.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CatalogImportDialog />
          <FounderSyncButton />
          <UndoCsvImportButton />
        </div>
      </div>

      <Suspense fallback={null}>
        <ProductFilterBar uncategorizedCount={uncategorizedCount} />
      </Suspense>

      <ProductCategorizerTable products={products} categoryTree={categoryTree} />

      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <a
              key={i}
              href={`?${new URLSearchParams({ ...sp, page: String(i + 1) } as Record<string, string>).toString()}`}
              className="flex h-8 w-8 items-center justify-center border border-white/15 text-xs hover:bg-white/5"
            >
              {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
