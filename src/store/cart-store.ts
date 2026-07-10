"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  title: string;
  size: string;
  color?: string | null;
  price: number;
  compareAtPrice?: number | null;
  imageUrl: string;
  quantity: number;
  maxStock: number;
}

interface CartState {
  lines: CartLine[];
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addLine: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeLine: (variantId: string) => void;
  clear: () => void;
  subtotal: () => number;
  totalQuantity: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isDrawerOpen: false,
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      addLine: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.variantId === line.variantId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.variantId === line.variantId
                  ? { ...l, quantity: Math.min(l.quantity + quantity, l.maxStock) }
                  : l,
              ),
              isDrawerOpen: true,
            };
          }
          return { lines: [...state.lines, { ...line, quantity }], isDrawerOpen: true };
        }),
      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.variantId !== variantId)
              : state.lines.map((l) => (l.variantId === variantId ? { ...l, quantity } : l)),
        })),
      removeLine: (variantId) => set((state) => ({ lines: state.lines.filter((l) => l.variantId !== variantId) })),
      clear: () => set({ lines: [] }),
      subtotal: () => get().lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      totalQuantity: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
    }),
    {
      name: "aneem-cart",
      // Server has no localStorage, so SSR always renders an empty cart.
      // Auto-hydrating on the client would make that first client render
      // diverge from the server markup (React hydration error). Instead we
      // skip hydration here and trigger it explicitly post-mount — see
      // CartHydration in providers.tsx — so client and server agree on the
      // very first paint, then the real cart appears a tick later.
      skipHydration: true,
      // Only cart contents should survive a reload — isDrawerOpen is UI
      // state, not data, and persisting it would reopen the drawer on every
      // fresh page load if it happened to be open when the tab last closed.
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);
