import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";
import { StatCard } from "@/components/founder/stat-card";
import { FounderSyncButton } from "@/components/founder/founder-sync-button";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: "text-emerald-400",
  PARTIAL: "text-orange-400",
  FAILED: "text-red-400",
};

export default async function InventoryPage() {
  const [totalVariants, outOfStock, lowStock, syncErrors, recentSyncs, fulfillmentCounts, lowStockList] = await Promise.all([
    prisma.productVariant.count(),
    prisma.productVariant.count({ where: { isOutOfStock: true } }),
    prisma.productVariant.count({ where: { stock: { gt: 0, lte: 8 } } }),
    prisma.product.count({ where: { syncStatus: "ERROR" } }),
    prisma.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.productVariant.findMany({
      where: { stock: { gt: 0, lte: 8 } },
      include: { product: { select: { title: true } } },
      orderBy: { stock: "asc" },
      take: 15,
    }),
  ]);

  const fulfillmentMap = new Map(fulfillmentCounts.map((f) => [f.status, f._count]));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Inventory</h1>
        <FounderSyncButton />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Variants" value={String(totalVariants)} />
        <StatCard label="Out of Stock" value={String(outOfStock)} />
        <StatCard label="Low Stock (≤8)" value={String(lowStock)} />
        <StatCard label="Sync Errors" value={String(syncErrors)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Low Stock — Restock Soon</h2>
          {lowStockList.length === 0 ? (
            <p className="text-xs text-white/40">Nothing running low.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {lowStockList.map((v) => (
                <li key={v.id} className="flex justify-between border-b border-white/5 py-1.5">
                  <span>{v.product.title} — {v.size}{v.color ? ` / ${v.color}` : ""}</span>
                  <span className="font-semibold text-orange-400">{v.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Recent Qikink Syncs</h2>
          <ul className="space-y-1.5 text-xs">
            {recentSyncs.map((s) => (
              <li key={s.id} className="flex justify-between border-b border-white/5 py-1.5">
                <span className="text-white/50">{s.jobType.replace(/_/g, " ")} — {new Date(s.startedAt).toLocaleString("en-IN")}</span>
                <span className={STATUS_COLOR[s.status]}>{s.status} ({s.itemsSynced}/{s.itemsSynced + s.itemsFailed})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold">Print / Shipping / Tracking Status</h2>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {(["SENT_TO_QIKINK", "IN_PRODUCTION", "PRINTED", "SHIPPED", "DELIVERED", "RTO"] as OrderStatus[]).map((status) => (
            <div key={status} className="border border-white/10 bg-white/[0.03] p-3 text-center">
              <p className="text-xl font-black">{fulfillmentMap.get(status) ?? 0}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-white/40">{status.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
