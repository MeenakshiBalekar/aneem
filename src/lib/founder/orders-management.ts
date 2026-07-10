import "server-only";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";

export interface OrderFilters {
  dateRange?: "today" | "yesterday" | "week" | "month" | "custom";
  from?: string;
  to?: string;
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  state?: string;
  city?: string;
  product?: string;
  size?: string;
  search?: string;
}

function resolveDateRange(filters: OrderFilters): { gte?: Date; lt?: Date } {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  switch (filters.dateRange) {
    case "today":
      return { gte: startOfToday, lt: new Date(startOfToday.getTime() + 86_400_000) };
    case "yesterday": {
      const y = new Date(startOfToday.getTime() - 86_400_000);
      return { gte: y, lt: startOfToday };
    }
    case "week":
      return { gte: new Date(startOfToday.getTime() - 7 * 86_400_000), lt: new Date(startOfToday.getTime() + 86_400_000) };
    case "month":
      return { gte: new Date(now.getFullYear(), now.getMonth(), 1), lt: new Date(startOfToday.getTime() + 86_400_000) };
    case "custom":
      return {
        gte: filters.from ? new Date(filters.from) : undefined,
        lt: filters.to ? new Date(new Date(filters.to).getTime() + 86_400_000) : undefined,
      };
    default:
      return {};
  }
}

export function buildOrderWhere(filters: OrderFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  const dateRange = resolveDateRange(filters);
  if (dateRange.gte || dateRange.lt) where.createdAt = dateRange;

  if (filters.status) where.status = filters.status;
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;

  if (filters.state || filters.city) {
    where.address = {
      ...(filters.state ? { state: { equals: filters.state, mode: "insensitive" } } : {}),
      ...(filters.city ? { city: { equals: filters.city, mode: "insensitive" } } : {}),
    };
  }

  const itemConditions: Prisma.OrderItemWhereInput[] = [];
  if (filters.product) itemConditions.push({ product: { title: { contains: filters.product, mode: "insensitive" } } });
  if (filters.size) itemConditions.push({ variant: { size: filters.size } });
  if (itemConditions.length) {
    where.AND = itemConditions.map((cond) => ({ items: { some: cond } }));
  }

  if (filters.search) {
    const term = filters.search.trim();
    where.OR = [
      { orderNumber: { contains: term, mode: "insensitive" } },
      { user: { email: { contains: term, mode: "insensitive" } } },
      { address: { phone: { contains: term } } },
      { address: { fullName: { contains: term, mode: "insensitive" } } },
    ];
  }

  return where;
}

export async function getFilteredOrders(filters: OrderFilters, opts: { page?: number; pageSize?: number } = {}) {
  const { page = 1, pageSize = 50 } = opts;
  const where = buildOrderWhere(filters);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        address: true,
        user: { select: { name: true, email: true } },
        items: { include: { product: { select: { title: true } }, variant: { select: { size: true, color: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, pageSize };
}

export async function getOrdersForExport(filters: OrderFilters) {
  const where = buildOrderWhere(filters);
  return prisma.order.findMany({
    where,
    include: {
      address: true,
      user: { select: { name: true, email: true } },
      items: { include: { product: { select: { title: true } }, variant: { select: { size: true, color: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
}

export function flattenOrderForExport(order: Awaited<ReturnType<typeof getOrdersForExport>>[number]) {
  return {
    "Order ID": order.orderNumber,
    "Date": order.createdAt.toISOString().slice(0, 10),
    "Customer Name": order.address.fullName,
    "Phone": order.address.phone,
    "Email": order.user.email,
    "Address": `${order.address.line1}${order.address.line2 ? ", " + order.address.line2 : ""}`,
    "City": order.address.city,
    "State": order.address.state,
    "PIN Code": order.address.pincode,
    "Products": order.items.map((i) => `${i.product.title} (${i.variant.size}${i.variant.color ? "/" + i.variant.color : ""}) x${i.quantity}`).join("; "),
    "Payment Type": order.paymentMethod,
    "Order Value": Number(order.total),
    "Order Status": order.status,
    "Contact Status": order.contactStatus,
  };
}

export async function getFilterOptions() {
  const [states, cities] = await Promise.all([
    prisma.address.findMany({ distinct: ["state"], select: { state: true }, orderBy: { state: "asc" } }),
    prisma.address.findMany({ distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
  ]);
  return { states: states.map((s) => s.state), cities: cities.map((c) => c.city) };
}
