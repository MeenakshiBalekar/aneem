"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cart-store";
import { buttonVariants } from "@/components/ui/button";

interface ReorderItem {
  variantId: string;
  productId: string;
  slug: string;
  title: string;
  size: string;
  color: string | null;
  price: number;
  imageUrl: string;
  quantity: number;
  stock: number;
  isOutOfStock: boolean;
}

export function ReorderButton({ items }: { items: ReorderItem[] }) {
  const addLine = useCartStore((s) => s.addLine);
  const router = useRouter();

  function handleReorder() {
    const available = items.filter((i) => !i.isOutOfStock);
    if (available.length === 0) {
      toast.error("These items are no longer available");
      return;
    }
    for (const item of available) {
      addLine(
        {
          variantId: item.variantId,
          productId: item.productId,
          slug: item.slug,
          title: item.title,
          size: item.size,
          color: item.color,
          price: item.price,
          compareAtPrice: null,
          imageUrl: item.imageUrl,
          maxStock: item.stock,
        },
        item.quantity,
      );
    }
    toast.success("Added to bag");
    router.push("/cart");
  }

  return (
    <button onClick={handleReorder} className={buttonVariants({ variant: "outline", size: "md" })}>
      Reorder
    </button>
  );
}
