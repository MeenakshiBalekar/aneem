import "server-only";
import { prisma } from "@/lib/prisma";
import { callClaudeVisionJSON, fetchImageAsBase64, isAIConfigured } from "./claude";
import type { DetectedProductAttributes } from "./types";

const SYSTEM = `You are a senior creative director at a premium streetwear brand, analyzing product photography to brief a marketing team. Look carefully at the actual images provided — fabric texture, cut, print placement, silhouette, lighting — and describe what you genuinely observe, not generic streetwear boilerplate. Be specific and opinionated, like a real creative director's notes, not a marketing textbook.`;

function buildPrompt(fields: {
  title: string;
  description: string;
  collection?: string;
  fit?: string;
  fabric?: string;
  gsm?: number;
  colorName?: string;
}): string {
  return `Analyze this product for Aneem, a premium oversized streetwear brand.

Product name: ${fields.title}
Description: ${fields.description}
${fields.collection ? `Collection: ${fields.collection}\n` : ""}${fields.fit ? `Fit: ${fields.fit}\n` : ""}${fields.fabric ? `Fabric: ${fields.fabric}\n` : ""}${fields.gsm ? `GSM: ${fields.gsm}\n` : ""}${fields.colorName ? `Color: ${fields.colorName}\n` : ""}

Return JSON with this exact shape:
{
  "typographyStyle": "the print/graphic typography style visible on the product, or 'none' if plain",
  "mood": "one or two words — the emotional register of this piece",
  "aesthetic": "the specific streetwear sub-aesthetic this fits (e.g. 'minimalist Japanese streetwear', 'Y2K revival', 'utilitarian workwear')",
  "positioning": "premium | minimal | streetwear | athletic | luxury — pick the single best fit",
  "targetAudience": "a specific, real description of who buys this — age range, lifestyle, not just 'young people'",
  "colorPalette": ["3-5 hex color codes observed in the product and its likely styling context"],
  "designLanguage": "2-3 sentences on the overall design philosophy this piece communicates",
  "fitObserved": "what you can see about the fit/silhouette from the images — oversized, boxy, tailored, etc.",
  "summary": "one punchy sentence a creative director would say when first seeing this product"
}`;
}

export async function analyzeProduct(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      marketingAssets: { where: { kind: { in: ["SOURCE_FRONT", "SOURCE_BACK", "SOURCE_LIFESTYLE", "SOURCE_FABRIC"] } } },
      marketingProfile: true,
    },
  });

  const sourceImageUrls = [
    ...product.marketingAssets.map((a) => a.url),
    ...product.images.slice(0, 4).map((i) => i.url),
  ].slice(0, 4);

  const promptFields = {
    title: product.title,
    description: product.description,
    collection: product.marketingProfile?.collection ?? undefined,
    fit: product.marketingProfile?.fit ?? undefined,
    fabric: product.marketingProfile?.fabric ?? product.fabricDetails ?? undefined,
    gsm: product.marketingProfile?.gsm ?? undefined,
    colorName: product.marketingProfile?.colorName ?? undefined,
  };

  let attributes: DetectedProductAttributes;
  let isMock = false;

  if (!isAIConfigured()) {
    isMock = true;
    attributes = mockAnalysis(product.title);
  } else {
    try {
      const images = await Promise.all(
        sourceImageUrls.filter((url) => url.startsWith("http")).map((url) => fetchImageAsBase64(url)),
      );
      if (images.length === 0) {
        isMock = true;
        attributes = mockAnalysis(product.title);
      } else {
        attributes = await callClaudeVisionJSON<DetectedProductAttributes>(SYSTEM, buildPrompt(promptFields), images);
      }
    } catch {
      isMock = true;
      attributes = mockAnalysis(product.title);
    }
  }

  const profile = await prisma.productMarketingProfile.upsert({
    where: { productId },
    update: {
      typographyStyle: attributes.typographyStyle,
      mood: attributes.mood,
      aesthetic: attributes.aesthetic,
      positioning: attributes.positioning,
      targetAudience: attributes.targetAudience,
      colorPalette: attributes.colorPalette,
      designLanguage: attributes.designLanguage,
      rawAnalysis: attributes as never,
      analyzedAt: new Date(),
    },
    create: {
      productId,
      typographyStyle: attributes.typographyStyle,
      mood: attributes.mood,
      aesthetic: attributes.aesthetic,
      positioning: attributes.positioning,
      targetAudience: attributes.targetAudience,
      colorPalette: attributes.colorPalette,
      designLanguage: attributes.designLanguage,
      rawAnalysis: attributes as never,
      analyzedAt: new Date(),
    },
  });

  return { profile, attributes, isMock };
}

function mockAnalysis(title: string): DetectedProductAttributes {
  return {
    typographyStyle: "Bold sans-serif chest print",
    mood: "Confident",
    aesthetic: "Modern oversized streetwear",
    positioning: "streetwear",
    targetAudience: "18-28 year olds who dress for the culture, not the occasion",
    colorPalette: ["#0a0a0a", "#f7f6f2", "#d7ff3f", "#3f3f3f"],
    designLanguage:
      "Clean, boxy silhouette with minimal branding — lets the fabric and fit do the talking rather than loud graphics.",
    fitObserved: "Oversized, dropped shoulder",
    summary: `${title} — this is the piece that makes the rest of the fit look intentional.`,
  };
}
