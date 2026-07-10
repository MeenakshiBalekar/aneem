import type { Metadata } from "next";
import { BundleOffers } from "@/components/home/bundle-offers";
import { getActiveBundles } from "@/lib/bundles/engine";

export const metadata: Metadata = { title: "Bundles — Save More", alternates: { canonical: "/bundles" } };
export const revalidate = 300;

export default async function BundlesPage() {
  const bundles = await getActiveBundles();

  return (
    <div className="container-aneem py-10">
      <h1 className="mb-2 text-3xl font-black uppercase">Bundle Offers</h1>
      <p className="text-ink-400 mb-8">Curated kits, priced to beat buying separately.</p>
      <BundleOffers
        bundles={bundles.map((b) => ({
          id: b.id,
          slug: b.slug,
          name: b.name,
          description: b.description,
          discountPercent: Number(b.discountPercent),
          items: b.items.map((i) => ({ quantity: i.quantity, product: { title: i.product.title, basePrice: i.product.basePrice, images: i.product.images } })),
        }))}
      />
    </div>
  );
}
