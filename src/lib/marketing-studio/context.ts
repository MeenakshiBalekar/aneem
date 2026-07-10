import "server-only";
import { prisma } from "@/lib/prisma";

/** Every copy generator prompts off this same product context, so a
 * caption, a Meta ad, and an email campaign for the same product never
 * contradict each other on price, fabric, or brand voice. */
export async function getProductContext(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { category: true, marketingProfile: true, variants: { take: 1 } },
  });

  const profile = product.marketingProfile;

  const lines = [
    `Brand: Aneem — premium oversized streetwear, India.`,
    `Product: ${product.title}`,
    `Category: ${product.category.name}`,
    `Price: ₹${product.basePrice}${product.compareAtPrice ? ` (MRP ₹${product.compareAtPrice})` : ""}`,
    `Description: ${product.description}`,
    product.fabricDetails ? `Fabric: ${product.fabricDetails}` : "",
    profile?.gsm ? `GSM: ${profile.gsm}` : "",
    profile?.fit ? `Fit: ${profile.fit}` : "",
    profile?.colorName ? `Color: ${profile.colorName}` : "",
    profile?.collection ? `Collection: ${profile.collection}` : "",
    profile?.mood ? `Brand mood for this piece: ${profile.mood}` : "",
    profile?.aesthetic ? `Aesthetic: ${profile.aesthetic}` : "",
    profile?.targetAudience ? `Target audience: ${profile.targetAudience}` : "",
    profile?.designLanguage ? `Design language: ${profile.designLanguage}` : "",
  ].filter(Boolean);

  return { product, profile, contextBlock: lines.join("\n") };
}

export const BRAND_VOICE = `Aneem's brand voice: confident, culture-forward, streetwear-native — never corporate, never try-hard. Think Nike/YoungLA/Represent copy, not generic ecommerce. Short, punchy sentences. No emoji unless explicitly requested. No exclamation-mark overload.`;
