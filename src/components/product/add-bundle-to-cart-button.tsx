"use client";

import toast from "react-hot-toast";
import { useCartStore } from "@/store/cart-store";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BundleProductVariant {
  id: string;
  size: string;
  color: string | null;
  price: number;
  stock: number;
  isOutOfStock: boolean;
}

interface BundleProduct {
  productId: string;
  slug: string;
  title: string;
  imageUrl: string;
  variants: BundleProductVariant[];
}

export function AddBundleToCartButton({ products }: { products: BundleProduct[] }) {
  const addLine = useCartStore((s) => s.addLine);

  function handleAdd() {
    let addedAll = true;
    for (const product of products) {
      const variant = product.variants.find((v) => !v.isOutOfStock);
      if (!variant) {
        addedAll = false;
        continue;
      }
      addLine({
        variantId: variant.id,
        productId: product.productId,
        slug: product.slug,
        title: product.title,
        size: variant.size,
        color: variant.color,
        price: variant.price,
        compareAtPrice: null,
        imageUrl: product.imageUrl,
        maxStock: variant.stock,
      });
    }
    if (addedAll) {
      toast.success("Bundle added — discount applied automatically at checkout");
    } else {
      toast.error("Some bundle items are out of stock — added what's available");
    }
  }

  return (
    <button onClick={handleAdd} className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}>
      Add Full Bundle to Bag
    </button>
  );
}
