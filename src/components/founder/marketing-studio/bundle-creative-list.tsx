"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import type { BundleCreativeOutput } from "@/lib/marketing-studio/types";

interface BundleRow {
  id: string;
  name: string;
  discountPercent: string;
  itemNames: string[];
}

export function BundleCreativeList({ bundles }: { bundles: BundleRow[] }) {
  const [creatives, setCreatives] = useState<Record<string, { data: BundleCreativeOutput; isMock: boolean } | undefined>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function generate(bundleId: string) {
    setLoading(bundleId);
    const res = await founderFetch(`/api/founder/marketing-studio/bundles/${bundleId}/creative`, { method: "POST" });
    setLoading(null);
    if (!res.ok) return toast.error("Couldn't generate bundle creative");
    const data: { data: BundleCreativeOutput; isMock: boolean } = await res.json();
    setCreatives((prev) => ({ ...prev, [bundleId]: data }));
    toast.success(data.isMock ? "Generated (mock — set ANTHROPIC_API_KEY for real copy)" : "Creative generated");
  }

  if (bundles.length === 0) {
    return <p className="text-xs text-white/40">No active bundles yet.</p>;
  }

  return (
    <div className="space-y-3">
      {bundles.map((b) => {
        const creative = creatives[b.id];
        return (
          <div key={b.id} className="border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{b.name}</p>
                <p className="text-[11px] text-white/40">{b.itemNames.join(" + ")} · {b.discountPercent}% off</p>
              </div>
              <button
                onClick={() => generate(b.id)}
                disabled={loading === b.id}
                className="bg-accent text-ink flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase disabled:opacity-50"
              >
                <Sparkles size={12} /> {loading === b.id ? "Generating..." : creative ? "Regenerate" : "Generate Creative"}
              </button>
            </div>

            {creative && (
              <div className="mt-3 border-t border-white/10 pt-3">
                {creative.isMock && <p className="mb-2 text-[11px] text-orange-400">Mock — set ANTHROPIC_API_KEY for real creative copy.</p>}
                <p className="text-sm font-semibold text-accent">{creative.data.bundleName}</p>
                <p className="text-xs italic text-white/60">{creative.data.tagline}</p>
                <p className="mt-1 text-xs">{creative.data.caption}</p>
                <p className="mt-1 text-[11px] text-emerald-400">{creative.data.savingsCallout}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
