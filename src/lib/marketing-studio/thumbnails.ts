import "server-only";
import { callClaudeJSON, isAIConfigured } from "./claude";
import { getProductContext } from "./context";
import type { ThumbnailConcept } from "./types";

const SYSTEM = `You are a thumbnail/cover designer for a premium streetwear brand's Reels. Each concept must be genuinely distinct in composition and mood — not the same shot with a different color filter.`;

const THEMES: { theme: string; colorTheme: ThumbnailConcept["colorTheme"] }[] = [
  { theme: "Luxury editorial", colorTheme: "black" },
  { theme: "Minimal studio", colorTheme: "white" },
  { theme: "Bold graphic", colorTheme: "premium" },
  { theme: "Street candid", colorTheme: "black" },
  { theme: "High-contrast black", colorTheme: "black" },
  { theme: "Clean white background", colorTheme: "white" },
  { theme: "Premium gradient", colorTheme: "premium" },
  { theme: "Close-up texture", colorTheme: "black" },
  { theme: "Lifestyle in motion", colorTheme: "premium" },
  { theme: "Typography-forward", colorTheme: "white" },
];

export async function generateThumbnailConcepts(productId: string): Promise<{ concepts: ThumbnailConcept[]; isMock: boolean }> {
  const { contextBlock } = await getProductContext(productId);

  if (!isAIConfigured()) {
    return { concepts: mockConcepts(), isMock: true };
  }

  const prompt = `${contextBlock}\n\nDesign 10 distinct Reel cover/thumbnail concepts, one for each of these themes: ${THEMES.map((t) => t.theme).join(", ")}. Return a JSON array of 10 objects matching this input order exactly:
[{ "theme": "", "description": "specific composition/shot description", "onScreenText": "text overlay, or empty string", "colorTheme": "black" | "white" | "premium" }]`;

  try {
    const concepts = await callClaudeJSON<ThumbnailConcept[]>(SYSTEM, prompt, 1500);
    return { concepts, isMock: false };
  } catch {
    return { concepts: mockConcepts(), isMock: true };
  }
}

function mockConcepts(): ThumbnailConcept[] {
  return THEMES.map(({ theme, colorTheme }) => ({
    theme,
    description: `${theme} composition — product centered, ${colorTheme} backdrop, dramatic single-source lighting.`,
    onScreenText: "ANEEM",
    colorTheme,
  }));
}
