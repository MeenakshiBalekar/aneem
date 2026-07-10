import Link from "next/link";
import { formatINR } from "@/lib/utils";
import {
  getMonthlyProfitStatement,
  getProductProfitBreakdown,
  getBundleProfitBreakdown,
  getTopCustomersByProfit,
} from "@/lib/founder/profit-engine";

export const metadata = { title: "Profit" };
export const dynamic = "force-dynamic";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function ProfitPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: monthParam } = await searchParams;
  const now = new Date();
  const [year, month] = monthParam ? monthParam.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const [statement, productProfit, bundleProfit, topCustomers] = await Promise.all([
    getMonthlyProfitStatement(year, month),
    getProductProfitBreakdown(start, end),
    getBundleProfitBreakdown(start, end),
    getTopCustomersByProfit(20),
  ]);

  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${month - 1}`;
  const nextMonth = month === 12 ? `${year + 1}-1` : `${year}-${month + 1}`;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Profit</h1>
          <p className="text-sm text-white/50">
            {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`?month=${prevMonth}`} className="border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5">← Prev</Link>
          <Link href={`?month=${nextMonth}`} className="border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5">Next →</Link>
          <Link href="/founder/profit/cost-settings" className="bg-accent text-ink px-3 py-1.5 text-xs font-bold uppercase">Cost Settings</Link>
        </div>
      </div>

      {!statement.hasCostData && (
        <p className="border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-300">
          Product/printing costs aren&apos;t configured — figures below undercount true costs. <Link href="/founder/profit/cost-settings" className="underline">Set them up →</Link>
        </p>
      )}

      {/* Monthly Profit Statement — mirrors the requested format exactly */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/60">Revenue</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-white/50">Revenue</dt><dd className="font-semibold">{formatINR(statement.revenue)}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Orders</dt><dd>{statement.orders}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Delivered Orders</dt><dd>{statement.deliveredOrders}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Cancelled</dt><dd>{statement.cancelledOrders}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Returned / RTO</dt><dd>{statement.returnedOrders}</dd></div>
          </dl>
        </div>

        <div className="border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/60">Expenses</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-white/50">Qikink Printing & Product</dt><dd>{formatINR(statement.expenses.qikinkPrinting)}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Shipping</dt><dd>{formatINR(statement.expenses.shipping)}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Packaging</dt><dd>{formatINR(statement.expenses.packaging)}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Gateway Charges</dt><dd>{formatINR(statement.expenses.gateway)}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Advertising</dt><dd>{formatINR(statement.expenses.advertising)}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Refunds</dt><dd>{formatINR(statement.expenses.refunds)}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Returns & RTO</dt><dd>{formatINR(statement.expenses.returnsRto)}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Miscellaneous</dt><dd>{formatINR(statement.expenses.misc)}</dd></div>
          </dl>
        </div>
      </div>

      <div className="border-accent/30 border bg-white/[0.03] p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/60">Final Summary</h2>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div><dt className="text-xs text-white/40">Gross Revenue</dt><dd className="text-xl font-black">{formatINR(statement.revenue)}</dd></div>
          <div><dt className="text-xs text-white/40">Total Expenses</dt><dd className="text-xl font-black">{formatINR(statement.totalExpenses)}</dd></div>
          <div><dt className="text-xs text-white/40">Net Profit</dt><dd className="text-accent text-xl font-black">{formatINR(statement.netProfit)}</dd></div>
          <div><dt className="text-xs text-white/40">Net Profit Margin</dt><dd className="text-xl font-black">{statement.netProfitMargin.toFixed(1)}%</dd></div>
          <div><dt className="text-xs text-white/40">Profit Per Order</dt><dd className="text-xl font-black">{formatINR(statement.profitPerOrder)}</dd></div>
          <div><dt className="text-xs text-white/40">Cash Collected</dt><dd className="text-xl font-black">{formatINR(statement.cashCollected)}</dd></div>
          <div><dt className="text-xs text-white/40">Outstanding Payments</dt><dd className="text-xl font-black">{formatINR(statement.outstandingPayments)}</dd></div>
        </dl>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold">Product-wise Profit</h2>
        <div className="overflow-x-auto border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-white/40">
              <tr><th className="p-3">Product</th><th className="p-3">Revenue</th><th className="p-3">Profit</th><th className="p-3">Margin</th></tr>
            </thead>
            <tbody>
              {productProfit.map((p) => (
                <tr key={p.productId} className="border-b border-white/5">
                  <td className="p-3">{p.title}</td>
                  <td className="p-3">{formatINR(p.revenue)}</td>
                  <td className={p.profit >= 0 ? "p-3 text-emerald-400" : "p-3 text-red-400"}>{formatINR(p.profit)}</td>
                  <td className="p-3">{p.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {bundleProfit.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold">Bundle Profit</h2>
          <div className="overflow-x-auto border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-white/40">
                <tr><th className="p-3">Bundle</th><th className="p-3">Orders</th><th className="p-3">Revenue</th><th className="p-3">Profit</th><th className="p-3">Margin</th><th className="p-3">Return Rate</th></tr>
              </thead>
              <tbody>
                {bundleProfit.map((b) => (
                  <tr key={b.bundleId} className="border-b border-white/5">
                    <td className="p-3">{b.name}</td>
                    <td className="p-3">{b.orders}</td>
                    <td className="p-3">{formatINR(b.revenue)}</td>
                    <td className={b.profit >= 0 ? "p-3 text-emerald-400" : "p-3 text-red-400"}>{formatINR(b.profit)}</td>
                    <td className="p-3">{b.margin.toFixed(1)}%</td>
                    <td className="p-3">{b.returnRate.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-bold">Top 20 Customers by Profit</h2>
        <div className="overflow-x-auto border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-white/40">
              <tr><th className="p-3">Customer</th><th className="p-3">Orders</th><th className="p-3">Revenue</th><th className="p-3">Profit</th></tr>
            </thead>
            <tbody>
              {topCustomers.map((c) => (
                <tr key={c.userId} className="border-b border-white/5">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{c.orders}</td>
                  <td className="p-3">{formatINR(c.revenue)}</td>
                  <td className="p-3 text-emerald-400">{formatINR(c.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
