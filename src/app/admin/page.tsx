import { StatTile } from "@/components/admin/stat-tile";
import { BarList } from "@/components/admin/bar-list";
import { SyncNowButton } from "@/components/admin/sync-now-button";
import { formatINR } from "@/lib/utils";
import {
  getBestSellingProducts,
  getInventoryOverview,
  getRevenueOverview,
  getSalesByState,
  getSalesBySize,
  getTopCategories,
  getTopCustomers,
} from "@/lib/data/admin-analytics";

export const metadata = { title: "Admin Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [revenue, bestSellers, categories, states, sizes, customers, inventory] = await Promise.all([
    getRevenueOverview(30),
    getBestSellingProducts(),
    getTopCategories(),
    getSalesByState(),
    getSalesBySize(),
    getTopCustomers(),
    getInventoryOverview(),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase">Dashboard</h1>
          <p className="text-ink-400 text-sm">Last 30 days</p>
        </div>
        <SyncNowButton />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Revenue" value={formatINR(revenue.revenue)} />
        <StatTile label="Orders" value={String(revenue.orderCount)} />
        <StatTile label="Average Order Value" value={formatINR(revenue.aov)} />
        <StatTile label="Checkout Completion" value={`${revenue.completionRate.toFixed(0)}%`} hint="Paid / all order attempts" />
        <StatTile label="Return Rate" value={`${revenue.returnRate.toFixed(1)}%`} />
        <StatTile label="Total Variants" value={String(inventory.totalVariants)} />
        <StatTile label="Out of Stock" value={String(inventory.outOfStock)} hint={`${inventory.lowStock} low stock`} />
        <StatTile label="Sync Errors" value={String(inventory.syncErrors)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList
          title="Best Sellers"
          items={bestSellers.map((b) => ({ label: b.product!.title, value: b.unitsSold }))}
          formatValue={(v) => `${v} sold`}
        />
        <BarList
          title="Top Categories"
          items={categories.map((c) => ({ label: c.name, value: c.revenue }))}
          formatValue={(v) => formatINR(v)}
        />
        <BarList
          title="Sales by State"
          items={states.map((s) => ({ label: s.state, value: s.revenue }))}
          formatValue={(v) => formatINR(v)}
        />
        <BarList
          title="Sales by Size"
          items={sizes.map((s) => ({ label: s.size, value: s.units }))}
          formatValue={(v) => `${v} units`}
        />
      </div>

      <div className="mt-4">
        <div className="border-ink-100 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold uppercase">Top Customers (Lifetime Value)</h3>
          {customers.length === 0 ? (
            <p className="text-ink-400 text-xs">No customer data yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-ink-400 text-xs uppercase">
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Orders</th>
                  <th className="pb-2">Lifetime Value</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.user?.id} className="border-ink-100 border-t">
                    <td className="py-2">{c.user?.name ?? c.user?.email}</td>
                    <td className="py-2">{c.orderCount}</td>
                    <td className="py-2 font-semibold">{formatINR(c.lifetimeValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
