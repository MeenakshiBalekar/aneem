import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  getFilteredProducts,
  getCategoryTree,
  getProductsForImageAssignment,
  type ProductStatusFilter,
  type ProductSortKey,
} from "@/lib/founder/product-catalog";
import { ProductFilterBar } from "@/components/founder/product-filter-bar";
import { ProductListTable } from "@/components/founder/product-list-table";
import { FounderSyncButton } from "@/components/founder/founder-sync-button";
import { CatalogImportDialog } from "@/components/founder/catalog-import-dialog";
import { UndoCsvImportButton } from "@/components/founder/undo-csv-import-button";
import { BulkImageUploadDialog } from "@/components/founder/bulk-image-upload-dialog";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

const STATUS_TABS: { key: ProductStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
];

export default async function FounderProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const status = (["all", "active", "draft"].includes(sp.status ?? "") ? sp.status : "all") as ProductStatusFilter;
  const sort = sp.sort as ProductSortKey | undefined;
  const filters = { search: sp.search || undefined, uncategorized: sp.uncategorized === "1", status };

  const [{ products, total, pageSize, uncategorizedCount, statusCounts }, categoryTree, imageAssignmentProducts] =
    await Promise.all([getFilteredProducts(filters, { page, sort }), getCategoryTree(), getProductsForImageAssignment()]);
  const totalPages = Math.ceil(total / pageSize);

  function tabHref(key: ProductStatusFilter) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page" && k !== "status") params.set(k, v);
    if (key !== "all") params.set("status", key);
    const qs = params.toString();
    return `/founder/products${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Products ({total})</h1>
          <p className="mt-1 text-sm text-white/50">
            Draft products are hidden from the storefront. Assign a category to make a synced product eligible to go
            live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/founder/products/new"
            className="bg-accent text-ink flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase hover:bg-white/90"
          >
            <Plus size={14} /> Add Product
          </Link>
          <CatalogImportDialog />
          <BulkImageUploadDialog products={imageAssignmentProducts} />
          <FounderSyncButton />
          <UndoCsvImportButton />
        </div>
      </div>

      <div className="mb-3 flex gap-1 border-b border-white/10">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tabHref(tab.key)}
            className={`border-b-2 px-4 py-2 text-xs font-bold uppercase ${
              status === tab.key ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {tab.label} ({statusCounts[tab.key]})
          </Link>
        ))}
      </div>

      <Suspense fallback={null}>
        <ProductFilterBar uncategorizedCount={uncategorizedCount} />
      </Suspense>

      <Suspense fallback={null}>
        <ProductListTable
          categoryTree={categoryTree}
          products={products.map((p) => ({
            id: p.id,
            title: p.title,
            qikinkProductId: p.qikinkProductId,
            category: p.category,
            isActive: p.isActive,
            basePrice: Number(p.basePrice),
            updatedAt: p.updatedAt.toISOString(),
            images: p.images.map((i) => ({ url: i.url })),
            variants: p.variants.map((v) => ({ stock: v.stock })),
          }))}
        />
      </Suspense>

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
