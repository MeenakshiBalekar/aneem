import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number | string): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Human-friendly order numbers, e.g. ANEEM-100234
export function generateOrderNumber(): string {
  const base = 100000 + Math.floor(Math.random() * 899999);
  return `ANEEM-${base}`;
}

export function generateReferralCode(name?: string | null): string {
  const prefix = (name ?? "ANEEM").replace(/[^A-Za-z]/g, "").slice(0, 5).toUpperCase() || "ANEEM";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

export function isFreeShippingEligible(subtotal: number, threshold = 1499): boolean {
  return subtotal >= threshold;
}

export function amountRemainingForFreeShipping(subtotal: number, threshold = 1499): number {
  return Math.max(0, threshold - subtotal);
}
