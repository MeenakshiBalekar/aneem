import { StatCard } from "@/components/founder/stat-card";
import { formatINR } from "@/lib/utils";
import { getBusinessSummary, getEcommerceKpis, getOrderHealthCounts, getCheckoutCompletionRate } from "@/lib/founder/dashboard-analytics";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

const HEALTH_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "text-white/60",
  COD_CONFIRMED: "text-blue-400",
  PRINTED: "text-purple-400",
  SHIPPED: "text-cyan-400",
  DELIVERED: "text-emerald-400",
  CANCELLED: "text-white/40",
  RETURNED: "text-orange-400",
  RTO: "text-red-400",
  REFUNDED: "text-red-300",
};

export default async function FounderDashboardPage() {
  const [summary, kpis, orderHealth, checkoutCompletion] = await Promise.all([
    getBusinessSummary(),
    getEcommerceKpis(),
    getOrderHealthCounts(),
    getCheckoutCompletionRate(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-black">Business Summary</h1>
        {!summary.profit.hasCostData && (
          <p className="mt-1 text-xs text-orange-400">
            Product/printing costs aren&apos;t set yet — profit figures only reflect shipping, packaging, gateway,
            and GST.{" "}
            <a href="/founder/profit/cost-settings" className="underline">
              Set up cost data →
            </a>
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Revenue Today" value={formatINR(summary.revenue.today)} trend={{ value: pctChange(summary.revenue.today, summary.revenue.yesterday), label: "vs yesterday" }} />
          <StatCard label="Revenue Yesterday" value={formatINR(summary.revenue.yesterday)} />
          <StatCard label="Revenue This Week" value={formatINR(summary.revenue.week)} />
          <StatCard label="Revenue This Month" value={formatINR(summary.revenue.month)} trend={{ value: pctChange(summary.revenue.month, summary.revenue.lastMonth), label: "vs last month" }} />
          <StatCard label="Revenue Last Month" value={formatINR(summary.revenue.lastMonth)} />
          <StatCard label="Total Revenue" value={formatINR(summary.revenue.total)} />
          <StatCard label="Orders Today" value={String(summary.orders.today)} />
          <StatCard label="Orders This Week" value={String(summary.orders.week)} />
          <StatCard label="Orders This Month" value={String(summary.orders.month)} />
          <StatCard label="Profit Today" value={formatINR(summary.profit.today)} className="border-accent/30" />
          <StatCard label="Profit This Month" value={formatINR(summary.profit.month)} className="border-accent/30" />
          <StatCard label="Net Profit Margin" value={`${summary.profit.netMargin.toFixed(1)}%`} className="border-accent/30" />
          <StatCard label="Cash Available" value={formatINR(summary.cashAvailable)} />
          <StatCard label="Pending Payments (COD)" value={formatINR(summary.pendingPayments)} />
          <StatCard label="Refund Amount" value={formatINR(summary.refundAmount)} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold">Ecommerce KPIs</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Average Order Value" value={formatINR(kpis.aov)} />
          <StatCard label="ROAS" value={kpis.roas > 0 ? `${kpis.roas.toFixed(2)}x` : "—"} hint={kpis.roas === 0 ? "No ad spend logged" : undefined} />
          <StatCard label="CAC" value={kpis.cac > 0 ? formatINR(kpis.cac) : "—"} />
          <StatCard label="Customer LTV" value={formatINR(kpis.ltv)} />
          <StatCard label="Repeat Customer %" value={`${kpis.repeatCustomerPercent.toFixed(1)}%`} />
          <StatCard label="Returning Customer Revenue" value={formatINR(kpis.returningCustomerRevenue)} />
          <StatCard label="New Customers (Month)" value={String(kpis.newCustomers)} />
          <StatCard label="Checkout Completion Rate" value={`${checkoutCompletion.toFixed(0)}%`} />
          <StatCard label="Cart Abandonment Rate" value={`${kpis.cartAbandonmentRate.toFixed(0)}%`} hint="Approximate — full session tracking needs GA4" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold">Order Health</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-9">
          {orderHealth.map((h) => (
            <a
              key={h.status}
              href={`/founder/orders?status=${h.status}`}
              className="border border-white/10 bg-white/[0.03] p-3 text-center transition-colors hover:border-white/20"
            >
              <p className={`text-xl font-black ${HEALTH_COLOR[h.status] ?? "text-white"}`}>{h.count}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-white/40">{h.label}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
