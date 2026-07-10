import "server-only";
import { prisma } from "@/lib/prisma";
import type { Order, OrderItem, OrderStatus, ProductVariant, Product } from "@prisma/client";

export interface OrderProfitBreakdown {
  orderId: string;
  orderNumber: string;
  revenue: number;
  productCost: number;
  printingCost: number;
  shippingCost: number;
  packagingCost: number;
  gatewayFee: number;
  discount: number;
  gst: number;
  refund: number;
  rtoLoss: number;
  profit: number;
}

type OrderWithItems = Order & { items: (OrderItem & { variant: ProductVariant; product: Product })[] };

/** Singleton cost-settings row — created with sane apparel-business defaults on first read. */
export async function getCostSettings() {
  return prisma.costSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

async function getProductCostMap() {
  const costs = await prisma.productCost.findMany();
  return new Map(costs.map((c) => [c.productId, c]));
}

/**
 * Per-order profit. Matches the breakdown requested exactly:
 * Selling Price − Product Cost − Printing Cost − Shipping Cost −
 * Packaging Cost − Gateway Charges − Discount − GST − Return/RTO Loss −
 * Refund − Misc (misc is period-level, applied separately in
 * getMonthlyProfitStatement rather than per-order, since it isn't
 * attributable to a specific order).
 *
 * Cost inputs come from CostSettings/ProductCost — see the Cost Settings
 * page in the Founder Portal. Until real figures are entered, product/
 * printing cost default to 0, which makes profit == revenue minus the
 * costs we *can* compute (shipping/packaging/gateway/discount/GST) — the
 * dashboard clearly labels this as "cost data incomplete" rather than
 * silently showing a misleadingly high profit number.
 */
export function computeOrderProfit(
  order: OrderWithItems,
  costSettings: Awaited<ReturnType<typeof getCostSettings>>,
  productCostMap: Map<string, { productCost: unknown; printingCost: unknown }>,
): OrderProfitBreakdown {
  const revenue = Number(order.total);
  const subtotal = Number(order.subtotal);
  const discount = Number(order.discountAmount);

  let productCost = 0;
  let printingCost = 0;
  for (const item of order.items) {
    const cost = productCostMap.get(item.productId);
    productCost += Number(cost?.productCost ?? 0) * item.quantity;
    printingCost += Number(cost?.printingCost ?? 0) * item.quantity;
  }

  const shippingCost = Number(costSettings.defaultShippingCost);
  const packagingCost = Number(costSettings.defaultPackagingCost);
  const gatewayFee = order.paymentMethod === "RAZORPAY" ? revenue * (Number(costSettings.gatewayFeePercent) / 100) : 0;
  const gst = Math.max(0, subtotal - discount) * (Number(costSettings.gstPercent) / 100);
  const refund = Number(order.refundAmount);
  const rtoLoss = Number(order.rtoLossAmount);

  const profit =
    revenue - productCost - printingCost - shippingCost - packagingCost - gatewayFee - gst - refund - rtoLoss;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    revenue,
    productCost,
    printingCost,
    shippingCost,
    packagingCost,
    gatewayFee,
    discount,
    gst,
    refund,
    rtoLoss,
    profit,
  };
}

export const REVENUE_STATUSES: OrderStatus[] = [
  "PAID",
  "COD_CONFIRMED",
  "SENT_TO_QIKINK",
  "IN_PRODUCTION",
  "PRINTED",
  "SHIPPED",
  "DELIVERED",
];

async function getOrdersInRange(start: Date, end: Date) {
  return prisma.order.findMany({
    where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: start, lt: end } },
    include: { items: { include: { variant: true, product: true } } },
  });
}

export async function getProfitForRange(start: Date, end: Date) {
  const [orders, costSettings, productCostMap] = await Promise.all([
    getOrdersInRange(start, end),
    getCostSettings(),
    getProductCostMap(),
  ]);

  const breakdown = orders.map((o) => computeOrderProfit(o, costSettings, productCostMap));
  const revenue = breakdown.reduce((s, b) => s + b.revenue, 0);
  const profit = breakdown.reduce((s, b) => s + b.profit, 0);

  const hasCostData = productCostMap.size > 0;

  return {
    orders: breakdown,
    orderCount: breakdown.length,
    revenue,
    profit,
    profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
    profitPerOrder: breakdown.length > 0 ? profit / breakdown.length : 0,
    hasCostData,
  };
}

/** Monthly Profit Statement — mirrors the exact structure requested: period
 * expenses (Qikink printing, shipping, packaging, gateway, advertising,
 * refunds, returns/RTO, misc) rolled up against gross revenue. */
