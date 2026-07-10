"use client";

import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { X, Check } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import type { CategoryTreeOption } from "@/lib/founder/product-catalog";

export interface CatalogRow {
  id: string;
  title: string;
  qikinkProductId: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  tags: string[];
  isActive: boolean;
  images: { url: string }[];
  variants: { stock: number }[];
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const value = draft.trim().toLowerCase();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  }

  return (
    <div className="flex min-w-[180px] flex-wrap items-center gap-1 border border-white/15 bg-white/5 p-1.5">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px]">
          {tag}
          <button onClick={() => onChange(tags.filter((t) => t !== tag))} aria-label={`Remove ${tag}`}>
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
          }
        }}
        onBlur={addTag}
        placeholder="add tag..."
        className="min-w-[70px] flex-1 bg-transparent text-[11px] focus:outline-none"
      />
    </div>
  );
}

function ProductRow({ product, categoryTree }: { product: CatalogRow; categoryTree: CategoryTreeOption[] }) {
  const [categoryId, setCategoryId] = useState(product.categoryId ?? "");
  const [tags, setTags] = useState(product.tags);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ categoryId: string | null; isActive: boolean } | null>(null);

  const stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const isActive = saved ? saved.isActive : product.isActive;
  const dirty = categoryId !== (product.categoryId ?? "") || tags.join(",") !== product.tags.join(",");

  async function save() {
    setSaving(true);
    const res = await founderFetch(`/api/founder/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: categoryId || null, tags }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't save");
      return;
    }
    const updated = await res.json();
    setSaved({ categoryId: updated.categoryId, isActive: updated.isActive });
    toast.success(updated.isActive ? "Saved — now live on the storefront" : "Saved");
  }

  return (
    <tr className="border-b border-white/10">
      <td className="p-2">
        <div className="flex items-center gap-2">
          <div className="relative h-10 w-8 shrink-0 overflow-hidden border border-white/10 bg-white/5">
            {product.images[0] && <Image src={product.images[0].url} alt={product.title} fill sizes="32px" className="object-cover" />}
          </div>
          <div>
            <p className="line-clamp-1 max-w-[220px] text-xs font-semibold">{product.title}</p>
            <p className="text-[10px] text-white/30">Qikink #{product.qikinkProductId}</p>
          </div>
        </div>
      </td>
      <td className="p-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-9 w-56 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none"
        >
          <option value="" className="bg-[#0b0d12]">— Uncategorized —</option>
          {categoryTree.map((parent) => (
            <optgroup key={parent.id} label={parent.name} className="bg-[#0b0d12]">
              {parent.children.map((child) => (
                <option key={child.id} value={child.id} className="bg-[#0b0d12]">
                  {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </td>
      <td className="p-2">
        <TagInput tags={tags} onChange={setTags} />
      </td>
      <td className="p-2 text-center text-xs">{stock}</td>
      <td className="p-2">
        <span className={isActive ? "text-emerald-400 text-[11px] font-semibold" : "text-white/30 text-[11px]"}>
          {isActive ? "Live" : "Hidden"}
        </span>
      </td>
      <td className="p-2">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="bg-accent text-ink flex h-8 items-center gap-1 px-3 text-[11px] font-bold uppercase disabled:opacity-30"
        >
          <Check size={12} /> {saving ? "Saving..." : "Save"}
        </button>
      </td>
    </tr>
  );
}

export function ProductCategorizerTable({ products, categoryTree }: { products: CatalogRow[]; categoryTree: CategoryTreeOption[] }) {
  if (products.length === 0) {
    return <p className="p-6 text-center text-sm text-white/40">No products match this filter.</p>;
  }

  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full text-left">
        <thead className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wide text-white/40">
          <tr>
            <th className="p-2">Product</th>
            <th className="p-2">Category</th>
            <th className="p-2">Tags</th>
            <th className="p-2 text-center">Stock</th>
            <th className="p-2">Status</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <ProductRow key={p.id} product={p} categoryTree={categoryTree} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
