import { NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { logFounderAction } from "@/lib/founder/audit";

// One-click export: every generated text asset as readable .txt/.json, plus
// every image/video asset fetched and included by binary — a single ZIP
// ready to hand to whoever's actually posting the content.
export async function GET(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await params;

  const [product, content, assets, reels] = await Promise.all([
    prisma.product.findUniqueOrThrow({ where: { id: productId } }),
    prisma.marketingContent.findMany({ where: { productId }, orderBy: { createdAt: "desc" } }),
    prisma.marketingAsset.findMany({ where: { productId }, orderBy: { createdAt: "desc" } }),
    prisma.reelBrief.findMany({ where: { productId }, orderBy: { createdAt: "desc" } }),
  ]);

  const zip = new JSZip();
  const copyFolder = zip.folder("copy");
  const assetsFolder = zip.folder("assets");
  const reelsFolder = zip.folder("reels");

  const latestByType = new Map<string, (typeof content)[number]>();
  for (const c of content) {
    if (!latestByType.has(c.type)) latestByType.set(c.type, c);
  }

  for (const [type, c] of Array.from(latestByType.entries())) {
    copyFolder?.file(`${type.toLowerCase()}.json`, JSON.stringify(c.content, null, 2));
  }

  for (const reel of reels.slice(0, 1)) {
    reelsFolder?.file(
      "reel-brief.json",
      JSON.stringify(
        { scenes: reel.scenes, voiceoverScript: reel.voiceoverScript, musicSuggestion: reel.musicSuggestion, videoUrl: reel.videoUrl, isMock: reel.isMock },
        null,
        2,
      ),
    );
  }

  await Promise.all(
    assets.map(async (asset, i) => {
      try {
        const res = await fetch(asset.url);
        if (!res.ok) return;
        const buffer = await res.arrayBuffer();
        const ext = asset.url.split(".").pop()?.split("?")[0] || "jpg";
        assetsFolder?.file(`${asset.kind.toLowerCase()}-${i}.${ext}`, buffer);
      } catch {
        // Skip assets that can't be fetched (e.g. mock placeholder URLs) rather than failing the whole export.
      }
    }),
  );

  zip.file(
    "README.txt",
    `Aneem Marketing Studio Export\nProduct: ${product.title}\nGenerated: ${new Date().toISOString()}\n\ncopy/ — generated captions, hashtags, descriptions, ad copy, campaigns\nreels/ — reel creative brief (scene-by-scene shot list)\nassets/ — uploaded and enhanced product images\n`,
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  await logFounderAction({ founderUserId: session.user.id, action: "marketing_studio.exported", entityType: "Product", entityId: productId });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="aneem-${product.slug}-marketing-kit.zip"`,
    },
  });
}
