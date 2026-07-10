import "server-only";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PAID_STATUSES: OrderStatus[] = ["PAID", "COD_CONFIRMED", "SENT_TO_QIKINK", "IN_PRODUCTION", "SHIPPED", "DELIVERED"];

export async function getRevenueOverview(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [paidOrders, allAttempts, returns] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: PAID_STATUSES }, createdAt: { gte: since } },
      select: { total: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: { in: ["RETURN_REQUESTED", "REFUNDED"] }, createdAt: { gte: since } } }),
  ]);

  const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const orderCount = paidOrders.length;
  const aov = orderCount > 0 ? revenue / orderCount : 0;
  const completionRate = allAttempts > 0 ? (orderCount / allAttempts) * 100 : 0;
  const returnRate = orderCount > 0 ? (returns / orderCount) * 100 : 0;

  return { revenue, orderCount, aov, completionRate, returnRate, allAttempts };
}

export async function getOrderStatusBreakdown() {
  const grouped = await prisma.order.groupBy({ by: ["status"], _count: true });
  return grouped.map((g) => ({ status: g.status, count: g._count }));
}

export async function getBestSellingProducts(limit = 8) {
  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true, totalPrice: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const products = await prisma.product.findMany({ where: { id: { in: grouped.map((g) => g.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return grouped
    .map((g) => ({
      product: productMap.get(g.productId),
      unitsSold: g._sum.quantity ?? 0,
      revenue: Number(g._sum.totalPrice ?? 0),
    }))
    .filter((g) => g.product);
}

export async function getTopCategories(limit = 6) {
  const items = await prisma.orderItem.findMany({
    include: { product: { include: { category: true } } },
  });

  const byCategory = new Map<string, { name: string; revenue: number; units: number }>();
  for (const item of items) {
    const key = item.product.category.id;
    const entry = byCategory.get(key) ?? { name: item.product.category.name, revenue: 0, units: 0 };
    entry.revenue += Number(item.totalPrice);
    entry.units += item.quantity;
    byCategory.set(key, entry);
  }

  return Array.from(byCategory.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getSalesByState(limit = 8) {
  const orders = await prisma.order.findMany({
    where: { status: { in: PAID_STATUSES } },
    include: { address: { select: { state: true } } },
  });

  const byState = new Map<string, number>();
  for (const order of orders) {
    byState.set(order.address.state, (byState.get(order.address.state) ?? 0) + Number(order.total));
  }

  return Array.from(byState.entries())
    .map(([state, revenue]) => ({ state, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getSalesBySize() {
  const items = await prisma.orderItem.findMany({ include: { variant: { select: { size: true } } } });
  const bySize = new Map<string, number>();
  for (const item of items) {
    bySize.set(item.variant.size, (bySize.get(item.variant.size) ?? 0) + item.quantity);
  }
  return Array.from(bySize.entries()).map(([size, units]) => ({ size, units })).sort((a, b) => b.units - a.units);
}

export async function getTopCustomers(limit = 8) {
  const grouped = await prisma.order.groupBy({
    by: ["userId"],
    where: { status: { in: PAID_STATUSES } },
    _sum: { total: true },
    _count: true,
    orderBy: { _sum: { total: "desc" } },
    take: limit,
  });

  const users = await prisma.user.findMany({ where: { id: { in: grouped.map((g) => g.userId) } } });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return grouped.map((g) => ({
    user: userMap.get(g.userId),
    lifetimeValue: Number(g._sum?.total ?? 0),
    orderCount: g._count,
  }));
}

export async function getInventoryOverview() {
  const [totalVariants, outOfStock, lowStock, syncErrors] = await Promise.all([
    prisma.productVariant.count(),
    prisma.productVariant.count({ where: { isOutOfStock: true } }),
    prisma.productVariant.count({ where: { stock: { gt: 0, lte: 8 } } }),
    prisma.product.count({ where: { syncStatus: "ERROR" } }),
  ]);
  return { totalVariants, outOfStock, lowStock, syncErrors };
}

export async function getRecentSyncLogs(limit = 10) {
  return prisma.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: limit });
}
