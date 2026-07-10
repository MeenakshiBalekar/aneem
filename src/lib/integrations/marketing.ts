import "server-only";
import { prisma } from "@/lib/prisma";

function isMockMode(): boolean {
  return process.env.MARKETING_USE_MOCK !== "false";
}

// Deterministic "mock" numbers (seeded by date, not Math.random()) so the
// dashboard looks stable across reloads instead of jittering on every
// request — makes the placeholder state usable for a demo, not just noise.
function seededValue(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (hash % (max - min));
}

export interface TrafficOverview {
  visitors: number;
  sessions: number;
  conversionRate: number;
  isMock: boolean;
}

/** GA4-shaped traffic overview. Real mode reads Google Analytics Data API
 * (requires GA4_PROPERTY_ID + GOOGLE_SERVICE_ACCOUNT_JSON) — not wired yet
 * since it needs a live property; the mock path keeps the exact same
 * return shape so swapping in the real call later is a one-function change. */
export async function getTrafficOverview(days = 30): Promise<TrafficOverview> {
  if (!isMockMode()) {
    // TODO: call Google Analytics Data API `runReport` here once
    // GA4_PROPERTY_ID / GOOGLE_SERVICE_ACCOUNT_JSON are set.
  }

  const [orderCount] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: new Date(Date.now() - days * 86_400_000) } } }),
  ]);

  const visitors = seededValue(`visitors-${days}`, orderCount * 18, orderCount * 32) || seededValue("visitors-fallback", 800, 2200);
  const sessions = Math.round(visitors * 1.35);
  const conversionRate = orderCount > 0 && visitors > 0 ? (orderCount / visitors) * 100 : 0;

  return { visitors, sessions, conversionRate, isMock: true };
}

export interface TrafficSourceShare {
  source: string;
  sessions: number;
  percent: number;
}

export async function getTrafficSources(): Promise<{ sources: TrafficSourceShare[]; isMock: boolean }> {
  const template = [
    { source: "Direct", weight: 28 },
    { source: "Google Organic", weight: 24 },
    { source: "Instagram Ads", weight: 20 },
    { source: "Facebook Ads", weight: 14 },
    { source: "Referral", weight: 8 },
    { source: "Other", weight: 6 },
  ];
  const totalWeight = template.reduce((s, t) => s + t.weight, 0);
  const totalSessions = seededValue("total-sessions", 1200, 3400);

  return {
    isMock: isMockMode(),
    sources: template.map((t) => ({
      source: t.source,
      sessions: Math.round((t.weight / totalWeight) * totalSessions),
      percent: (t.weight / totalWeight) * 100,
    })),
  };
}

export async function getTopPages(): Promise<{ landing: string[]; exit: string[]; isMock: boolean }> {
  const categories = await prisma.category.findMany({ where: { isActive: true }, take: 4, orderBy: { sortOrder: "asc" } });
  const landing = ["/", ...categories.slice(0, 3).map((c) => `/collections/${c.slug}`)];
  const exit = ["/checkout", "/cart", ...categories.slice(0, 2).map((c) => `/collections/${c.slug}`)];
  return { landing, exit, isMock: isMockMode() };
}

/** Not mocked — derived from real order + wishlist activity, which is a
 * defensible "most engaged products" proxy even without page-view tracking. */
export async function getMostEngagedProducts(limit = 6) {
  const [byOrders, byWishlist] = await Promise.all([
    prisma.orderItem.groupBy({ by: ["productId"], _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: limit }),
    prisma.wishlistItem.groupBy({ by: ["productId"], _count: true, orderBy: { _count: { productId: "desc" } }, take: limit }),
  ]);

  const ids = Array.from(new Set([...byOrders.map((o) => o.productId), ...byWishlist.map((w) => w.productId)]));
  const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
  const productMap = new Map(products.map((p) => [p.id, p.title]));
  const wishlistMap = new Map(byWishlist.map((w) => [w.productId, w._count]));

  return byOrders
    .map((o) => ({
      title: productMap.get(o.productId) ?? "Unknown",
      unitsOrdered: o._sum.quantity ?? 0,
      wishlisted: wishlistMap.get(o.productId) ?? 0,
    }))
    .slice(0, limit);
}
