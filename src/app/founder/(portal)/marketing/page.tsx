import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";
import { StatCard } from "@/components/founder/stat-card";
import { getMostEngagedProducts, getTopPages, getTrafficOverview, getTrafficSources } from "@/lib/integrations/marketing";

export const metadata = { title: "Marketing" };
export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const [traffic, sources, pages, engaged, adSpend] = await Promise.all([
    getTrafficOverview(30),
    getTrafficSources(),
    getTopPages(),
    getMostEngagedProducts(),
    prisma.adSpend.groupBy({ by: ["platform"], _sum: { spend: true, conversions: true } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black">Marketing</h1>
        {traffic.isMock && (
          <p className="mt-1 text-xs text-orange-400">
            Showing demo traffic data — connect GA4, Meta Pixel, Search Console, and Clarity to see live numbers
            (see .env: GA4_PROPERTY_ID, META_ADS_ACCESS_TOKEN, SEARCH_CONSOLE_SITE_URL, CLARITY_PROJECT_ID).
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Visitors (30d)" value={traffic.visitors.toLocaleString("en-IN")} />
        <StatCard label="Sessions (30d)" value={traffic.sessions.toLocaleString("en-IN")} />
        <StatCard label="Conversion Rate" value={`${traffic.conversionRate.toFixed(2)}%`} />
        <StatCard
          label="Total Ad Spend"
          value={formatINR(adSpend.reduce((s, a) => s + Number(a._sum.spend ?? 0), 0))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Traffic Sources</h2>
          <div className="space-y-2">
            {sources.sources.map((s) => (
              <div key={s.source}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{s.source}</span>
                  <span className="text-white/40">{s.sessions.toLocaleString("en-IN")} · {s.percent.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10">
                  <div className="bg-accent h-full" style={{ width: `${s.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Ad Spend by Platform</h2>
          {adSpend.length === 0 ? (
            <p className="text-xs text-white/40">
              No ad spend logged yet. Add entries from{" "}
              <a href="/founder/profit/cost-settings" className="underline">Cost Settings</a>.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wide text-white/30">
                <tr><th className="pb-2">Platform</th><th className="pb-2">Spend</th><th className="pb-2">Conversions</th></tr>
              </thead>
              <tbody>
                {adSpend.map((a) => (
                  <tr key={a.platform} className="border-t border-white/5">
                    <td className="py-2">{a.platform}</td>
                    <td className="py-2">{formatINR(Number(a._sum.spend ?? 0))}</td>
                    <td className="py-2">{a._sum.conversions ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Top Landing Pages</h2>
          <ul className="space-y-1.5 text-xs text-white/60">
            {pages.landing.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>

        <div className="border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Top Exit Pages</h2>
          <ul className="space-y-1.5 text-xs text-white/60">
            {pages.exit.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold">Most Engaged Products</h2>
        <p className="mb-3 text-xs text-white/40">Derived from real order and wishlist activity — not a demo number.</p>
        <div className="overflow-x-auto border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-white/40">
              <tr><th className="p-3">Product</th><th className="p-3">Units Ordered</th><th className="p-3">Wishlisted</th></tr>
            </thead>
            <tbody>
              {engaged.map((p) => (
                <tr key={p.title} className="border-b border-white/5">
                  <td className="p-3">{p.title}</td>
                  <td className="p-3">{p.unitsOrdered}</td>
                  <td className="p-3">{p.wishlisted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
