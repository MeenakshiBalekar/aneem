import "server-only";
import { buildBusinessSnapshot } from "@/lib/founder/ai-context";
import { getDailyActionItems } from "@/lib/founder/action-center";

const MODEL = "claude-sonnet-5";

function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function callClaude(system: string, messages: { role: "user" | "assistant"; content: string }[], maxTokens = 600) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? "";
}

const SYSTEM_PREFIX = `You are the AI Founder Copilot inside Aneem's Founder Portal — a private, internal tool for the business owner only. Answer using ONLY the business data snapshot provided below; never invent numbers. Be direct, concise, and specific — cite actual figures from the snapshot. If the snapshot doesn't contain what's needed to answer, say so plainly instead of guessing. Keep answers under 150 words unless the question needs a breakdown.`;

export async function askCopilot(question: string, history: { role: "user" | "assistant"; content: string }[] = []) {
  if (!isConfigured()) {
    return "AI Copilot needs an ANTHROPIC_API_KEY set in your environment to answer questions. Add it to .env.local (or your Vercel project) and reload — no other setup needed.";
  }

  const snapshot = await buildBusinessSnapshot();
  const system = `${SYSTEM_PREFIX}\n\nBusiness data snapshot:\n${snapshot}`;

  try {
    return await callClaude(system, [...history, { role: "user", content: question }]);
  } catch {
    return "Couldn't reach the AI service just now — try again in a moment.";
  }
}

const FALLBACK_TEMPLATE = (summary: string, actionCount: number) =>
  `Good morning. Here's where things stand:\n\n${summary}\n\n${actionCount > 0 ? `You have ${actionCount} item(s) needing attention today — check the priorities panel.` : "Nothing urgent flagged today."}`;

export async function generateDailyCeoReport(): Promise<string> {
  const [snapshot, actionItems] = await Promise.all([buildBusinessSnapshot(), getDailyActionItems()]);

  if (!isConfigured()) {
    return FALLBACK_TEMPLATE(snapshot, actionItems.length);
  }

  const system = `${SYSTEM_PREFIX}\n\nWrite today's CEO morning briefing. Structure: 1) yesterday's headline numbers (revenue, profit, orders), 2) one or two notable trends or standout products/regions, 3) the single most important recommended action for today. Tone: direct, confident, like a sharp co-founder giving a 60-second update — not a corporate report. Under 130 words.\n\nBusiness data snapshot:\n${snapshot}\n\nToday's flagged priorities: ${actionItems.map((a) => a.text).join("; ") || "none"}`;

  try {
    return await callClaude(system, [{ role: "user", content: "Give me today's briefing." }], 400);
  } catch {
    return FALLBACK_TEMPLATE(snapshot, actionItems.length);
  }
}

export async function generateMarketingContent(params: {
  productTitle: string;
  productDescription: string;
  platform: "instagram_caption" | "instagram_reel_script" | "facebook_ad" | "google_ad" | "email" | "whatsapp_broadcast";
}): Promise<string> {
  if (!isConfigured()) {
    return "AI content generation needs an ANTHROPIC_API_KEY set in your environment.";
  }

  const platformInstructions: Record<typeof params.platform, string> = {
    instagram_caption: "Write an Instagram caption (2-3 sentences, confident streetwear tone, 2-3 relevant hashtags, one emoji max).",
    instagram_reel_script: "Write a 15-20 second Instagram Reel script with shot-by-shot directions and a punchy hook in the first 2 seconds.",
    facebook_ad: "Write Facebook ad primary text (under 125 chars) + headline (under 40 chars) + description (under 30 chars).",
    google_ad: "Write a Google Search ad: 3 headlines (30 chars each) + 2 descriptions (90 chars each).",
    email: "Write a promotional email: subject line, preview text, and a short body (under 100 words) with a clear CTA.",
    whatsapp_broadcast: "Write a WhatsApp broadcast message (under 300 chars) with an emoji, a clear offer, and a short call-to-action.",
  };

  const system = `You are a streetwear brand's marketing copywriter for Aneem, a premium oversized streetwear label. Match a confident, culture-forward, Gen-Z-adjacent tone — never corporate. Output only the requested content, no preamble or explanation.`;
  const prompt = `Product: ${params.productTitle}\nDescription: ${params.productDescription}\n\n${platformInstructions[params.platform]}`;

  try {
    return await callClaude(system, [{ role: "user", content: prompt }], 500);
  } catch {
    return "Couldn't reach the AI service just now — try again in a moment.";
  }
}
