import { prisma } from "@/lib/prisma";
import { generateDailyCeoReport } from "@/lib/founder/copilot";
import { getProductHealthScores } from "@/lib/founder/ai-context";
import { CopilotChat } from "@/components/founder/copilot-chat";
import { MarketingContentGenerator } from "@/components/founder/marketing-content-generator";

export const metadata = { title: "AI Copilot" };
export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  const [report, healthScores, products] = await Promise.all([
    generateDailyCeoReport(),
    getProductHealthScores(),
    prisma.product.findMany({ where: { isActive: true }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black">AI Copilot</h1>
        <p className="mt-1 text-sm text-white/50">Your daily briefing, a chat over your own data, and content generation.</p>
      </div>

      <div className="border-accent/30 border bg-white/[0.03] p-5">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/50">Daily CEO Report</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{report}</p>
      </div>

      <CopilotChat />

      <div>
        <h2 className="mb-3 text-lg font-bold">Product Health Scores</h2>
        <p className="mb-3 text-xs text-white/40">Score = sales volume + rating − return-rate penalty. Every input is visible below.</p>
        <div className="overflow-x-auto border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-white/40">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Units Sold (30d)</th>
                <th className="p-3">Revenue</th>
                <th className="p-3">Rating</th>
                <th className="p-3">Return Rate</th>
                <th className="p-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {healthScores.slice(0, 10).map((p) => (
                <tr key={p.title} className="border-b border-white/5">
                  <td className="p-3">{p.title}</td>
                  <td className="p-3">{p.units}</td>
                  <td className="p-3">₹{p.revenue.toFixed(0)}</td>
                  <td className="p-3">{p.rating.toFixed(1)}★ ({p.reviewCount})</td>
                  <td className={p.returnRate > 15 ? "p-3 text-red-400" : "p-3 text-white/60"}>{p.returnRate.toFixed(0)}%</td>
                  <td className="p-3 font-bold">{p.score.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <MarketingContentGenerator products={products} />
    </div>
  );
}
