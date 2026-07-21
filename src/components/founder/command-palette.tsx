"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  PhoneCall,
  ClipboardList,
  IndianRupee,
  Megaphone,
  Wand2,
  Boxes,
  Tags,
  Sparkles,
  ShieldCheck,
  Package,
  ShoppingCart,
  User,
  Plus,
  CornerDownLeft,
} from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import type { SearchHit } from "@/lib/founder/global-search";

interface NavCommand {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  keywords?: string;
}

const NAV_COMMANDS: NavCommand[] = [
  { label: "Dashboard", href: "/founder", icon: LayoutDashboard },
  { label: "Calling Queue", href: "/founder/calling-queue", icon: PhoneCall },
  { label: "Orders", href: "/founder/orders", icon: ClipboardList },
  { label: "Profit", href: "/founder/profit", icon: IndianRupee },
  { label: "Marketing", href: "/founder/marketing", icon: Megaphone },
  { label: "AI Marketing Studio", href: "/founder/marketing-studio", icon: Wand2 },
  { label: "Products", href: "/founder/products", icon: Tags },
  { label: "Add Product", href: "/founder/products/new", icon: Plus, keywords: "create new product" },
  { label: "Inventory", href: "/founder/inventory", icon: Boxes },
  { label: "AI Copilot", href: "/founder/copilot", icon: Sparkles },
  { label: "Security", href: "/founder/settings/security", icon: ShieldCheck, keywords: "settings 2fa password" },
];

const TYPE_ICON = { product: Package, order: ShoppingCart, customer: User } as const;

/** Founder command palette (⌘K / Ctrl-K). Jumps to any page or searches
 * products/orders/customers. Mounted once in the portal layout so it's
 * available on every founder page. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl-K toggles; also open on plain "/" when not already typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("founder:open-command-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("founder:open-command-palette", onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHits([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Debounced remote search.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await founderFetch(`/api/founder/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setHits(res.ok ? (data.hits ?? []) : []);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query, open]);

  const navMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_COMMANDS;
    return NAV_COMMANDS.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [query]);

  // Flat, ordered list of everything selectable, for keyboard nav.
  const items = useMemo(
    () => [
      ...navMatches.map((c) => ({ kind: "nav" as const, href: c.href, cmd: c })),
      ...hits.map((h) => ({ kind: "hit" as const, href: h.href, hit: h })),
    ],
    [navMatches, hits],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, hits]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) go(item.href);
    }
  }

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-[12vh]" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-xl overflow-hidden border border-white/15 bg-[#0b0d12] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4">
          <Search size={16} className="text-white/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search products, orders, customers — or jump to a page…"
            className="h-12 flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <kbd className="hidden rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/40 sm:block">esc</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto py-2">
          {navMatches.length > 0 && (
            <div className="mb-1">
              <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white/30">Go to</p>
              {navMatches.map((c) => {
                flatIndex++;
                const idx = flatIndex;
                const Icon = c.icon;
                return (
                  <button
                    key={c.href}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => go(c.href)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm ${activeIndex === idx ? "bg-white/10 text-white" : "text-white/70"}`}
                  >
                    <Icon size={15} className="shrink-0 text-white/40" />
                    <span className="flex-1">{c.label}</span>
                    {activeIndex === idx && <CornerDownLeft size={12} className="text-white/30" />}
                  </button>
                );
              })}
            </div>
          )}

          {query.trim().length >= 2 && (
            <div>
              <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
                {loading ? "Searching…" : hits.length ? "Results" : "No matches"}
              </p>
              {hits.map((h) => {
                flatIndex++;
                const idx = flatIndex;
                const Icon = TYPE_ICON[h.type];
                return (
                  <button
                    key={`${h.type}-${h.id}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => go(h.href)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-left ${activeIndex === idx ? "bg-white/10" : ""}`}
                  >
                    <Icon size={15} className="shrink-0 text-white/40" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">{h.title}</span>
                      <span className="block truncate text-[11px] text-white/40">{h.subtitle}</span>
                    </span>
                    <span className="text-[9px] uppercase tracking-wide text-white/30">{h.type}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-2 text-[10px] text-white/30">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span className="ml-auto">⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
