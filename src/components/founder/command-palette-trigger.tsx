"use client";

import { Search } from "lucide-react";

/** The header search box — a button that opens the command palette. It
 * dispatches a window event the palette listens for, so the two stay
 * decoupled (no shared context/provider just for this). */
export function CommandPaletteTrigger() {
  function open() {
    window.dispatchEvent(new Event("founder:open-command-palette"));
  }

  return (
    <button
      onClick={open}
      className="flex h-9 w-full max-w-md items-center gap-2 border border-white/15 bg-white/[0.03] px-3 text-sm text-white/40 hover:bg-white/5"
    >
      <Search size={15} />
      <span className="flex-1 text-left">Search products, orders, customers…</span>
      <kbd className="hidden rounded border border-white/15 px-1.5 py-0.5 text-[10px] sm:block">⌘K</kbd>
    </button>
  );
}
