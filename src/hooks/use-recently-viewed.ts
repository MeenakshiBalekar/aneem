"use client";

import { useEffect, useState } from "react";

export interface RecentlyViewedProduct {
  id: string;
  slug: string;
  title: string;
  price: number;
  imageUrl: string;
}

const STORAGE_KEY = "aneem-recently-viewed";
const MAX_ITEMS = 8;

export function trackRecentlyViewed(product: RecentlyViewedProduct) {
  if (typeof window === "undefined") return;
  try {
    const existing: RecentlyViewedProduct[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    const filtered = existing.filter((p) => p.id !== product.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([product, ...filtered].slice(0, MAX_ITEMS)));
  } catch {
    // localStorage unavailable (private browsing etc.) — non-critical, skip silently
  }
}

export function useRecentlyViewed(excludeId?: string) {
  const [items, setItems] = useState<RecentlyViewedProduct[]>([]);

  useEffect(() => {
    try {
      const existing: RecentlyViewedProduct[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      setItems(existing.filter((p) => p.id !== excludeId));
    } catch {
      setItems([]);
    }
  }, [excludeId]);

  return items;
}
