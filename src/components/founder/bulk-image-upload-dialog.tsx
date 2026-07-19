"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ImagePlus, X, Trash2 } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import { slugify } from "@/lib/utils";
import type { ImageAssignmentProduct } from "@/lib/founder/product-catalog";

interface FileAssignment {
  id: string;
  file: File;
  previewUrl: string;
  productId: string | null;
}

/** Catalog imports (CSV/XLSX from Qikink's exports, or from their Mockup
 * Generator) never carry image files or URLs — this is how real photos
 * actually get onto product pages afterward: pick a batch of image files
 * downloaded from Qikink, assign each to a product (guessed from the
 * filename when it's an obvious match), upload sequentially. */
export function BulkImageUploadDialog({ products }: { products: ImageAssignmentProduct[] }) {
  const [open, setOpen] = useState(false);
  const [assignments, setAssignments] = useState<FileAssignment[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const titleToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) map.set(p.title, p.id);
    return map;
  }, [products]);

  function guessProductId(filename: string): string | null {
    const base = slugify(filename.replace(/\.[^.]+$/, ""));
    if (!base) return null;
    const match = products.find((p) => {
      const slug = slugify(p.title);
      return base.includes(slug) || slug.includes(base);
    });
    return match?.id ?? null;
  }

  function addFiles(files: FileList) {
    const next: FileAssignment[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: `${f.name}-${f.size}-${Math.random()}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        productId: guessProductId(f.name),
      }));
    setAssignments((prev) => [...prev, ...next]);
  }

  function removeAssignment(id: string) {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  function setProductForAssignment(id: string, productId: string | null) {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, productId } : a)));
  }

  function reset() {
    assignments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    setAssignments([]);
    setBusy(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function uploadAll() {
    const toUpload = assignments.filter((a) => a.productId);
    if (toUpload.length === 0) {
      toast.error("Assign at least one image to a product first");
      return;
    }

    setBusy(true);
    setProgress({ done: 0, total: toUpload.length });
    let succeeded = 0;
    const failures: string[] = [];

    for (let i = 0; i < toUpload.length; i++) {
      const a = toUpload[i];
      const formData = new FormData();
      formData.append("file", a.file);
      const res = await founderFetch(`/api/founder/products/${a.productId}/images`, { method: "POST", body: formData });
      if (res.ok) succeeded += 1;
      else failures.push(a.file.name);
      setProgress({ done: i + 1, total: toUpload.length });
    }

    setBusy(false);
    toast.success(`Uploaded ${succeeded} image${succeeded === 1 ? "" : "s"}`);
    if (failures.length > 0) toast.error(`${failures.length} failed: ${failures.slice(0, 3).join(", ")}${failures.length > 3 ? "…" : ""}`);
    close();
    router.refresh();
  }

  const unassignedCount = assignments.filter((a) => !a.productId).length;

  return (
    <>
      <datalist id="bulk-image-product-options">
        {products.map((p) => (
          <option key={p.id} value={p.title} />
        ))}
      </datalist>

      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-white/15 px-4 py-2 text-xs font-bold uppercase hover:bg-white/5"
      >
        <ImagePlus size={14} />
        Add Product Photos
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={close}>
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto border border-white/15 bg-black p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black uppercase">Add Product Photos</h3>
                <p className="mt-1 text-xs text-white/50">
                  Select the mockup images you downloaded from Qikink. We guess the product from the filename when we
                  can — check every row before uploading, and fix any that guessed wrong or came up unassigned.
                </p>
              </div>
              <button aria-label="Close" onClick={close}>
                <X size={18} />
              </button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={(e) => e.target.files && addFiles(e.target.files)}
              className="mb-4 block w-full border border-white/15 bg-white/[0.03] p-3 text-xs file:mr-3 file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:uppercase"
            />

            {assignments.length > 0 && (
              <>
                {unassignedCount > 0 && (
                  <p className="mb-3 text-xs text-yellow-500">{unassignedCount} image(s) not assigned to a product yet — they&apos;ll be skipped.</p>
                )}
                <div className="max-h-[45vh] space-y-2 overflow-y-auto">
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 border border-white/10 bg-white/[0.03] p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview URL, next/image can't optimize this */}
                      <img src={a.previewUrl} alt="" className="h-14 w-11 shrink-0 object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-white/50">{a.file.name}</p>
                        <input
                          list="bulk-image-product-options"
                          placeholder="Type to search product…"
                          defaultValue={a.productId ? products.find((p) => p.id === a.productId)?.title ?? "" : ""}
                          onChange={(e) => setProductForAssignment(a.id, titleToId.get(e.target.value) ?? null)}
                          className="mt-1 h-8 w-full border border-white/15 bg-white/5 px-2 text-xs focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removeAssignment(a.id)}
                        aria-label={`Remove ${a.file.name}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/15 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {busy && progress && (
              <div className="mt-4 space-y-1">
                <div className="h-1.5 w-full overflow-hidden bg-white/10">
                  <div
                    className="h-full bg-white transition-all"
                    style={{ width: `${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/50">Uploading {progress.done} / {progress.total}…</p>
              </div>
            )}

            {assignments.length > 0 && (
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={reset} disabled={busy} className="border border-white/15 px-4 py-2 text-xs font-bold uppercase hover:bg-white/5">
                  Clear
                </button>
                <button
                  onClick={uploadAll}
                  disabled={busy}
                  className="border border-white/15 bg-white px-4 py-2 text-xs font-bold uppercase text-black hover:bg-white/90 disabled:opacity-50"
                >
                  {busy ? "Uploading…" : `Upload ${assignments.filter((a) => a.productId).length} image(s)`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
