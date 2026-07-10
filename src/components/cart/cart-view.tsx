"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, Gift } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatINR } from "@/lib/utils";
import { FreeShippingBar } from "@/components/cart/free-shipping-bar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductCard, type ProductCardData } from "@/components/product/product-card";
import type { DiscountEvaluation } from "@/lib/discounts/engine";

export function CartView({ upsells }: { upsells: ProductCardData[] }) {
  const { lines, updateQuantity, removeLine, subtotal } = useCartStore();
  const [couponCode, setCouponCode] = useState("");
  const [giftWrap, setGiftWrap] = useState(false);
  const [evaluation, setEvaluation] = useState<DiscountEvaluation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lines.length === 0) {
      setEvaluation(null);
      return;
    }
    setLoading(true);
    const quantities: Record<string, number> = {};
    lines.forEach((l) => (quantities[l.variantId] = l.quantity));

    fetch("/api/discounts/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantIds: lines.map((l) => l.variantId), quantities, couponCode: couponCode || undefined }),
    })
      .then((r) => r.json())
      .then(setEvaluation)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.map((l) => `${l.variantId}:${l.quantity}`).join(","), couponCode]);

  if (lines.length === 0) {
    return (
      <div className="container-aneem flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-ink-400">Your bag is empty.</p>
        <Link href="/collections/all" className={buttonVariants({ variant: "primary", size: "lg" })}>
          Start Shopping
        </Link>
      </div>
    );
  }

  const total = evaluation
    ? evaluation.subtotal - evaluation.totalDiscount + evaluation.shippingAmount
    : subtotal();

  return (
    <div className="container-aneem grid gap-10 py-10 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-6 text-2xl font-black uppercase">Your Bag</h1>
        <div className="border-ink-100 mb-6 border p-4">
          <FreeShippingBar subtotal={subtotal()} />
        </div>

        <ul className="divide-ink-100 divide-y">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-4 py-5">
              <div className="relative h-28 w-24 shrink-0 overflow-hidden bg-ink-50">
                <Image src={line.imageUrl} alt={line.title} fill sizes="100px" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between">
                  <div>
                    <Link href={`/products/${line.slug}`} className="font-semibold">
                      {line.title}
                    </Link>
                    <p className="text-ink-400 text-xs">
                      Size {line.size}
                      {line.color ? ` / ${line.color}` : ""}
                    </p>
                  </div>
                  <button aria-label="Remove" onClick={() => removeLine(line.variantId)} className="text-ink-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="border-ink-200 flex items-center border">
                    <button className="p-2" onClick={() => updateQuantity(line.variantId, line.quantity - 1)}>
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm">{line.quantity}</span>
                    <button
                      className="p-2"
                      disabled={line.quantity >= line.maxStock}
                      onClick={() => updateQuantity(line.variantId, line.quantity + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-bold">{formatINR(line.price * line.quantity)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <label className="mt-6 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} />
          <Gift size={16} /> Add gift wrapping (+₹49)
        </label>

        {upsells.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-lg font-black uppercase">You Might Also Like</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {upsells.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-ink-100 h-fit border p-6">
        <h2 className="mb-4 text-lg font-black uppercase">Order Summary</h2>
        <div className="mb-3 flex gap-2">
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="Coupon code"
            className="border-ink-200 h-10 flex-1 border px-3 text-sm focus:outline-none"
          />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-400">Subtotal</span>
            <span>{formatINR(evaluation?.subtotal ?? subtotal())}</span>
          </div>
          {evaluation?.discounts.map((d, i) => (
            <div key={i} className="flex justify-between text-green-700">
              <span>{d.label}</span>
              <span>-{formatINR(d.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between">
            <span className="text-ink-400">Shipping</span>
            <span>{evaluation?.shippingAmount ? formatINR(evaluation.shippingAmount) : "FREE"}</span>
          </div>
          {giftWrap && (
            <div className="flex justify-between">
              <span className="text-ink-400">Gift Wrap</span>
              <span>{formatINR(49)}</span>
            </div>
          )}
        </div>

        <div className="border-ink-100 mt-4 flex justify-between border-t pt-4 text-lg font-bold">
          <span>Total</span>
          <span>{formatINR(total + (giftWrap ? 49 : 0))}</span>
        </div>

        <Link href="/checkout" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-6 w-full")}>
          {loading ? "Calculating..." : "Proceed to Checkout"}
        </Link>
      </div>
    </div>
  );
}
