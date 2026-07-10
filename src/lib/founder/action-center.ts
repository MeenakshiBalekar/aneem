import "server-only";
import { prisma } from "@/lib/prisma";

export interface ActionItem {
  severity: "red" | "orange" | "green";
  text: string;
  href?: string;
}

/**
 * Deterministic, rule-based priority list — no AI involved. Reliability
 * matters more than cleverness for "what needs my attention right now",
 * so this reads directly off live counts rather than an LLM summary. The
 * AI Daily CEO Report (src/lib/ai/founder-copilot.ts) is the narrative
 * layer on top of this same data.
 */
export async function getDailyActionItems(): Promise<ActionItem[]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const yesterday = new Date(startOfToday);
  yesterday.setDate(yesterday.getDate() - 1);

  const [followUpsDue, unconfirmedCod, lastSync, outOfStockVariants, deliveredYesterday] = await Promise.all([
    prisma.order.count({
      where: { contactStatus: { in: ["NO_RESPONSE", "CALLBACK_REQUESTED"] }, nextFollowUpAt: { lte: new Date() } },
    }),
    prisma.order.count({
      where: { paymentMethod: "COD", status: { in: ["COD_CONFIRMED", "SENT_TO_QIKINK"] }, contactStatus: { notIn: ["CONFIRMED"] } },
    }),
    prisma.syncLog.findFirst({ where: { jobType: "PRODUCT_SYNC" }, orderBy: { startedAt: "desc" } }),
    prisma.productVariant.findMany({ where: { isOutOfStock: true }, include: { product: true }, take: 5 }),
    prisma.order.count({ where: { status: "DELIVERED", updatedAt: { gte: yesterday, lt: startOfToday } } }),
  ]);

  const items: ActionItem[] = [];

  if (followUpsDue > 0) {
    items.push({
      severity: "red",
      text: `${followUpsDue} customer${followUpsDue > 1 ? "s" : ""} need${followUpsDue === 1 ? "s" : ""} a callback today.`,
      href: "/founder/calling-queue",
    });
  }

  if (unconfirmedCod > 0) {
    items.push({
      severity: "orange",
      text: `${unconfirmedCod} COD order${unconfirmedCod > 1 ? "s are" : " is"} still unconfirmed.`,
      href: "/founder/calling-queue",
    });
  }

  if (lastSync) {
    const hoursAgo = (Date.now() - lastSync.startedAt.getTime()) / 3_600_000;
    if (lastSync.status === "FAILED" || hoursAgo > 6) {
      items.push({
        severity: "orange",
        text:
          lastSync.status === "FAILED"
            ? "Last Qikink sync failed — check the sync log."
            : `Qikink hasn't synced in ${Math.round(hoursAgo)}h.`,
        href: "/founder/inventory",
      });
    } else {
      items.push({ severity: "green", text: "Qikink sync is up to date." });
    }
  }

  for (const variant of outOfStockVariants) {
    items.push({
      severity: "red",
      text: `${variant.product.title} (${variant.size}) is out of stock.`,
      href: "/founder/inventory",
    });
  }

  if (deliveredYesterday > 0) {
    items.push({
      severity: "green",
      text: `${deliveredYesterday} order${deliveredYesterday > 1 ? "s" : ""} delivered yesterday. Consider sending review requests.`,
    });
  }

  return items;
}
