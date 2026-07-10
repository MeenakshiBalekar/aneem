"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { trackRecentlyViewed, useRecentlyViewed, type RecentlyViewedProduct } from "@/hooks/use-recently-viewed";
import { Price } from "@/components/ui/price";

export function RecentlyViewedTracker({ product }: { product: RecentlyViewedProduct }) {
  useEffect(() => {
    trackRecentlyViewed(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);
  return null;
}

export function RecentlyViewed({ excludeId }: { excludeId: string }) {
  const items = useRecentlyViewed(excludeId);
  if (items.length === 0) return null;

  return (
    <section className="container-aneem py-14">
      <h2 className="mb-6 text-xl font-black uppercase">Recently Viewed</h2>
      <div className="no-scrollbar flex gap-4 overflow-x-auto">
        {items.map((p) => (
          <Link key={p.id} href={`/products/${p.slug}`} className="w-32 shrink-0">
            <div className="relative aspect-[4/5] overflow-hidden bg-ink-50">
              <Image src={p.imageUrl} alt={p.title} fill sizes="128px" className="object-cover" />
            </div>
            <p className="mt-2 line-clamp-1 text-xs font-semibold">{p.title}</p>
            <Price amount={p.price} size="sm" />
          </Link>
        ))}
      </div>
    </section>
  );
}
