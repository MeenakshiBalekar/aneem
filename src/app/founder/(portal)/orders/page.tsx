import { Suspense } from "react";
import { getFilteredOrders, getFilterOptions, type OrderFilters } from "@/lib/founder/orders-management";
import { OrderFilterBar } from "@/components/founder/order-filter-bar";
import { OrdersTable } from "@/components/founder/orders-table";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function FounderOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters: OrderFilters = {
    dateRange: (sp.dateRange as OrderFilters["dateRange"]) || undefined,
    from: sp.from,
    to: sp.to,
    status: (sp.status as OrderFilters["status"]) || undefined,
    paymentMethod: (sp.paymentMethod as OrderFilters["paymentMethod"]) || undefined,
    state: sp.state || undefined,
    city: sp.city || undefined,
    product: sp.product || undefined,
    size: sp.size || undefined,
    search: sp.search || undefined,
  };
  const page = Number(sp.page) || 1;

  const [{ orders, total, pageSize }, filterOptions] = await Promise.all([
    getFilteredOrders(filters, { page }),
    getFilterOptions(),
  ]);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-black">Orders ({total})</h1>
      <Suspense fallback={null}>
        <OrderFilterBar states={filterOptions.states} cities={filterOptions.cities} />
      </Suspense>
      <OrdersTable orders={orders} />
      {totalPages > 1 && (
        <div className="mt-4 flex gap-2">
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
