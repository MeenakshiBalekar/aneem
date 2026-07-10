import "server-only";
import { prisma } from "@/lib/prisma";
import { getProfitForRange, REVENUE_STATUSES } from "@/lib/founder/profit-engine";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function revenueBetween(start: Date, end: Date) {
  const agg = await prisma.order.aggregate({
    where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: start, lt: end } },
    _sum: { total: true },
    _count: true,
  });
  return { revenue: Number(agg._sum.total ?? 0), orders: agg._count };
}

export async function getBusinessSummary() {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);
  const weekStart = addDays(today, -7);
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(addDays(monthStart, -1));

  const [
    revenueToday,
    revenueYesterday,
    revenueWeek,
    revenueMonth,
    revenueLastMonth,
    revenueTotal,
    profitToday,
    profitMonth,
    refunds,
    pendingCod,
  ] = await Promise.all([
    revenueBetween(today, tomorrow),
    revenueBetween(yesterday, today),
    revenueBetween(weekStart, tomorrow),
    revenueBetween(monthStart, tomorrow),
    revenueBetween(lastMonthStart, monthStart),
    revenueBetween(new Date(0), tomorrow),
    getProfitForRange(today, tomorrow),
    getProfitForRange(monthStart, tomorrow),
    prisma.order.aggregate({ where: { refundAmount: { gt: 0 } }, _sum: { refundAmount: true } }),
    prisma.order.aggregate({
      where: { paymentMethod: "COD", status: { in: ["COD_CONFIRMED", "SENT_TO_QIKINK", "IN_PRODUCTION", "PRINTED", "SHIPPED"] } },
      _sum: { total: true },
    }),
  ]);

  const cashAvailable = revenueTotal.revenue - Number(refunds._sum.refundAmount ?? 0) - Number(pendingCod._sum.total ?? 0);

  return {
    revenue: {
      today: revenueToday.revenue,
      yesterday: revenueYesterday.revenue,
      week: revenueWeek.revenue,
      month: revenueMonth.revenue,
      lastMonth: revenueLastMonth.revenue,
      total: revenueTotal.revenue,
    },
    orders: { today: revenueToday.orders, week: revenueWeek.orders, month: revenueMonth.orders },
    profit: {
      today: profitToday.profit,
      month: profitMonth.profit,
      netMargin: profitMonth.profitMargin,
      hasCostData: profitMonth.hasCostData,
    },
    cashAvailable,
    pendingPayments: Number(pendingCod._sum.total ?? 0),
    refundAmount: Number(refunds._sum.refundAmount ?? 0),
  };
}

export async function getEcommerceKpis() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const tomorrow = addDays(startOfDay(now), 1);

  const [ordersThisMonth, allCustomerOrderCounts, adSpendMonth, newCustomersMonth, cartsRecent, cartsConverted] =
    await Promise.all([
      prisma.order.findMany({
        where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: monthStart, lt: tomorrow } },
        select: { total: true, userId: true },
      }),
      prisma.order.groupBy({
        by: ["userId"],
        where: { status: { in: REVENUE_STATUSES } },
        _count: true,
        _sum: { total: true },
      }),
      prisma.adSpend.aggregate({ where: { date: { gte: monthStart, lt: tomorrow } }, _sum: { spend: true, conversions: true, newCustomers: true } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart, lt: tomorrow }, orders: { some: {} } } }),
      prisma.cart.count({ where: { items: { some: {} } }, }),
      prisma.order.count({ where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: monthStart, lt: tomorrow } } }),
    ]);

  const revenueThisMonth = ordersThisMonth.reduce((s, o) => s + Number(o.total), 0);
  const aov = ordersThisMonth.length > 0 ? revenueThisMonth / ordersThisMonth.length : 0;

  const repeatCustomers = allCustomerOrderCounts.filter((c) => c._count > 1);
  const repeatCustomerPercent =
    allCustomerOrderCounts.length > 0 ? (repeatCustomers.length / allCustomerOrderCounts.length) * 100 : 0;
  const returningCustomerRevenue = repeatCustomers.reduce((s, c) => s + Number(c._sum.total ?? 0), 0);

  const ltv =
    allCustomerOrderCounts.length > 0
      ? allCustomerOrderCounts.reduce((s, c) => s + Number(c._sum.total ?? 0), 0) / allCustomerOrderCounts.length
      : 0;

  const adSpend = Number(adSpendMonth._sum.spend ?? 0);
  const conversions = adSpendMonth._sum.conversions ?? 0;
  const roas = adSpend > 0 ? revenueThisMonth / adSpend : 0;
  const cac = (adSpendMonth._sum.newCustomers ?? 0) > 0 ? adSpend / (adSpendMonth._sum.newCustomers ?? 1) : 0;

  // Cart abandonment: carts with items right now vs orders actually placed
  // this month — a rough proxy until real session-level tracking exists.
  const cartAbandonmentRate =
    cartsRecent + cartsConverted > 0 ? (cartsRecent / (cartsRecent + cartsConverted)) * 100 : 0;

  return {
    aov,
    roas,
    cac,
    ltv,
    repeatCustomerPercent,
    returningCustomerRevenue,
    newCustomers: newCustomersMonth,
    conversions,
    cartAbandonmentRate,
  };
}

export async function getOrderHealthCounts() {
  const grouped = await prisma.order.groupBy({ by: ["status"], _count: true });
  const map = new Map(grouped.map((g) => [g.status, g._count]));

  return [
    { status: "PENDING_PAYMENT", label: "Pending", count: map.get("PENDING_PAYMENT") ?? 0 },
    { status: "COD_CONFIRMED", label: "Confirmed", count: (map.get("COD_CONFIRMED") ?? 0) + (map.get("PAID") ?? 0) },
    { status: "PRINTED", label: "Printed", count: map.get("PRINTED") ?? 0 },
    { status: "SHIPPED", label: "Shipped", count: map.get("SHIPPED") ?? 0 },
    { status: "DELIVERED", label: "Delivered", count: map.get("DELIVERED") ?? 0 },
    { status: "CANCELLED", label: "Cancelled", count: map.get("CANCELLED") ?? 0 },
    { status: "RETURNED", label: "Returned", count: map.get("RETURNED") ?? 0 },
    { status: "RTO", label: "RTO", count: map.get("RTO") ?? 0 },
    { status: "REFUNDED", label: "Refunded", count: map.get("REFUNDED") ?? 0 },
  ];
}

export async function getCheckoutCompletionRate() {
  const monthStart = startOfMonth(new Date());
  const [paid, all] = await Promise.all([
    prisma.order.count({ where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: monthStart } } }),
    prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
  ]);
  return all > 0 ? (paid / all) * 100 : 0;
}
