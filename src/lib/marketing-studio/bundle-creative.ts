import "server-only";
import { prisma } from "@/lib/prisma";
import { callClaudeJSON, isAIConfigured } from "./claude";
import { computeBundlePrice } from "@/lib/bundles/engine";
import type { BundleCreativeOutput } from "./types";

const SYSTEM = `You are Aneem's brand copywriter naming and pitching product bundles. Confident, culture-forward streetwear tone — never corporate.`;

export async function generateBundleCreative(bundleId: string): Promise<{ data: BundleCreativeOutput; isMock: boolean }> {
  const bundle = await prisma.bundle.findUniqueOrThrow({
    where: { id: bundleId },
    include: { items: { include: { product: true } } },
  });

  const items = bundle.items.map((i) => ({ price: Number(i.product.basePrice), quantity: i.quantity }));
  const { fullPrice, bundlePrice, youSave } = computeBundlePrice(items, Number(bundle.discountPercent));
  const productList = bundle.items.map((i) => i.product.title).join(", ");

  if (!isAIConfigured()) {
    return { data: mockBundleCreative(bundle.name, productList, youSave), isMock: true };
  }

  const prompt = `Bundle contents: ${productList}
Full price: ₹${fullPrice} → Bundle price: ₹${bundlePrice} (save ₹${youSave}, ${bundle.discountPercent}% off)

Write bundle marketing copy. Return JSON:
{ "bundleName": "a punchy bundle name (e.g. 'Street Starter Pack')", "tagline": "under 8 words", "caption": "Instagram-ready caption, 2-3 sentences", "savingsCallout": "short savings callout for the product card, e.g. 'Save ₹499 — buy together'" }`;

  try {
    const data = await callClaudeJSON<BundleCreativeOutput>(SYSTEM, prompt, 500);
    return { data, isMock: false };
  } catch {
    return { data: mockBundleCreative(bundle.name, productList, youSave), isMock: true };
  }
}

function mockBundleCreative(bundleName: string, productList: string, youSave: number): BundleCreativeOutput {
  return {
    bundleName,
    tagline: "Everything you need, together.",
    caption: `${productList} — bundled so you don't have to think twice. Save ₹${youSave} when you buy together.`,
    savingsCallout: `Save ₹${youSave} — Buy Together`,
  };
}
