import "server-only";
import { prisma } from "@/lib/prisma";

export interface SearchHit {
  type: "product" | "order" | "customer";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/** Cross-entity search powering the founder command palette (⌘K): products
 * by title/Qikink id, orders by order number, customers by name/email/phone.
 * Kept intentionally small (a handful per type) — the palette is for jumping
 * to a known thing, not browsing; the dedicated list pages handle that. */
export async function globalFounderSearch(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const contains = { contains: q, mode: "insensitive" as const };

  const [products, orders, customers] = await Promise.all([
    prisma.product.findMany({
      where: { OR: [{ title: contains }, { qikinkProductId: contains }] },
      select: { id: true, title: true, category: { select: { name: true } }, isActive: true },
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.order.findMany({
      where: { OR: [{ orderNumber: contains }, { user: { email: contains } }] },
      select: { id: true, orderNumber: true, total: true, status: true, user: { select: { email: true } } },
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER", OR: [{ name: contains }, { email: contains }, { phone: contains }] },
      select: { id: true, name: true, email: true, _count: { select: { orders: true } } },
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return [
    ...products.map<SearchHit>((p) => ({
      type: "product",
      id: p.id,
      title: p.title,
      subtitle: `${p.category?.name ?? "Uncategorized"} · ${p.isActive ? "Active" : "Draft"}`,
      href: `/founder/products/${p.id}`,
    })),
    ...orders.map<SearchHit>((o) => ({
      type: "order",
      id: o.id,
      title: o.orderNumber,
      subtitle: `${o.user.email} · ₹${Number(o.total)} · ${o.status.replace(/_/g, " ")}`,
      href: `/founder/orders/${o.id}`,
    })),
    ...customers.map<SearchHit>((c) => ({
      type: "customer",
      id: c.id,
      title: c.name ?? c.email,
      subtitle: `${c.email} · ${c._count.orders} order${c._count.orders === 1 ? "" : "s"}`,
      href: `/founder/orders?search=${encodeURIComponent(c.email)}`,
    })),
  ];
}
