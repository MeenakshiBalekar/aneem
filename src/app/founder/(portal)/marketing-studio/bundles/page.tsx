import { prisma } from "@/lib/prisma";
import { BundleCreativeList } from "@/components/founder/marketing-studio/bundle-creative-list";

export const metadata = { title: "AI Bundle Creator" };
export const dynamic = "force-dynamic";

export default async function MarketingStudioBundlesPage() {
  const bundles = await prisma.bundle.findMany({
    where: { isActive: true },
    include: { items: { include: { product: { select: { title: true } } } } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black">AI Bundle Creator</h1>
        <p className="mt-1 text-sm text-white/50">Generate marketing copy for your active bundles.</p>
      </div>
      <BundleCreativeList
        bundles={bundles.map((b) => ({
          id: b.id,
          name: b.name,
          discountPercent: b.discountPercent.toString(),
          itemNames: b.items.map((i) => i.product.title),
        }))}
      />
    </div>
  );
}
