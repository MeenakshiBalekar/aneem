import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "AI Marketing Studio" };
export const dynamic = "force-dynamic";

export default async function MarketingStudioPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      marketingProfile: true,
      _count: { select: { marketingContent: true, reelBriefs: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">AI Marketing Studio</h1>
          <p className="mt-1 text-sm text-white/50">
            Pick a product to generate captions, hashtags, ad copy, campaigns, a reel brief, and more — all in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/founder/marketing-studio/offers" className="border border-white/15 px-3 py-2 text-xs font-bold uppercase hover:bg-white/5">
            Offer Engine
          </Link>
          <Link href="/founder/marketing-studio/bundles" className="border border-white/15 px-3 py-2 text-xs font-bold uppercase hover:bg-white/5">
            Bundle Creator
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/founder/marketing-studio/${p.id}`}
            className="group border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/20"
          >
            <div className="relative mb-2 aspect-[4/5] overflow-hidden bg-white/5">
              {p.images[0] && (
                <Image src={p.images[0].url} alt={p.title} fill sizes="200px" className="object-cover" />
              )}
            </div>
            <p className="line-clamp-1 text-sm font-semibold">{p.title}</p>
            <p className="mt-1 text-[11px] text-white/40">
              {p.marketingProfile?.analyzedAt ? "Analyzed" : "Not analyzed"} · {p._count.marketingContent} generated
              {p._count.reelBriefs > 0 ? ` · ${p._count.reelBriefs} reel${p._count.reelBriefs > 1 ? "s" : ""}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
