"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowUp, ArrowDown, Trash2, Eye, EyeOff, FolderInput, X } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import type { CategoryTreeOption } from "@/lib/founder/product-catalog";

export interface ProductListRow {
  id: string;
  title: string;
  qikinkProductId: string;
  category: { id: string; name: string } | null;
  isActive: boolean;
  basePrice: number;
  updatedAt: string;
  images: { url: string }[];
  variants: { stock: number }[];
}

type SortKey = "updated" | "title" | "title_desc" | "price" | "price_desc";

function SortableHeader({ label, asc, desc }: { label: string; asc: SortKey; desc: SortKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("sort") ?? "updated") as SortKey;
  const next: SortKey = current === asc ? desc : asc;

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", next);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <button onClick={apply} className="flex items-center gap-1 uppercase hover:text-white">
      {label}
      {current === asc && <ArrowUp size={11} />}
      {current === desc && <ArrowDown size={11} />}
    </button>
  );
}

/** Shopify-style products list: checkbox selection with a bulk-action bar
 * (activate / draft / set category / delete), sortable columns, rows
 * linking to the full edit page. Per-row editing lives on the edit page —
 * the list is for scanning and acting in bulk. */
export function ProductListTable({ products, categoryTree }: { products: ProductListRow[]; categoryTree: CategoryTreeOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(action: "activate" | "draft" | "delete" | "set_category", categoryId?: string | null) {
    if (action === "delete" && !window.confirm(`Delete ${selectedIds.length} product(s) permanently? Products with order history are skipped.`)) {
      return;
    }
    setBusy(true);
    const res = await founderFetch("/api/founder/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, productIds: selectedIds, categoryId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setCategoryPickerOpen(false);

    if (!res.ok) {
      toast.error(data.error ?? "Bulk action failed");
      return;
    }
    const verb = { activate: "Activated", draft: "Set to draft", delete: "Deleted", set_category: "Categorized" }[action];
    toast.success(`${verb} ${data.affected} product(s)${data.skipped ? ` — ${data.skipped} skipped (order history)` : ""}`);
    setSelected(new Set());
    router.refresh();
  }

  if (products.length === 0) {
    return <p className="p-6 text-center text-sm text-white/40">No products match this filter.</p>;
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 border border-white/15 bg-white/[0.05] px-3 py-2">
          <span className="text-xs font-bold">{selected.size} selected</span>
          <button
            onClick={() => runBulk("activate")}
            disabled={busy}
            className="flex items-center gap-1 border border-white/15 px-2.5 py-1.5 text-[11px] font-bold uppercase hover:bg-white/5 disabled:opacity-50"
          >
            <Eye size={11} /> Activate
          </button>
          <button
            onClick={() => runBulk("draft")}
            disabled={busy}
            className="flex items-center gap-1 border border-white/15 px-2.5 py-1.5 text-[11px] font-bold uppercase hover:bg-white/5 disabled:opacity-50"
          >
            <EyeOff size={11} /> Draft
          </button>
          <div className="relative">
            <button
              onClick={() => setCategoryPickerOpen((v) => !v)}
              disabled={busy}
              className="flex items-center gap-1 border border-white/15 px-2.5 py-1.5 text-[11px] font-bold uppercase hover:bg-white/5 disabled:opacity-50"
            >
              <FolderInput size={11} /> Set category
            </button>
            {categoryPickerOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-56 overflow-y-auto border border-white/15 bg-[#0b0d12] py-1 shadow-xl">
                <button
                  onClick={() => runBulk("set_category", null)}
                  className="block w-full px-3 py-1.5 text-left text-xs text-white/60 hover:bg-white/10"
                >
                  — Uncategorized —
                </button>
                {categoryTree.map((parent) => (
                  <div key={parent.id}>
                    <p className="px-3 pt-2 text-[9px] font-bold uppercase tracking-widest text-white/30">{parent.name}</p>
                    {parent.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => runBulk("set_category", child.id)}
                        className="block w-full px-3 py-1.5 text-left text-xs hover:bg-white/10"
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => runBulk("delete")}
            disabled={busy}
            className="flex items-center gap-1 border border-red-500/30 px-2.5 py-1.5 text-[11px] font-bold uppercase text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            <Trash2 size={11} /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-white/40 hover:text-white" aria-label="Clear selection">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="overflow-x-auto border border-white/10">
        <table className="w-full text-left">
          <thead className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wide text-white/40">
            <tr>
              <th className="w-8 p-2">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th className="p-2">
                <SortableHeader label="Product" asc="title" desc="title_desc" />
              </th>
              <th className="p-2">Status</th>
              <th className="p-2">Inventory</th>
              <th className="p-2">Category</th>
              <th className="p-2">
                <SortableHeader label="Price" asc="price" desc="price_desc" />
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const stock = p.variants.reduce((sum, v) => sum + v.stock, 0);
              return (
                <tr key={p.id} className={`border-b border-white/10 ${selected.has(p.id) ? "bg-white/[0.04]" : ""}`}>
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`Select ${p.title}`}
                    />
                  </td>
                  <td className="p-2">
                    <Link href={`/founder/products/${p.id}`} className="flex items-center gap-2 hover:opacity-80">
                      <div className="relative h-10 w-8 shrink-0 overflow-hidden border border-white/10 bg-white/5">
                        {p.images[0] && <Image src={p.images[0].url} alt={p.title} fill sizes="32px" className="object-cover" />}
                      </div>
                      <div>
                        <p className="line-clamp-1 max-w-[260px] text-xs font-semibold underline-offset-2 hover:underline">{p.title}</p>
                        <p className="text-[10px] text-white/30">{p.qikinkProductId}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="p-2">
                    <span
                      className={
                        p.isActive
                          ? "border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400"
                          : "border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50"
                      }
                    >
                      {p.isActive ? "Active" : "Draft"}
                    </span>
                  </td>
                  <td className="p-2 text-xs">
                    <span className={stock === 0 ? "text-red-400" : ""}>
                      {stock} in stock
                    </span>
                    <span className="text-white/40"> · {p.variants.length} variant{p.variants.length === 1 ? "" : "s"}</span>
                  </td>
                  <td className="p-2 text-xs text-white/60">{p.category?.name ?? <span className="text-orange-400/80">Uncategorized</span>}</td>
                  <td className="p-2 text-xs">₹{p.basePrice}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