export async function getMonthlyProfitStatement(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const [orderProfit, deliveredCount, cancelledCount, returnedCount, miscExpenses, adSpend, codOrders] =
    await Promise.all([
      getProfitForRange(start, end),
      prisma.order.count({ where: { status: "DELIVERED", createdAt: { gte: start, lt: end } } }),
      prisma.order.count({ where: { status: "CANCELLED", createdAt: { gte: start, lt: end } } }),
      prisma.order.count({ where: { status: { in: ["RETURNED", "RTO"] as OrderStatus[] }, createdAt: { gte: start, lt: end } } }),
      prisma.miscExpense.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { amount: true } }),
      prisma.adSpend.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { spend: true } }),
      prisma.order.findMany({
        where: {
          paymentMethod: "COD",
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: start, lt: end },
        },
        select: { total: true, status: true },
      }),
    ]);

  const qikinkPrinting = orderProfit.orders.reduce((s, o) => s + o.productCost + o.printingCost, 0);
  const shipping = orderProfit.orders.reduce((s, o) => s + o.shippingCost, 0);
  const packaging = orderProfit.orders.reduce((s, o) => s + o.packagingCost, 0);
  const gateway = orderProfit.orders.reduce((s, o) => s + o.gatewayFee, 0);
  const refunds = orderProfit.orders.reduce((s, o) => s + o.refund, 0);
  const returnsRto = orderProfit.orders.reduce((s, o) => s + o.rtoLoss, 0);
  const misc = Number(miscExpenses._sum.amount ?? 0);
  const advertising = Number(adSpend._sum.spend ?? 0);

  const totalExpenses = qikinkPrinting + shipping + packaging + gateway + advertising + refunds + returnsRto + misc;
  const netProfit = orderProfit.revenue - totalExpenses;

  const cashCollected = codOrders
    .filter((o) => o.status === "DELIVERED")
    .reduce((s, o) => s + Number(o.total), 0);
  const outstanding = codOrders
    .filter((o) => o.status !== "DELIVERED")
    .reduce((s, o) => s + Number(o.total), 0);

  return {
    year,
    month,
    revenue: orderProfit.revenue,
    orders: orderProfit.orderCount,
    deliveredOrders: deliveredCount,
    cancelledOrders: cancelledCount,
    returnedOrders: returnedCount,
    expenses: { qikinkPrinting, shipping, packaging, gateway, advertising, refunds, returnsRto, misc },
    totalExpenses,
    netProfit,
    netProfitMargin: orderProfit.revenue > 0 ? (netProfit / orderProfit.revenue) * 100 : 0,
    profitPerOrder: orderProfit.orderCount > 0 ? netProfit / orderProfit.orderCount : 0,
    cashCollected,
    outstandingPayments: outstanding,
    hasCostData: orderProfit.hasCostData,
  };
}

export async function getProductProfitBreakdown(start: Date, end: Date) {
  const [orders, costSettings, productCostMap] = await Promise.all([
    getOrdersInRange(start, end),
    getCostSettings(),
    getProductCostMap(),
  ]);

  const byProduct = new Map<string, { title: string; revenue: number; profit: number; units: number }>();

  for (const order of orders) {
    for (const item of order.items) {
      const cost = productCostMap.get(item.productId);
      const productCost = Number(cost?.productCost ?? 0) * item.quantity;
      const printingCost = Number(cost?.printingCost ?? 0) * item.quantity;
      const itemRevenue = Number(item.totalPrice);
      const shareOfShipping = Number(costSettings.defaultShippingCost) / order.items.length;
      const shareOfPackaging = Number(costSettings.defaultPackagingCost) / order.items.length;
      const itemProfit = itemRevenue - productCost - printingCost - shareOfShipping - shareOfPackaging;

      const entry = byProduct.get(item.productId) ?? { title: item.product.title, revenue: 0, profit: 0, units: 0 };
      entry.revenue += itemRevenue;
      entry.profit += itemProfit;
      entry.units += item.quantity;
      byProduct.set(item.productId, entry);
    }
  }

  return Array.from(byProduct.entries())
    .map(([productId, v]) => ({ productId, ...v, margin: v.revenue > 0 ? (v.profit / v.revenue) * 100 : 0 }))
    .sort((a, b) => b.profit - a.profit);
}

/** Top customers by lifetime profit contribution (not just revenue) — uses
 * the same per-order profit computation as everything else, over each
 * customer's full order history rather than one period. */
export async function getTopCustomersByProfit(limit = 20) {
  const [orders, costSettings, productCostMap] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: REVENUE_STATUSES } },
      include: { items: { include: { variant: true, product: true } }, user: { select: { name: true, email: true } } },
    }),
    getCostSettings(),
    getProductCostMap(),
  ]);

  const byCustomer = new Map<string, { name: string; email: string; revenue: number; profit: number; orders: number }>();
  for (const order of orders) {
    const breakdown = computeOrderProfit(order, costSettings, productCostMap);
    const entry = byCustomer.get(order.userId) ?? {
      name: order.user.name ?? order.user.email,
      email: order.user.email,
      revenue: 0,
      profit: 0,
      orders: 0,
    };
    entry.revenue += breakdown.revenue;
    entry.profit += breakdown.profit;
    entry.orders += 1;
    byCustomer.set(order.userId, entry);
  }

  return Array.from(byCustomer.entries())
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, limit);
}

export async function getBundleProfitBreakdown(start: Date, end: Date) {
  const bundles = await prisma.bundle.findMany({
    where: { isActive: true },
    include: { items: { include: { product: { include: { costConfig: true } } } } },
  });
  const costSettings = await getCostSettings();

  const orders = await getOrdersInRange(start, end);
  const orderProductIds = orders.map((o) => new Set(o.items.map((i) => i.productId)));

  return bundles.map((bundle) => {
    const requiredIds = bundle.items.map((i) => i.productId);
    const matchingOrders = orders.filter((_, idx) => requiredIds.every((id) => orderProductIds[idx].has(id)));

    const revenue = matchingOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const cost = bundle.items.reduce(
      (sum, i) => sum + Number(i.product.costConfig?.productCost ?? 0) + Number(i.product.costConfig?.printingCost ?? 0),
      0,
    );
    const overheadPerOrder = Number(costSettings.defaultShippingCost) + Number(costSettings.defaultPackagingCost);
    const profit = revenue - matchingOrders.length * (cost + overheadPerOrder);
    const returnCount = matchingOrders.filter((o) => ["RETURNED", "RTO"].includes(o.status)).length;

    return {
      bundleId: bundle.id,
      name: bundle.name,
      orders: matchingOrders.length,
      revenue,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      returnRate: matchingOrders.length > 0 ? (returnCount / matchingOrders.length) * 100 : 0,
    };
  });
}
