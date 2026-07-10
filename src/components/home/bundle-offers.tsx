import Link from "next/link";
import Image from "next/image";
import { SectionHeading } from "@/components/ui/section-heading";
import { computeBundlePrice } from "@/lib/bundles/engine";
import { formatINR } from "@/lib/utils";

interface BundleCard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  discountPercent: number;
  items: { quantity: number; product: { title: string; basePrice: unknown; images: { url: string }[] } }[];
}

export function BundleOffers({ bundles }: { bundles: BundleCard[] }) {
  if (bundles.length === 0) return null;

  return (
    <section className="container-aneem py-14 lg:py-20">
      <SectionHeading eyebrow="Buy More, Save More" title="Bundle Offers" subtitle="Curated kits that cost more apart than together." />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {bundles.map((bundle) => {
          const items = bundle.items.map((i) => ({ price: Number(i.product.basePrice), quantity: i.quantity }));
          const { fullPrice, bundlePrice, youSave } = computeBundlePrice(items, Number(bundle.discountPercent));

          return (
            <Link
              key={bundle.id}
              href={`/bundles/${bundle.slug}`}
              className="group border-ink-100 block overflow-hidden border"
            >
              <div className="relative flex aspect-[4/3] gap-1 bg-ink-50 p-1">
                {bundle.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="relative flex-1 overflow-hidden">
                    <Image
                      src={item.product.images[0]?.url ?? "https://picsum.photos/seed/bundle/600/600"}
                      alt={item.product.title}
                      fill
                      sizes="200px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ))}
                <span className="bg-accent text-ink absolute right-2 top-2 px-2 py-1 text-xs font-bold">
                  Save {Number(bundle.discountPercent)}%
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold uppercase">{bundle.name}</h3>
                <p className="text-ink-400 mt-1 text-xs">{bundle.description}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-lg font-black">{formatINR(bundlePrice)}</span>
                  <span className="text-ink-400 text-sm line-through">{formatINR(fullPrice)}</span>
                </div>
                <p className="text-xs font-semibold text-green-700">You save {formatINR(youSave)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
