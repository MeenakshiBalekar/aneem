import "server-only";
import { prisma } from "@/lib/prisma";

export type StyleContext = "gym" | "travel" | "weekend" | "office" | "college";

const CONTEXT_CONFIG: Record<StyleContext, { categorySlugs: string[]; tags: string[]; blurb: string }> = {
  gym: {
    categorySlugs: ["mens-gym-tshirts", "womens-gym-tshirts", "bottles"],
    tags: ["performance", "dry-fit", "training"],
    blurb: "Sweat-ready fits built for the rack, not the runway.",
  },
  travel: {
    categorySlugs: ["hoodies", "sweatshirts", "bottles", "tumblers"],
    tags: ["layering", "comfort", "travel"],
    blurb: "Comfortable layers and gear that survive an airport sprint.",
  },
  weekend: {
    categorySlugs: ["mens-oversized-tshirts", "womens-oversized-tshirts", "caps"],
    tags: ["casual", "streetwear"],
    blurb: "Off-duty streetwear for a weekend that doesn't need a plan.",
  },
  office: {
    categorySlugs: ["mens-oversized-shirts", "sweatshirts"],
    tags: ["smart-casual"],
    blurb: "Sharp enough for the desk, relaxed enough to breathe.",
  },
  college: {
    categorySlugs: ["mens-oversized-tshirts", "womens-oversized-tshirts", "hoodies", "caps"],
    tags: ["campus", "streetwear"],
    blurb: "Campus-ready fits that go from lecture hall to hangout.",
  },
};

/**
 * Rule-based recommender keyed off category + tags — zero-latency, zero-cost,
 * and works with no external API. If ANTHROPIC_API_KEY is set, callers may
 * additionally request an AI-generated blurb (see generateStyleNote) layered
 * on top of these deterministic picks; the picks themselves stay rule-based
 * so recommendations are never inconsistent with actual stock.
 */
export async function getStyleRecommendations(context: StyleContext, limit = 8) {
  const config = CONTEXT_CONFIG[context];

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      category: { slug: { in: config.categorySlugs } },
    },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: true,
      category: true,
    },
    orderBy: [{ isBestSeller: "desc" }, { isTrending: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return { blurb: config.blurb, products };
}

/** Optional: uses Claude to write a short, on-brand style note. Falls back to the static blurb. */
export async function generateStyleNote(context: StyleContext): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return CONTEXT_CONFIG[context].blurb;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 60,
        messages: [
          {
            role: "user",
            content: `Write one punchy, confident sentence (max 18 words) recommending Aneem streetwear for a "${context}" occasion. No emoji, no quotes.`,
          },
        ],
      }),
    });
    if (!res.ok) return CONTEXT_CONFIG[context].blurb;
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || CONTEXT_CONFIG[context].blurb;
  } catch {
    return CONTEXT_CONFIG[context].blurb;
  }
}
