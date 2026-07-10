import "server-only";
import { prisma } from "@/lib/prisma";
import { getBusinessSummary, getEcommerceKpis, getOrderHealthCounts } from "@/lib/founder/dashboard-analytics";
import { getDailyActionItems } from "@/lib/founder/action-center";
import { getBestSellingProducts, getTopCategories, getSalesByState } from "@/lib/data/admin-analytics";
import { getProfitForRange } from "@/lib/founder/profit-engine";

/**
 * Single function that assembles "everything worth knowing about the
 * business right now" into a compact text block — used as the system
 * context for both the AI Copilot chat and the Daily CEO Report, so the
 * two features never disagree with each other about the underlying numbers.
 */
export async function buildBusinessSnapshot(): Promise<string> {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  const [summary, kpis, orderHealth, actionItems, bestSellers, categories, states, yesterdayProfit] =
    await Promise.all([
      getBusinessSummary(),
      getEcommerceKpis(),
      getOrderHealthCounts(),
      getDailyActionItems(),
      getBestSellingProducts(5),
      getTopCategories(5),
      getSalesByState(5),
      getProfitForRange(yesterday, today),
    ]);

  const lines = [
    `Today's revenue: ₹${summary.revenue.today} (yesterday: ₹${summary.revenue.yesterday})`,
    `This month's revenue: ₹${summary.revenue.month} (last month: ₹${summary.revenue.lastMonth})`,
    `Today's profit: ₹${summary.profit.today.toFixed(0)}, this month's profit: ₹${summary.profit.month.toFixed(0)}, margin ${summary.profit.netMargin.toFixed(1)}%`,
    `Yesterday's profit: ₹${yesterdayProfit.profit.toFixed(0)} from ${yesterdayProfit.orderCount} orders`,
    `Orders — today: ${summary.orders.today}, this week: ${summary.orders.week}, this month: ${summary.orders.month}`,
    `Average Order Value: ₹${kpis.aov.toFixed(0)}, Repeat Customer %: ${kpis.repeatCustomerPercent.toFixed(1)}%, ROAS: ${kpis.roas.toFixed(2)}x, CAC: ₹${kpis.cac.toFixed(0)}`,
    `Cash available: ₹${summary.cashAvailable.toFixed(0)}, Pending COD payments: ₹${summary.pendingPayments.toFixed(0)}, Refunds: ₹${summary.refundAmount.toFixed(0)}`,
    `Order health: ${orderHealth.map((h) => `${h.label}=${h.count}`).join(", ")}`,
    `Best sellers: ${bestSellers.map((b) => `${b.product?.title} (${b.unitsSold} units, ₹${b.revenue.toFixed(0)} revenue)`).join("; ")}`,
    `Top categories by revenue: ${categories.map((c) => `${c.name} (₹${c.revenue.toFixed(0)})`).join("; ")}`,
    `Top states by revenue: ${states.map((s) => `${s.state} (₹${s.revenue.toFixed(0)})`).join("; ")}`,
    `Today's priorities: ${actionItems.map((a) => a.text).join("; ") || "none flagged"}`,
  ];

  return lines.join("\n");
}

export async function getProductHealthScores() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [items, reviews] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: start } } },
      include: { product: true, order: { select: { status: true } } },
    }),
    prisma.product.findMany({ select: { id: true, title: true, avgRating: true, reviewCount: true } }),
  ]);

  const byProduct = new Map<
    string,
    { title: string; units: number; revenue: number; returns: number; rating: number; reviewCount: number }
  >();

  const reviewMap = new Map(reviews.map((r) => [r.id, r]));

  for (const item of items) {
    const entry = byProduct.get(item.productId) ?? {
      title: item.product.title,
      units: 0,
      revenue: 0,
      returns: 0,
      rating: reviewMap.get(item.productId)?.avgRating ?? item.product.avgRating,
      reviewCount: reviewMap.get(item.productId)?.reviewCount ?? item.product.reviewCount,
    };
    entry.units += item.quantity;
    entry.revenue += Number(item.totalPrice);
    if (["RETURNED", "RTO", "REFUNDED"].includes(item.order.status)) entry.returns += item.quantity;
    byProduct.set(item.productId, entry);
  }

  return Array.from(byProduct.values())
    .map((p) => {
      const returnRate = p.units > 0 ? (p.returns / p.units) * 100 : 0;
      // Simple weighted score: sales volume + rating - return rate penalty.
      // Not a black box — every input is visible in the returned object.
      const score = p.units * 2 + p.rating * 10 - returnRate * 1.5;
      return { ...p, returnRate, score };
    })
    .sort((a, b) => b.score - a.score);
}
