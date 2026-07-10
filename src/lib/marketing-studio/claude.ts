import "server-only";

const MODEL = "claude-sonnet-5";
const API_URL = "https://api.anthropic.com/v1/messages";

export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

interface ImageInput {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

async function request(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? "";
}

export async function callClaudeText(system: string, prompt: string, maxTokens = 800): Promise<string> {
  return request({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
}

/** Asks Claude to respond with only JSON, parses it, and throws with the raw
 * text attached if parsing fails — callers should catch and fall back. */
export async function callClaudeJSON<T>(system: string, prompt: string, maxTokens = 1200): Promise<T> {
  const jsonSystem = `${system}\n\nRespond with ONLY valid JSON — no markdown fences, no commentary, no leading/trailing text. The response must be parseable by JSON.parse() as-is.`;
  const text = await request({
    model: MODEL,
    max_tokens: maxTokens,
    system: jsonSystem,
    messages: [{ role: "user", content: prompt }],
  });

  // Strip markdown fences defensively in case the model adds them anyway.
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Claude returned non-JSON output: ${cleaned.slice(0, 200)}`);
  }
}

/** Multimodal call — used only by product-analysis.ts to "look at" uploaded
 * product images. Images are sent as base64 (fetched server-side from
 * their Blob URLs immediately before the call, never stored inline). */
export async function callClaudeVision(
  system: string,
  prompt: string,
  images: ImageInput[],
  maxTokens = 1200,
): Promise<string> {
  const content = [
    ...images.map((img) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: img.mediaType, data: img.base64 },
    })),
    { type: "text" as const, text: prompt },
  ];

  return request({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content }],
  });
}

export async function callClaudeVisionJSON<T>(
  system: string,
  prompt: string,
  images: ImageInput[],
  maxTokens = 1200,
): Promise<T> {
  const jsonSystem = `${system}\n\nRespond with ONLY valid JSON — no markdown fences, no commentary. The response must be parseable by JSON.parse() as-is.`;
  const text = await callClaudeVision(jsonSystem, prompt, images, maxTokens);
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Claude returned non-JSON output: ${cleaned.slice(0, 200)}`);
  }
}

export async function fetchImageAsBase64(url: string): Promise<ImageInput> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't fetch image at ${url}: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const mediaType = (["image/jpeg", "image/png", "image/webp"].includes(contentType) ? contentType : "image/jpeg") as ImageInput["mediaType"];
  const buffer = await res.arrayBuffer();
  return { base64: Buffer.from(buffer).toString("base64"), mediaType };
}
