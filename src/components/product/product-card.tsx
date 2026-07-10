"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Heart } from "lucide-react";
import toast from "react-hot-toast";
import { Price } from "@/components/ui/price";
import { RatingStars } from "@/components/ui/rating-stars";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  basePrice: number;
  compareAtPrice: number | null;
  avgRating: number;
  reviewCount: number;
  isBestSeller: boolean;
  isNewArrival: boolean;
  images: { url: string; altText: string | null }[];
  variants: { stock: number }[];
}

export function ProductCard({ product, className }: { product: ProductCardData; className?: string }) {
  const [hovered, setHovered] = useState(false);
  const primaryImage = product.images[0]?.url ?? "https://picsum.photos/seed/placeholder/800/1000";
  const secondaryImage = product.images[1]?.url ?? primaryImage;
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const lowStock = totalStock > 0 && totalStock <= 8;

  return (
    <div
      className={cn("group relative", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink-50">
          <Image
            src={hovered ? secondaryImage : primaryImage}
            alt={product.images[0]?.altText ?? product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute left-2 top-2 flex flex-col gap-1.5">
            {product.isBestSeller && <Badge variant="accent">Bestseller</Badge>}
            {product.isNewArrival && <Badge variant="default">New</Badge>}
            {totalStock === 0 && <Badge variant="danger">Sold Out</Badge>}
            {lowStock && totalStock > 0 && <Badge variant="outline">Only {totalStock} left</Badge>}
          </div>
          <button
            aria-label="Add to wishlist"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center bg-white/90 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={async (e) => {
              e.preventDefault();
              const res = await fetch("/api/wishlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id }),
              });
              if (res.status === 401) toast.error("Sign in to save items");
              else if (res.ok) toast.success("Saved to wishlist");
            }}
          >
            <Heart size={16} />
          </button>
        </div>
        <div className="pt-3">
          <h3 className="line-clamp-1 text-sm font-semibold">{product.title}</h3>
          {product.reviewCount > 0 && <RatingStars rating={product.avgRating} count={product.reviewCount} />}
          <Price amount={product.basePrice} compareAt={product.compareAtPrice} size="sm" className="mt-1" />
        </div>
      </Link>
    </div>
  );
}
