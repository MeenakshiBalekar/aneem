"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Upload, X, AlertTriangle } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";

interface PreviewGroup {
  title: string;
  categoryName: string;
  genderName: string;
  variantCount: number;
  colors: string[];
  sizes: string[];
  basePrice: number;
}

interface PreviewResult {
  dryRun: true;
  totalRows: number;
  importedRows: number;
  productCount: number;
  variantCount: number;
  rowErrors: { rowNumber: number; sku?: string; errors: string[] }[];
  rowErrorCount: number;
  sampleGroups: PreviewGroup[];
}

interface CommitResult {
  dryRun: false;
  done: boolean;
  nextOffset: number;
  totalGroups: number;
  productCount: number;
  productsCreated: number;
  variantsCreated: number;
  variantsUpdated: number;
  variantErrors: { sku: string; error: string; product: string }[];
  rowErrorCount: number;
}

const CHUNK_SIZE = 20; // product groups per request — matches the server's expectation, keeps each call fast

/** Qikink has no products API — the real catalog comes in from a founder-
 * exported SKU sheet instead (see .env.example / src/lib/qikink/client.ts).
 * This is a preview-then-commit flow: parse client-side-selected file with
 * dryRun=true first so the founder can catch a bad column mapping before
 * anything touches the database, then resubmit the same file to commit. */
export function CatalogImportDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setFile(null);
    setPreview(null);
    setBusy(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function runPreview(selected: File) {
    setBusy(true);
    setPreview(null);
    const formData = new FormData();
    formData.append("file", selected);
    formData.append("dryRun", "true");

    const res = await founderFetch("/api/founder/products/import", { method: "POST", body: formData });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      toast.error(data.error ?? "Couldn't read that file");
      return;
    }
    setPreview(data as PreviewResult);
  }

  async function commitImport() {
    if (!file) return;
    setBusy(true);
    setProgress({ done: 0, total: preview?.productCount ?? 0 });

    let offset = 0;
    let totalProductsCreated = 0;
    let totalVariantsCreated = 0;
    let totalVariantsUpdated = 0;
    let totalErrors = 0;

    for (;;) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dryRun", "false");
      formData.append("offset", String(offset));
      formData.append("chunkSize", String(CHUNK_SIZE));

      const res = await founderFetch("/api/founder/products/import", { method: "POST", body: formData });
      const data = (await res.json()) as CommitResult & { error?: string };

      if (!res.ok) {
        setBusy(false);
        toast.error(data.error ?? `Import failed after ${offset} products — safe to retry, already-imported ones are untouched`);
        return;
      }

      totalProductsCreated += data.productsCreated;
      totalVariantsCreated += data.variantsCreated;
      totalVariantsUpdated += data.variantsUpdated;
      totalErrors += data.variantErrors.length + data.rowErrorCount;
      setProgress({ done: data.nextOffset, total: data.totalGroups });

      if (data.done) break;
      offset = data.nextOffset;
    }

    setBusy(false);
    toast.success(
      `Imported ${totalProductsCreated} new products, ${totalVariantsCreated} new SKUs, ${totalVariantsUpdated} updated`,
    );
    if (totalErrors > 0) {
      toast.error(`${totalErrors} rows had problems — see server logs`);
    }
    close();
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-white/15 px-4 py-2 text-xs font-bold uppercase hover:bg-white/5"
      >
        <Upload size={14} />
        Import Catalog
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={close}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-white/15 bg-black p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black uppercase">Import Catalog</h3>
                <p className="mt-1 text-xs text-white/50">
                  Upload a CSV or XLSX SKU sheet (columns: SKU, Product Description, Category Name, Gender Name, Color
                  Name, Base Price, and optionally Size / Shipping Weight / Tax Rate %).
                </p>
              </div>
              <button aria-label="Close" onClick={close}>
                <X size={18} />
              </button>
            </div>

            {!preview && (
              <div className="space-y-4">
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  disabled={busy}
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (!selected) return;
                    setFile(selected);
                    runPreview(selected);
                  }}
                  className="block w-full border border-white/15 bg-white/[0.03] p-3 text-xs file:mr-3 file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:uppercase"
                />
                {busy && <p className="text-xs text-white/50">Parsing…</p>}
              </div>
            )}

            {preview && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="border border-white/15 p-3">
                    <div className="text-2xl font-black">{preview.productCount}</div>
                    <div className="text-[10px] uppercase text-white/50">Products</div>
                  </div>
                  <div className="border border-white/15 p-3">
                    <div className="text-2xl font-black">{preview.variantCount}</div>
                    <div className="text-[10px] uppercase text-white/50">SKUs</div>
                  </div>
                  <div className="border border-white/15 p-3">
                    <div className="text-2xl font-black">{preview.rowErrorCount}</div>
                    <div className="text-[10px] uppercase text-white/50">Row errors</div>
                  </div>
                </div>

                {preview.rowErrorCount > 0 && (
                  <div className="border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs">
                    <div className="mb-1 flex items-center gap-1.5 font-bold text-yellow-500">
                      <AlertTriangle size={13} /> {preview.rowErrorCount} row(s) will be skipped
                    </div>
                    <ul className="max-h-32 space-y-0.5 overflow-y-auto text-white/60">
                      {preview.rowErrors.slice(0, 10).map((e, i) => (
                        <li key={i}>
                          Row {e.rowNumber}{e.sku ? ` (${e.sku})` : ""}: {e.errors.join("; ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="max-h-64 overflow-y-auto border border-white/15">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-black">
                      <tr className="border-b border-white/15 text-white/50">
                        <th className="p-2 font-bold uppercase">Product</th>
                        <th className="p-2 font-bold uppercase">Category</th>
                        <th className="p-2 font-bold uppercase">SKUs</th>
                        <th className="p-2 font-bold uppercase">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sampleGroups.map((g, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="p-2">{g.title}</td>
                          <td className="p-2 text-white/60">
                            {g.genderName} / {g.categoryName}
                          </td>
                          <td className="p-2 text-white/60">{g.variantCount}</td>
                          <td className="p-2 text-white/60">₹{g.basePrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.productCount > preview.sampleGroups.length && (
                    <p className="p-2 text-[10px] text-white/40">
                      +{preview.productCount - preview.sampleGroups.length} more not shown
                    </p>
                  )}
                </div>

                {busy && progress && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full overflow-hidden bg-white/10">
                      <div
                        className="h-full bg-white transition-all"
                        style={{ width: `${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-white/50">
                      Importing {progress.done} / {progress.total} products…
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={reset}
                    disabled={busy}
                    className="border border-white/15 px-4 py-2 text-xs font-bold uppercase hover:bg-white/5"
                  >
                    Choose different file
                  </button>
                  <button
                    onClick={commitImport}
                    disabled={busy || preview.productCount === 0}
                    className="border border-white/15 bg-white px-4 py-2 text-xs font-bold uppercase text-black hover:bg-white/90 disabled:opacity-50"
                  >
                    {busy ? "Importing…" : `Import ${preview.productCount} products`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
