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
    { name: "aneem-cart" },
  ),
);
