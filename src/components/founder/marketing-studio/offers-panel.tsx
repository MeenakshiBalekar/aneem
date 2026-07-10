"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import type { OfferSuggestion } from "@/lib/marketing-studio/types";

export function OffersPanel() {
  const [offers, setOffers] = useState<OfferSuggestion[] | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await founderFetch("/api/founder/marketing-studio/offers");
    setLoading(false);
    if (!res.ok) return toast.error("Couldn't load offer suggestions");
    const data: { offers: OfferSuggestion[]; isMock: boolean } = await res.json();
    setOffers(data.offers);
    setIsMock(data.isMock);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">AI Offer Engine</h1>
          <p className="mt-1 text-sm text-white/50">Promotional offers grounded in your real margin, stock, and bundle data.</p>
        </div>
        <button onClick={load} disabled={loading} className="bg-accent text-ink flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase disabled:opacity-50">
          <Sparkles size={12} /> {loading ? "Analyzing..." : offers ? "Refresh" : "Generate Offers"}
        </button>
      </div>

      {!offers ? (
        <p className="text-xs text-white/40">Click Generate to get 5-8 offer ideas based on current margins, stock levels, and active promotions.</p>
      ) : (
        <>
          {isMock && <p className="mb-3 text-[11px] text-orange-400">Mock offers — set ANTHROPIC_API_KEY for real, data-grounded suggestions.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {offers.map((o, i) => (
              <div key={i} className="border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-bold">{o.name}</p>
                <p className="mt-1 text-xs text-accent">{o.mechanic}</p>
                <p className="mt-2 text-xs text-white/60">{o.reason}</p>
                <p className="mt-2 text-[11px] text-white/40">{o.estimatedImpact}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
