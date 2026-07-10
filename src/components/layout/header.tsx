"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Search, User, Heart, ShoppingBag, X } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { cn } from "@/lib/utils";

interface NavCategory {
  name: string;
  slug: string;
}

export function Header({ categories }: { categories: NavCategory[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const totalQuantity = useCartStore((s) => s.totalQuantity());
  const openDrawer = useCartStore((s) => s.openDrawer);

  return (
    <header className="border-ink-100 sticky top-0 z-40 border-b bg-white">
      <div className="container-aneem flex h-16 items-center justify-between gap-4 lg:h-20">
        <button className="lg:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
          <Menu size={24} />
        </button>

        <Link href="/" className="text-2xl font-black uppercase tracking-tightest lg:text-3xl">
          Aneem
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              className="hover:text-accent-dark text-sm font-semibold uppercase tracking-wide transition-colors"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/style-assistant"
            className="hover:text-accent-dark text-sm font-semibold uppercase tracking-wide transition-colors"
          >
            Style Assistant
          </Link>
        </nav>

        <div className="flex items-center gap-4 lg:gap-5">
          <button aria-label="Search" className="hover:text-accent-dark hidden sm:block">
            <Search size={20} />
          </button>
          <Link href="/account/wishlist" aria-label="Wishlist" className="hover:text-accent-dark hidden sm:block">
            <Heart size={20} />
          </Link>
          <Link href="/account" aria-label="Account" className="hover:text-accent-dark hidden sm:block">
            <User size={20} />
          </Link>
          <button aria-label="Cart" className="relative" onClick={openDrawer}>
            <ShoppingBag size={20} />
            {totalQuantity > 0 && (
              <span className="bg-accent text-ink absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
                {totalQuantity}
              </span>
            )}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-white transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <span className="text-2xl font-black uppercase">Aneem</span>
          <button aria-label="Close menu" onClick={() => setMobileOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="flex flex-col p-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              onClick={() => setMobileOpen(false)}
              className="border-ink-100 border-b py-4 text-lg font-semibold uppercase"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/style-assistant"
            onClick={() => setMobileOpen(false)}
            className="border-ink-100 border-b py-4 text-lg font-semibold uppercase"
          >
            Style Assistant
          </Link>
          <Link href="/account" onClick={() => setMobileOpen(false)} className="py-4 text-lg font-semibold uppercase">
            My Account
          </Link>
        </nav>
      </div>
    </header>
  );
}
