"use client";

import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { buttonVariants } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { FreeShippingBar } from "@/components/cart/free-shipping-bar";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const { lines, isDrawerOpen, closeDrawer, updateQuantity, removeLine, subtotal } = useCartStore();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 transition-opacity",
          isDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeDrawer}
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white transition-transform duration-300",
          isDrawerOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="border-ink-100 flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-bold uppercase">Your Bag ({lines.length})</h2>
          <button aria-label="Close cart" onClick={closeDrawer}>
            <X size={22} />
          </button>
        </div>

        <div className="border-ink-100 border-b px-5 py-4">
          <FreeShippingBar subtotal={subtotal()} />
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-ink-400">Your bag is empty.</p>
            <Link href="/collections/all" onClick={closeDrawer} className={buttonVariants({ variant: "primary", size: "md" })}>
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ul className="space-y-5">
              {lines.map((line) => (
                <li key={line.variantId} className="flex gap-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-ink-50">
                    <Image src={line.imageUrl} alt={line.title} fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <Link href={`/products/${line.slug}`} onClick={closeDrawer} className="text-sm font-semibold">
                        {line.title}
                      </Link>
                      <p className="text-ink-400 text-xs">
                        Size {line.size}
                        {line.color ? ` / ${line.color}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="border-ink-200 flex items-center border">
                        <button
                          className="p-1.5"
                          aria-label="Decrease quantity"
                          onClick={() => updateQuantity(line.variantId, line.quantity - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm">{line.quantity}</span>
                        <button
                          className="p-1.5"
                          aria-label="Increase quantity"
                          disabled={line.quantity >= line.maxStock}
                          onClick={() => updateQuantity(line.variantId, line.quantity + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-bold">{formatINR(line.price * line.quantity)}</span>
                    </div>
                  </div>
                  <button
                    aria-label="Remove item"
                    className="text-ink-400 self-start hover:text-red-600"
                    onClick={() => removeLine(line.variantId)}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {lines.length > 0 && (
          <div className="border-ink-100 space-y-3 border-t px-5 py-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-400">Subtotal</span>
              <span className="font-bold">{formatINR(subtotal())}</span>
            </div>
            <p className="text-ink-400 text-xs">Taxes and discounts calculated at checkout.</p>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
            >
              Checkout
            </Link>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="block text-center text-xs font-semibold uppercase underline underline-offset-4"
            >
              View full cart
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
