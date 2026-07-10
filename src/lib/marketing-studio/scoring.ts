import "server-only";
import { callClaudeJSON, isAIConfigured } from "./claude";
import type { ContentScore } from "./types";

const SYSTEM = `You are a senior performance marketing strategist scoring content before it ships, based on years of running paid social for premium streetwear brands. Score honestly — most content is mediocre, so scores should mostly land in the 40-75 range; reserve 85+ for genuinely exceptional hooks. Base every score on the actual text provided, not the product itself.`;

function buildPrompt(contentType: string, content: string): string {
  return `Score this ${contentType} for Aneem (premium streetwear brand):

"""
${content}
"""

Return JSON with this exact shape, all scores 0-100 except expectedWatchTime which is 0-100 (percent of video watched, only relevant for video content — estimate reasonably for non-video):
{
  "hookScore": number,
  "scrollStopScore": number,
  "luxuryScore": number,
  "viralityScore": number,
  "conversionScore": number,
  "confidenceScore": number,
  "expectedCTR": number,
  "expectedSaves": number,
  "expectedShares": number,
  "expectedWatchTime": number
}`;
}

export async function scoreContent(contentType: string, content: string): Promise<{ score: ContentScore; isMock: boolean }> {
  if (!isAIConfigured()) {
    return { score: mockScore(), isMock: true };
  }
  try {
    const score = await callClaudeJSON<ContentScore>(SYSTEM, buildPrompt(contentType, content), 400);
    return { score, isMock: false };
  } catch {
    return { score: mockScore(), isMock: true };
  }
}

function mockScore(): ContentScore {
  return {
    hookScore: 62,
    scrollStopScore: 58,
    luxuryScore: 55,
    viralityScore: 50,
    conversionScore: 60,
    confidenceScore: 40,
    expectedCTR: 1.8,
    expectedSaves: 45,
    expectedShares: 12,
    expectedWatchTime: 55,
  };
}
