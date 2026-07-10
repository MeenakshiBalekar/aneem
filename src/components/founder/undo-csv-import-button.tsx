"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";

/** Every product a CSV import creates is tagged `csv:<key>` as its
 * qikinkProductId — this wipes all of them in one shot so a bad sheet
 * (wrong data, wrong grouping, whatever) can be cleanly undone before
 * re-uploading a corrected one, instead of deleting 100+ products by hand. */
export function UndoCsvImportButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function run() {
    if (!window.confirm("Delete every product that came from a CSV/XLSX import? This cannot be undone.")) return;
    setBusy(true);
    const res = await founderFetch("/api/founder/products/import", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      toast.error(data.error ?? "Couldn't delete imported products");
      return;
    }
    toast.success(
      data.blockedCount > 0
        ? `Deleted ${data.deletedCount} products — ${data.blockedCount} skipped (they have order history)`
        : `Deleted ${data.deletedCount} imported products`,
    );
    router.refresh();
  }

  return (
    <button
      onClick={run}
      disabled={busy}
      className="flex items-center gap-2 border border-red-500/30 px-4 py-2 text-xs font-bold uppercase text-red-400 hover:bg-red-500/10 disabled:opacity-50"
    >
      <Trash2 size={14} />
      {busy ? "Deleting…" : "Undo CSV Import"}
    </button>
  );
}
