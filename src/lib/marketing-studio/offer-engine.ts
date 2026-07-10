import "server-only";
import { prisma } from "@/lib/prisma";
import { callClaudeJSON, isAIConfigured } from "./claude";
import { getProductProfitBreakdown } from "@/lib/founder/profit-engine";
import type { OfferSuggestion } from "./types";

const SYSTEM = `You are a DTC ecommerce growth strategist. Suggest promotional offers grounded strictly in the real inventory and profit data provided — never suggest a discount that would be unprofitable given the margin data, and prioritize offers that move slow/excess stock or lean on genuinely high-margin products.`;

/** Gathers the real signals an offer engine needs: current margins, low/high
 * stock, existing bundles, and which offer types are already live (so we
 * don't suggest something that's already running). */
async function gatherSignals() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [productProfit, lowStock, overStock, bundles, activeRules] = await Promise.all([
    getProductProfitBreakdown(start, now),
    prisma.productVariant.findMany({
      where: { stock: { gt: 0, lte: 8 } },
      include: { product: { select: { title: true } } },
      take: 5,
    }),
    prisma.productVariant.findMany({
      where: { stock: { gt: 40 } },
      include: { product: { select: { title: true } } },
      orderBy: { stock: "desc" },
      take: 5,
    }),
    prisma.bundle.findMany({ where: { isActive: true }, select: { name: true } }),
    prisma.discountRule.findMany({ where: { isActive: true }, select: { name: true, type: true } }),
  ]);

  return {
    topMarginProducts: productProfit.slice(0, 5).map((p) => `${p.title} (${p.margin.toFixed(0)}% margin)`),
    lowMarginProducts: productProfit.slice(-5).map((p) => `${p.title} (${p.margin.toFixed(0)}% margin)`),
    lowStock: lowStock.map((v) => `${v.product.title} (${v.size}) — ${v.stock} left`),
    overStock: overStock.map((v) => `${v.product.title} (${v.size}) — ${v.stock} units`),
    existingBundles: bundles.map((b) => b.name),
    activeOffers: activeRules.map((r) => `${r.name} (${r.type})`),
  };
}

export async function suggestOffers(): Promise<{ offers: OfferSuggestion[]; isMock: boolean }> {
  const signals = await gatherSignals();

  if (!isAIConfigured()) {
    return { offers: mockOffers(signals), isMock: true };
  }

  const prompt = `Current business signals:
Top-margin products: ${signals.topMarginProducts.join("; ") || "none this period"}
Low-margin products: ${signals.lowMarginProducts.join("; ") || "none this period"}
Low stock (restock or clear urgently): ${signals.lowStock.join("; ") || "none"}
Overstocked (needs movement): ${signals.overStock.join("; ") || "none"}
Existing bundles: ${signals.existingBundles.join(", ") || "none"}
Already-active offers (don't duplicate): ${signals.activeOffers.join(", ") || "none"}

Suggest 5-8 promotional offers from this playbook, adapted to the real data above: Buy 2 Save 10%, Buy 3 Save 15%, Free item above a price threshold, Free Shipping threshold, Bundle & Save, Limited Stock urgency, Flash Sale, Birthday Offer, First Order Offer. Return JSON array:
[{ "name": "", "mechanic": "the exact rule, e.g. 'Buy 2, get 10% off'", "reason": "why this makes sense given the data above — cite the specific product/stock/margin signal", "estimatedImpact": "a grounded, non-hyped estimate" }]`;

  try {
    const offers = await callClaudeJSON<OfferSuggestion[]>(SYSTEM, prompt, 1200);
    return { offers, isMock: false };
  } catch {
    return { offers: mockOffers(signals), isMock: true };
  }
}

function mockOffers(signals: Awaited<ReturnType<typeof gatherSignals>>): OfferSuggestion[] {
  const offers: OfferSuggestion[] = [
    {
      name: "Buy 2, Save 10%",
      mechanic: "10% off when cart has 2+ items",
      reason: "Standard AOV lever — raises basket size without deep margin erosion.",
      estimatedImpact: "Typically lifts AOV 15-25% when promoted at checkout.",
    },
    {
      name: "Free Shipping Above ₹1499",
      mechanic: "Waive shipping fee above ₹1499 cart value",
      reason: "Removes the single biggest checkout objection for Indian D2C buyers.",
      estimatedImpact: "Can reduce cart abandonment meaningfully at the shipping-fee step.",
    },
  ];

  if (signals.overStock.length > 0) {
    offers.push({
      name: "Flash Sale — Clear Excess Stock",
      mechanic: "20% off for 48 hours on overstocked sizes",
      reason: `Overstocked units detected: ${signals.overStock[0]}.`,
      estimatedImpact: "Short urgency windows typically clear 30-40% of flagged stock.",
    });
  }
  if (signals.lowStock.length > 0) {
    offers.push({
      name: "Limited Stock Urgency Banner",
      mechanic: "No discount — just surface 'Only X left' messaging",
      reason: `Low stock detected: ${signals.lowStock[0]}.`,
      estimatedImpact: "Scarcity messaging alone can lift conversion without margin cost.",
    });
  }
  if (signals.existingBundles.length > 0) {
    offers.push({
      name: "Bundle & Save",
      mechanic: `Feature ${signals.existingBundles[0]} more prominently with a savings callout`,
      reason: "You already have bundles configured — surfacing them harder is free AOV upside.",
      estimatedImpact: "Bundles typically carry higher AOV than single-item purchases.",
    });
  }

  return offers;
}
