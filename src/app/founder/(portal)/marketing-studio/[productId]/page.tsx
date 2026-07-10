import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AssetUploader } from "@/components/founder/marketing-studio/asset-uploader";
import { AnalysisPanel } from "@/components/founder/marketing-studio/analysis-panel";
import { ReelGeneratorPanel } from "@/components/founder/marketing-studio/reel-generator-panel";
import { ContentGeneratorPanel } from "@/components/founder/marketing-studio/content-generator-panel";
import { VisualsPanel } from "@/components/founder/marketing-studio/visuals-panel";
import { ExportButton } from "@/components/founder/marketing-studio/export-button";

export const dynamic = "force-dynamic";

export default async function MarketingStudioProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      marketingProfile: true,
      marketingAssets: { orderBy: { createdAt: "desc" } },
      marketingContent: { orderBy: { createdAt: "desc" } },
      reelBriefs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!product) notFound();

  const latestContentByType = Object.values(
    product.marketingContent.reduce<Record<string, (typeof product.marketingContent)[number]>>((acc, c) => {
      if (!acc[c.type]) acc[c.type] = c;
      return acc;
    }, {}),
  );

  const latestReel = product.reelBriefs[0] ?? null;

  return (
    <div>
      <Link href="/founder/marketing-studio" className="mb-4 flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
        <ArrowLeft size={14} /> All products
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-14 shrink-0 overflow-hidden border border-white/10 bg-white/5">
            {product.images[0] && (
              <Image src={product.images[0].url} alt={product.title} fill sizes="60px" className="object-cover" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-black">{product.title}</h1>
            <p className="text-xs text-white/40">AI Marketing Studio</p>
          </div>
        </div>
        <ExportButton productId={product.id} />
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Source Images</h2>
          <AssetUploader
            productId={product.id}
            initialAssets={product.marketingAssets
              .filter((a) => a.kind.startsWith("SOURCE_"))
              .map((a) => ({ id: a.id, kind: a.kind, url: a.url }))}
          />
        </section>

        <AnalysisPanel
          productId={product.id}
          initialProfile={
            product.marketingProfile
              ? {
                  typographyStyle: product.marketingProfile.typographyStyle,
                  mood: product.marketingProfile.mood,
                  aesthetic: product.marketingProfile.aesthetic,
                  positioning: product.marketingProfile.positioning,
                  targetAudience: product.marketingProfile.targetAudience,
                  colorPalette: product.marketingProfile.colorPalette,
                  designLanguage: product.marketingProfile.designLanguage,
                  analyzedAt: product.marketingProfile.analyzedAt ? product.marketingProfile.analyzedAt.toISOString() : null,
                }
              : null
          }
        />

        <ReelGeneratorPanel
          productId={product.id}
          initialReel={
            latestReel
              ? {
                  id: latestReel.id,
                  status: latestReel.status,
                  scenes: latestReel.scenes as never,
                  voiceOption: latestReel.voiceOption,
                  voiceoverScript: latestReel.voiceoverScript,
                  musicSuggestion: latestReel.musicSuggestion as never,
                  videoUrl: latestReel.videoUrl,
                  isMock: latestReel.isMock,
                }
              : null
          }
        />

        <ContentGeneratorPanel
          productId={product.id}
          initialContent={latestContentByType.map((c) => ({
            id: c.id,
            type: c.type,
            content: c.content,
            score: c.score as never,
            isMock: c.isMock,
            createdAt: c.createdAt.toISOString(),
          }))}
        />

        <VisualsPanel
          productId={product.id}
          initialAssets={product.marketingAssets.map((a) => ({ id: a.id, kind: a.kind, url: a.url }))}
        />
      </div>
    </div>
  );
}
