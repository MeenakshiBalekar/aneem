"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { X, Upload, Plus } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import { PARENT_CATEGORIES, type ParentCategoryKey } from "@/lib/qikink/category-map";
import type { CategoryTreeOption } from "@/lib/founder/product-catalog";

const PARENT_OPTIONS = Object.entries(PARENT_CATEGORIES) as [ParentCategoryKey, { slug: string; name: string }][];

function autoSku(title: string, color: string, size: string): string {
  const prefix =
    title
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 6) || "SKU";
  const colorCode = color.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "COL";
  return `${prefix}-${colorCode}-${size}`.toUpperCase();
}

function ChipMultiSelect({
  label,
  suggestions,
  selected,
  onChange,
}: {
  label: string;
  suggestions: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  function addCustom() {
    const value = draft.trim();
    if (value && !selected.includes(value)) onChange([...selected, value]);
    setDraft("");
  }

  const extraSelected = selected.filter((s) => !suggestions.includes(s));

  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            className={`border px-2.5 py-1.5 text-xs ${
              selected.includes(s) ? "border-white bg-white text-black" : "border-white/15 text-white/70 hover:bg-white/5"
            }`}
          >
            {s}
          </button>
        ))}
        {extraSelected.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            className="border border-white bg-white px-2.5 py-1.5 text-xs text-black"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder={`Add a new ${label.toLowerCase()}…`}
          className="h-9 flex-1 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none"
        />
        <button type="button" onClick={addCustom} className="flex h-9 w-9 items-center justify-center border border-white/15 hover:bg-white/5">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function ColorImageSlot({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string, angle: "front" | "back", file: File | null) => void;
}) {
  const [previews, setPreviews] = useState<{ front?: string; back?: string }>({});

  function pick(angle: "front" | "back", file: File | undefined) {
    if (!file) return;
    setPreviews((prev) => ({ ...prev, [angle]: URL.createObjectURL(file) }));
    onChange(color, angle, file);
  }

  return (
    <div className="border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-2 text-xs font-bold uppercase text-white/70">{color}</p>
      <div className="grid grid-cols-2 gap-2">
        {(["front", "back"] as const).map((angle) => (
          <label key={angle} className="group relative block aspect-[4/5] cursor-pointer overflow-hidden border border-white/15 bg-white/[0.03]">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(angle, e.target.files?.[0])} />
            {previews[angle] ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, next/image can't optimize this
              <img src={previews[angle]} alt={`${color} ${angle}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-white/30">
                <Upload size={16} />
                <span className="text-[10px] capitalize">{angle}</span>
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

export function AddProductForm({
  categoryTree,
  suggestedColors,
  suggestedSizes,
}: {
  categoryTree: CategoryTreeOption[];
  suggestedColors: string[];
  suggestedSizes: string[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [parentSlug, setParentSlug] = useState<ParentCategoryKey>("men");
  const [categoryName, setCategoryName] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [basePrice, setBasePrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [initialStock, setInitialStock] = useState("50");
  const [skuOverrides, setSkuOverrides] = useState<Map<string, string>>(new Map());
  const [images, setImages] = useState<Map<string, { front?: File; back?: File }>>(new Map());
  const [saving, setSaving] = useState(false);

  const existingCategoryNames = useMemo(
    () => categoryTree.find((c) => c.name === PARENT_CATEGORIES[parentSlug].name)?.children.map((c) => c.name) ?? [],
    [categoryTree, parentSlug],
  );

  const variants = useMemo(() => {
    const rows: { color: string; size: string; sku: string }[] = [];
    for (const color of colors) {
      for (const size of sizes) {
        const key = `${color}|${size}`;
        rows.push({ color, size, sku: skuOverrides.get(key) ?? autoSku(title || "Product", color, size) });
      }
    }
    return rows;
  }, [colors, sizes, skuOverrides, title]);

  function updateSku(color: string, size: string, sku: string) {
    setSkuOverrides((prev) => new Map(prev).set(`${color}|${size}`, sku));
  }

  function updateImage(color: string, angle: "front" | "back", file: File | null) {
    setImages((prev) => {
      const next = new Map(prev);
      const entry = { ...(next.get(color) ?? {}) };
      if (file) entry[angle] = file;
      next.set(color, entry);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    if (!categoryName.trim()) return toast.error("Pick or type a category");
    if (colors.length === 0) return toast.error("Select at least one color");
    if (sizes.length === 0) return toast.error("Select at least one size");
    const price = Number(basePrice);
    if (!price || price <= 0) return toast.error("Enter a valid price");

    setSaving(true);
    const formData = new FormData();
    formData.append(
      "data",
      JSON.stringify({
        title,
        description,
        parentSlug,
        categoryName,
        basePrice: price,
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
        initialStock: Number(initialStock) || 0,
        variants,
      }),
    );
    for (const [color, entry] of Array.from(images)) {
      if (entry.front) formData.append(`front__${color}`, entry.front);
      if (entry.back) formData.append(`back__${color}`, entry.back);
    }

    const res = await founderFetch("/api/founder/products", { method: "POST", body: formData });
    const result = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      toast.error(result.error ?? "Couldn't create product");
      return;
    }
    toast.success(`"${title}" created with ${variants.length} SKUs`);
    if (result.imageWarnings?.length) {
      // Give this one time to actually be read — an immediate route change
      // right after can cut a normal-duration toast off before it lands.
      toast.error(result.imageWarnings.join(" · "), { duration: 8000 });
      setTimeout(() => {
        router.push("/founder/products");
        router.refresh();
      }, 2500);
      return;
    }
    router.push("/founder/products");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Classic Crew T-Shirt"
          className="h-11 w-full border border-white/15 bg-white/5 px-3 text-sm focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">Section</label>
        <div className="flex flex-wrap gap-1.5">
          {PARENT_OPTIONS.map(([key, def]) => (
            <button
              key={key}
              type="button"
              onClick={() => setParentSlug(key)}
              className={`border px-3 py-1.5 text-xs font-bold uppercase ${
                parentSlug === key ? "border-white bg-white text-black" : "border-white/15 text-white/70 hover:bg-white/5"
              }`}
            >
              {def.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">Category</label>
        <input
          list="existing-category-names"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="e.g. Jacket, T-Shirt, Oversized, Shirt…"
          className="h-11 w-full border border-white/15 bg-white/5 px-3 text-sm focus:outline-none"
        />
        <datalist id="existing-category-names">
          {existingCategoryNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className="mt-1 text-[11px] text-white/40">Type an existing category or a new one — new ones are created automatically.</p>
      </div>

      <ChipMultiSelect label="Colors" suggestions={suggestedColors} selected={colors} onChange={setColors} />
      <ChipMultiSelect label="Sizes" suggestions={suggestedSizes} selected={sizes} onChange={setSizes} />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">Price (₹)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            className="h-11 w-full border border-white/15 bg-white/5 px-3 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">Compare-at (optional)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={compareAtPrice}
            onChange={(e) => setCompareAtPrice(e.target.value)}
            className="h-11 w-full border border-white/15 bg-white/5 px-3 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">Initial stock / SKU</label>
          <input
            type="number"
            min="0"
            step="1"
            value={initialStock}
            onChange={(e) => setInitialStock(e.target.value)}
            className="h-11 w-full border border-white/15 bg-white/5 px-3 text-sm focus:outline-none"
          />
        </div>
      </div>

      {colors.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/60">Photos per color</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {colors.map((color) => (
              <ColorImageSlot key={color} color={color} onChange={updateImage} />
            ))}
          </div>
        </div>
      )}

      {variants.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/60">
            {variants.length} SKU{variants.length === 1 ? "" : "s"} will be created
          </label>
          <p className="mb-2 text-[11px] text-white/40">
            If you fulfill through Qikink, these SKUs need to match what Qikink has on file for this design — edit
            any of them before saving.
          </p>
          <div className="max-h-64 overflow-y-auto border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-black">
                <tr className="border-b border-white/10 text-white/50">
                  <th className="p-2 font-bold uppercase">Color</th>
                  <th className="p-2 font-bold uppercase">Size</th>
                  <th className="p-2 font-bold uppercase">SKU</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={`${v.color}|${v.size}`} className="border-b border-white/5">
                    <td className="p-2">{v.color}</td>
                    <td className="p-2">{v.size}</td>
                    <td className="p-2">
                      <input
                        value={v.sku}
                        onChange={(e) => updateSku(v.color, v.size, e.target.value)}
                        className="h-7 w-40 border border-white/15 bg-white/5 px-1.5 text-xs focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => router.push("/founder/products")}
          className="flex items-center gap-1.5 border border-white/15 px-4 py-2 text-xs font-bold uppercase hover:bg-white/5"
        >
          <X size={14} /> Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="border border-white/15 bg-white px-5 py-2 text-xs font-bold uppercase text-black hover:bg-white/90 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create Product"}
        </button>
      </div>
    </form>
  );
}
