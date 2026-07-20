"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2, Upload, ExternalLink } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import type { CategoryTreeOption } from "@/lib/founder/product-catalog";

interface ProductImage {
  id: string;
  url: string;
  color: string | null;
}

interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string | null;
  price: number;
  stock: number;
}

interface EditableProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  isActive: boolean;
  tags: string[];
  qikinkProductId: string;
  images: ProductImage[];
  variants: ProductVariant[];
}

export function ProductEditForm({ product, categoryTree }: { product: EditableProduct; categoryTree: CategoryTreeOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description);
  const [categoryId, setCategoryId] = useState(product.categoryId ?? "");
  const [basePrice, setBasePrice] = useState(String(product.basePrice));
  const [compareAtPrice, setCompareAtPrice] = useState(product.compareAtPrice ? String(product.compareAtPrice) : "");
  const [isActive, setIsActive] = useState(product.isActive);
  const [tags, setTags] = useState<string[]>(product.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [images, setImages] = useState<ProductImage[]>(product.images);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function save() {
    if (!title.trim()) return toast.error("Title can't be empty");
    const price = Number(basePrice);
    if (!price || price <= 0) return toast.error("Enter a valid price");

    setSaving(true);
    const res = await founderFetch(`/api/founder/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        categoryId: categoryId || null,
        basePrice: price,
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
        isActive,
        tags,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't save");
      return;
    }
    toast.success("Saved");
    router.refresh();
  }

  async function addImages(files: FileList) {
    setUploading(true);
    const added: ProductImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const formData = new FormData();
      formData.append("file", file);
      const res = await founderFetch(`/api/founder/products/${product.id}/images`, { method: "POST", body: formData });
      if (res.ok) {
        const img = await res.json();
        added.push({ id: img.id, url: img.url, color: img.color ?? null });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? `Couldn't upload ${file.name}`);
      }
    }
    setImages((prev) => [...prev, ...added]);
    setUploading(false);
    if (added.length) toast.success(`Added ${added.length} image${added.length === 1 ? "" : "s"}`);
  }

  async function removeImage(imageId: string) {
    const res = await founderFetch(`/api/founder/products/${product.id}/images/${imageId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Couldn't remove image");
      return;
    }
    setImages((prev) => prev.filter((i) => i.id !== imageId));
    toast.success("Image removed");
  }

  function addTag() {
    const value = tagDraft.trim().toLowerCase();
    if (value && !tags.includes(value)) setTags([...tags, value]);
    setTagDraft("");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black">{title || "Untitled product"}</h1>
          <span className={isActive ? "text-[11px] font-semibold text-emerald-400" : "text-[11px] text-white/40"}>
            {isActive ? "Active" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <a
              href={`/products/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 border border-white/15 px-3 py-2 text-xs font-bold uppercase hover:bg-white/5"
            >
              <ExternalLink size={12} /> View
            </a>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="border border-white/15 bg-white px-5 py-2 text-xs font-bold uppercase text-black hover:bg-white/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 lg:col-span-2">
          <section className="border border-white/10 bg-white/[0.03] p-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-4 h-11 w-full border border-white/15 bg-white/5 px-3 text-sm focus:outline-none"
            />
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none"
            />
          </section>

          <section className="border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide">Media</h2>
              <label className="flex cursor-pointer items-center gap-1.5 border border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase hover:bg-white/5">
                <Upload size={12} /> {uploading ? "Uploading…" : "Add images"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  className="hidden"
                  onChange={(e) => e.target.files && addImages(e.target.files)}
                />
              </label>
            </div>
            {images.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/40">No images yet — add product photos above.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((img, i) => (
                  <div key={img.id} className="group relative aspect-[4/5] overflow-hidden border border-white/10 bg-white/5">
                    <Image src={img.url} alt={img.color ?? title} fill sizes="150px" className="object-cover" />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 bg-black/70 px-1.5 py-0.5 text-[9px] uppercase text-white/80">Primary</span>
                    )}
                    {img.color && (
                      <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 text-[9px] text-white/80">{img.color}</span>
                    )}
                    <button
                      onClick={() => removeImage(img.id)}
                      aria-label="Remove image"
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-black/70 text-red-400 opacity-0 transition-opacity hover:bg-red-500/30 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[10px] text-white/40">The first image is the primary one shown on the storefront.</p>
          </section>

          <section className="border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Variants ({product.variants.length})</h2>
            <div className="max-h-72 overflow-y-auto border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-black">
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="p-2 font-bold uppercase">Color</th>
                    <th className="p-2 font-bold uppercase">Size</th>
                    <th className="p-2 font-bold uppercase">SKU</th>
                    <th className="p-2 font-bold uppercase">Price</th>
                    <th className="p-2 font-bold uppercase">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((v) => (
                    <tr key={v.id} className="border-b border-white/5">
                      <td className="p-2">{v.color ?? "—"}</td>
                      <td className="p-2">{v.size}</td>
                      <td className="p-2 text-white/60">{v.sku}</td>
                      <td className="p-2">₹{v.price}</td>
                      <td className="p-2">{v.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] text-white/40">
              Editing individual variant stock/price/SKU inline is coming in a later pass — for now these are managed via
              import/sync.
            </p>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <section className="border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/60">Status</h2>
            <select
              value={isActive ? "active" : "draft"}
              onChange={(e) => setIsActive(e.target.value === "active")}
              className="h-10 w-full border border-white/15 bg-white/5 px-2 text-sm focus:outline-none"
            >
              <option value="active" className="bg-[#0b0d12]">Active (live on storefront)</option>
              <option value="draft" className="bg-[#0b0d12]">Draft (hidden)</option>
            </select>
          </section>

          <section className="border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/60">Category</h2>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 w-full border border-white/15 bg-white/5 px-2 text-sm focus:outline-none"
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
          </section>

          <section className="border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/60">Pricing</h2>
            <label className="mb-1 block text-[10px] uppercase text-white/40">Price (₹)</label>
            <input
              type="number"
              min="0"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="mb-3 h-10 w-full border border-white/15 bg-white/5 px-3 text-sm focus:outline-none"
            />
            <label className="mb-1 block text-[10px] uppercase text-white/40">Compare-at price (optional)</label>
            <input
              type="number"
              min="0"
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
              className="h-10 w-full border border-white/15 bg-white/5 px-3 text-sm focus:outline-none"
            />
          </section>

          <section className="border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/60">Tags</h2>
            <div className="mb-2 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px]">
                  {tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))} aria-label={`Remove ${tag}`}>
                    <Trash2 size={9} />
                  </button>
                </span>
              ))}
            </div>
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
              placeholder="add tag…"
              className="h-9 w-full border border-white/15 bg-white/5 px-2 text-xs focus:outline-none"
            />
          </section>

          <section className="border border-white/10 bg-white/[0.03] p-4 text-[11px] text-white/40">
            <p>
              <span className="text-white/60">Qikink ID:</span> {product.qikinkProductId}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
