"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { Price } from "@/components/ui/price";

interface WishlistEntry {
  id: string;
  product: {
    id: string;
    slug: string;
    title: string;
    basePrice: string;
    compareAtPrice: string | null;
    images: { url: string }[];
  };
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  async function remove(productId: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
    await fetch("/api/wishlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black uppercase">Wishlist</h1>
      {loading ? (
        <p className="text-ink-400 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-ink-400 text-sm">Nothing saved yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((entry) => (
            <div key={entry.id} className="group relative">
              <button
                onClick={() => remove(entry.product.id)}
                className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center bg-white/90"
                aria-label="Remove"
              >
                <X size={14} />
              </button>
              <Link href={`/products/${entry.product.slug}`}>
                <div className="relative aspect-[4/5] overflow-hidden bg-ink-50">
                  <Image src={entry.product.images[0]?.url ?? ""} alt={entry.product.title} fill sizes="200px" className="object-cover" />
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-semibold">{entry.product.title}</p>
                <Price amount={Number(entry.product.basePrice)} compareAt={entry.product.compareAtPrice ? Number(entry.product.compareAtPrice) : null} size="sm" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
