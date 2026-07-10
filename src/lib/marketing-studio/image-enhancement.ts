import "server-only";

// Pluggable image generation/editing client — shaped after Replicate's
// predictions API (POST a model version + input, poll for output). Swap
// IMAGE_API_KEY + the request body in callProvider() for OpenAI Images,
// Photoroom, or Fal.ai without touching any caller. Until IMAGE_API_KEY is
// set, every operation returns the original source image with isMock:true
// rather than a broken fake URL — the founder sees exactly what they
// uploaded, clearly flagged as "not yet enhanced", instead of a
// convincing-looking but fake transformation.

const API_BASE = process.env.IMAGE_API_BASE_URL ?? "https://api.replicate.com/v1";
const API_KEY = process.env.IMAGE_API_KEY ?? "";

export function isImageApiConfigured(): boolean {
  return Boolean(API_KEY);
}

export type ImageOperation =
  | "remove_background"
  | "increase_resolution"
  | "improve_shadows"
  | "correct_lighting"
  | "hero_image"
  | "lifestyle_mockup"
  | "studio_shot"
  | "folded_image"
  | "flat_lay"
  | "hoodie_mockup"
  | "cap_mockup"
  | "bottle_mockup"
  | "bundle_image";

interface EnhanceResult {
  url: string;
  isMock: boolean;
  operation: ImageOperation;
}

const OPERATION_MODELS: Record<ImageOperation, string> = {
  remove_background: "background-removal-model",
  increase_resolution: "upscale-model",
  improve_shadows: "relight-model",
  correct_lighting: "relight-model",
  hero_image: "product-photography-model",
  lifestyle_mockup: "scene-composite-model",
  studio_shot: "product-photography-model",
  folded_image: "product-photography-model",
  flat_lay: "product-photography-model",
  hoodie_mockup: "mockup-model",
  cap_mockup: "mockup-model",
  bottle_mockup: "mockup-model",
  bundle_image: "scene-composite-model",
};

async function callProvider(operation: ImageOperation, sourceUrl: string, prompt?: string): Promise<string> {
  const res = await fetch(`${API_BASE}/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      version: OPERATION_MODELS[operation],
      input: { image: sourceUrl, prompt },
    }),
  });
  if (!res.ok) throw new Error(`Image API error: ${res.status} ${await res.text()}`);
  const prediction = (await res.json()) as { id: string; urls: { get: string } };

  // Real providers process async — poll until the prediction completes.
  for (let attempt = 0; attempt < 30; attempt++) {
    const statusRes = await fetch(prediction.urls.get, { headers: { Authorization: `Bearer ${API_KEY}` } });
    const status = (await statusRes.json()) as { status: string; output?: string | string[] };
    if (status.status === "succeeded") {
      return Array.isArray(status.output) ? status.output[0] : (status.output ?? sourceUrl);
    }
    if (status.status === "failed") throw new Error("Image generation failed");
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Image generation timed out");
}

export async function enhanceImage(sourceUrl: string, operation: ImageOperation, prompt?: string): Promise<EnhanceResult> {
  if (!isImageApiConfigured()) {
    return { url: sourceUrl, isMock: true, operation };
  }
  try {
    const url = await callProvider(operation, sourceUrl, prompt);
    return { url, isMock: false, operation };
  } catch {
    return { url: sourceUrl, isMock: true, operation };
  }
}

export async function enhanceImageBatch(sourceUrl: string, operations: ImageOperation[]): Promise<EnhanceResult[]> {
  return Promise.all(operations.map((op) => enhanceImage(sourceUrl, op)));
}
