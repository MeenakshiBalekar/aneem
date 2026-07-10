import "server-only";
import { prisma } from "@/lib/prisma";
import type { ReelScene } from "./types";

// Pluggable client for a hosted video-assembly API — shaped after
// Creatomate's render API (POST /v1/renders with a source JSON, poll
// /v1/renders/:id for status). Swapping to Shotstack or JSON2Video means
// adapting renderReel()/checkRenderStatus() to their request/response
// shapes; nothing else in the app needs to change. No FFmpeg or rendering
// infrastructure of our own — Vercel serverless can't run that (no
// binary, no persistent disk, function time limits), so actual rendering
// always happens on the provider's infrastructure.
//
// Until VIDEO_RENDER_API_KEY is set, every call below returns clearly
// flagged mock data — same pattern as src/lib/qikink/client.ts.

const API_BASE = process.env.VIDEO_RENDER_API_BASE_URL ?? "https://api.creatomate.com/v1";
const API_KEY = process.env.VIDEO_RENDER_API_KEY ?? "";

function isConfigured(): boolean {
  return Boolean(API_KEY);
}

export { isConfigured as isVideoRenderConfigured };

interface RenderJobResult {
  externalRenderId: string;
  status: "queued" | "rendering" | "succeeded" | "failed";
  videoUrl?: string;
}

/** Converts our scene brief into the provider's timeline format and kicks
 * off a render job. Real implementation would map each ReelScene to a
 * Creatomate "element" (image/video layer + text overlay + animation),
 * referencing the product's MarketingAsset URLs for source footage/photos. */
export async function startReelRender(params: {
  scenes: ReelScene[];
  assetUrls: string[];
  voiceoverScript?: string;
  musicSongName?: string;
}): Promise<RenderJobResult> {
  if (!isConfigured()) {
    return mockRenderJob();
  }

  const totalDuration = params.scenes.reduce((sum, s) => sum + s.durationSeconds, 0);

  const res = await fetch(`${API_BASE}/renders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      output_format: "mp4",
      width: 1080,
      height: 1920,
      frame_rate: 60,
      source: {
        duration: totalDuration,
        elements: params.scenes.map((scene, i) => ({
          type: "composition",
          track: 1,
          time: params.scenes.slice(0, i).reduce((s, sc) => s + sc.durationSeconds, 0),
          duration: scene.durationSeconds,
          elements: [
            { type: "image", source: params.assetUrls[i % params.assetUrls.length] },
            scene.onScreenText
              ? { type: "text", text: scene.onScreenText, y: "80%", font_weight: 700 }
              : undefined,
          ].filter(Boolean),
        })),
      },
    }),
  });

  if (!res.ok) throw new Error(`Video render API error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { id: string; status: string; url?: string }[];
  const job = data[0];

  return {
    externalRenderId: job.id,
    status: job.status as RenderJobResult["status"],
    videoUrl: job.url,
  };
}

export async function checkRenderStatus(externalRenderId: string): Promise<RenderJobResult> {
  if (!isConfigured() || externalRenderId.startsWith("mock_")) {
    return { externalRenderId, status: "succeeded", videoUrl: undefined };
  }

  const res = await fetch(`${API_BASE}/renders/${externalRenderId}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error(`Video render API error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { id: string; status: string; url?: string };

  return { externalRenderId: data.id, status: data.status as RenderJobResult["status"], videoUrl: data.url };
}

// No VIDEO_RENDER_API_KEY means there's no real video to link to — returning
// a fake .mp4 URL (e.g. from an image-placeholder service) would silently
// break the first time someone tries to actually play it. Instead we return
// no videoUrl at all; the UI checks `isMock` and shows the scene-by-scene
// brief as the deliverable instead of a video player.
function mockRenderJob(): RenderJobResult {
  return { externalRenderId: `mock_${crypto.randomUUID()}`, status: "succeeded", videoUrl: undefined };
}

/** Kicks off (or mocks) rendering for an existing ReelBrief and updates its status. */
export async function renderReel(reelId: string) {
  const reel = await prisma.reelBrief.findUniqueOrThrow({
    where: { id: reelId },
    include: { product: { include: { marketingAssets: true, images: true } } },
  });

  const assetUrls = [
    ...reel.product.marketingAssets.map((a) => a.url),
    ...reel.product.images.map((i) => i.url),
  ];
  if (assetUrls.length === 0) assetUrls.push("https://placehold.co/1080x1920");

  await prisma.reelBrief.update({ where: { id: reelId }, data: { status: "RENDERING" } });

  try {
    const job = await startReelRender({
      scenes: reel.scenes as unknown as ReelScene[],
      assetUrls,
      voiceoverScript: reel.voiceoverScript ?? undefined,
      musicSongName: (reel.musicSuggestion as { songName?: string } | null)?.songName,
    });

    const updated = await prisma.reelBrief.update({
      where: { id: reelId },
      data: {
        status: job.status === "succeeded" ? "READY" : job.status === "failed" ? "FAILED" : "RENDERING",
        renderProvider: isConfigured() ? "creatomate" : "mock",
        externalRenderId: job.externalRenderId,
        videoUrl: job.videoUrl,
        isMock: !isConfigured(),
      },
    });

    return updated;
  } catch (err) {
    return prisma.reelBrief.update({
      where: { id: reelId },
      data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : String(err) },
    });
  }
}
