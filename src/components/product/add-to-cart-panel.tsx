"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cart-store";
import { cn, formatINR } from "@/lib/utils";
import { Price } from "@/components/ui/price";
import { SizeGuideModal } from "@/components/product/size-guide-modal";

export interface VariantOption {
  id: string;
  size: string;
  color: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  isOutOfStock: boolean;
}

export function AddToCartPanel({
  productId,
  slug,
  title,
  imageUrl,
  variants,
}: {
  productId: string;
  slug: string;
  title: string;
  imageUrl: string;
  variants: VariantOption[];
}) {
  const [selectedId, setSelectedId] = useState(variants.find((v) => !v.isOutOfStock)?.id ?? variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [showSticky, setShowSticky] = useState(false);
  const addLine = useCartStore((s) => s.addLine);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 480);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleAdd() {
    if (!selected || selected.isOutOfStock) return toast.error("This size is out of stock");
    addLine(
      {
        variantId: selected.id,
        productId,
        slug,
        title,
        size: selected.size,
        color: selected.color,
        price: selected.price,
        compareAtPrice: selected.compareAtPrice,
        imageUrl,
        maxStock: selected.stock,
      },
      quantity,
    );
    toast.success("Added to bag");
  }

  const outOfStock = !selected || selected.isOutOfStock;

  return (
    <div>
      <Price amount={selected?.price ?? 0} compareAt={selected?.compareAtPrice} size="lg" />

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase">Select Size</span>
          <SizeGuideModal />
        </div>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              disabled={v.isOutOfStock}
              onClick={() => setSelectedId(v.id)}
              className={cn(
                "flex h-11 min-w-11 items-center justify-center border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-30",
                selectedId === v.id ? "border-ink bg-ink text-white" : "border-ink-200",
              )}
            >
              {v.size}
            </button>
          ))}
        </div>
        {selected && selected.stock > 0 && selected.stock <= 8 && (
          <p className="mt-2 text-xs font-semibold text-red-600">Only {selected.stock} left in stock</p>
        )}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="border-ink-200 flex h-12 items-center border">
          <button className="w-10" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
            −
          </button>
          <span className="w-8 text-center">{quantity}</span>
          <button className="w-10" onClick={() => setQuantity((q) => Math.min(selected?.stock ?? 1, q + 1))}>
            +
          </button>
        </div>
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className="bg-ink h-12 flex-1 text-sm font-bold uppercase tracking-wide text-white disabled:bg-ink-200"
        >
          {outOfStock ? "Out of Stock" : "Add to Bag"}
        </button>
      </div>

      <div
        className={cn(
          "border-ink-100 fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t bg-white p-4 transition-transform lg:hidden",
          showSticky ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex-1">
          <p className="line-clamp-1 text-xs font-semibold">{title}</p>
          <span className="text-sm font-bold">{formatINR(selected?.price ?? 0)}</span>
        </div>
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className="bg-ink px-6 py-3 text-xs font-bold uppercase text-white disabled:bg-ink-200"
        >
          {outOfStock ? "Sold Out" : "Add to Bag"}
        </button>
      </div>
    </div>
  );
}
