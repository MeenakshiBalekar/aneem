"use client";

import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import type { ThumbnailConcept } from "@/lib/marketing-studio/types";
import type { StudioAsset } from "./asset-uploader";

const OPERATIONS: { value: string; label: string }[] = [
  { value: "remove_background", label: "Remove Background" },
  { value: "increase_resolution", label: "Increase Resolution" },
  { value: "improve_shadows", label: "Improve Shadows" },
  { value: "correct_lighting", label: "Correct Lighting" },
  { value: "hero_image", label: "Hero Image" },
  { value: "lifestyle_mockup", label: "Lifestyle Mockup" },
  { value: "studio_shot", label: "Studio Shot" },
  { value: "folded_image", label: "Folded" },
  { value: "flat_lay", label: "Flat Lay" },
  { value: "hoodie_mockup", label: "Hoodie Mockup" },
  { value: "cap_mockup", label: "Cap Mockup" },
  { value: "bottle_mockup", label: "Bottle Mockup" },
  { value: "bundle_image", label: "Bundle Image" },
];

export function VisualsPanel({ productId, initialAssets }: { productId: string; initialAssets: StudioAsset[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [sourceId, setSourceId] = useState(initialAssets[0]?.id ?? "");
  const [operation, setOperation] = useState(OPERATIONS[0].value);
  const [enhancing, setEnhancing] = useState(false);

  const [concepts, setConcepts] = useState<ThumbnailConcept[] | null>(null);
  const [conceptsIsMock, setConceptsIsMock] = useState(false);
  const [generatingThumbs, setGeneratingThumbs] = useState(false);

  async function enhance() {
    if (!sourceId) return toast.error("Upload a source image first");
    setEnhancing(true);
    const res = await founderFetch(`/api/founder/marketing-studio/${productId}/enhance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceAssetId: sourceId, operation }),
    });
    setEnhancing(false);
    if (!res.ok) return toast.error("Enhancement failed");
    const asset = await res.json();
    setAssets((prev) => [...prev, asset]);
    toast.success(asset.isMock ? "Added (mock — set IMAGE_API_KEY for real generation)" : "Image generated");
  }

  async function generateThumbnails() {
    setGeneratingThumbs(true);
    const res = await founderFetch(`/api/founder/marketing-studio/${productId}/thumbnails`, { method: "POST" });
    setGeneratingThumbs(false);
    if (!res.ok) return toast.error("Couldn't generate thumbnail concepts");
    const data = await res.json();
    setConcepts(data.content);
    setConceptsIsMock(data.isMock);
    toast.success("10 thumbnail concepts generated");
  }

  return (
    <div className="space-y-6">
      <div className="border border-white/10 bg-white/[0.03] p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">AI Image Enhancement</h2>
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/30">Source Image</label>
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="h-9 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none">
              {assets.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#0b0d12]">{a.kind}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/30">Operation</label>
            <select value={operation} onChange={(e) => setOperation(e.target.value)} className="h-9 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none">
              {OPERATIONS.map((op) => (
                <option key={op.value} value={op.value} className="bg-[#0b0d12]">{op.label}</option>
              ))}
            </select>
          </div>
          <button onClick={enhance} disabled={enhancing} className="bg-accent text-ink flex h-9 items-center gap-1.5 px-4 text-xs font-bold uppercase disabled:opacity-50">
            <Sparkles size={12} /> {enhancing ? "Generating..." : "Generate"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {assets.map((a) => (
            <div key={a.id} className="relative aspect-square overflow-hidden border border-white/10 bg-white/5">
              <Image src={a.url} alt={a.kind} fill sizes="120px" className="object-cover" />
              <span className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 text-center text-[8px]">{a.kind.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide">AI Thumbnail Generator</h2>
          <button onClick={generateThumbnails} disabled={generatingThumbs} className="bg-accent text-ink flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase disabled:opacity-50">
            <Sparkles size={12} /> {generatingThumbs ? "Designing..." : "Generate 10 Concepts"}
          </button>
        </div>
        {concepts ? (
          <>
            {conceptsIsMock && <p className="mb-2 text-[11px] text-orange-400">Mock concepts — set ANTHROPIC_API_KEY for real creative direction.</p>}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {concepts.map((c, i) => (
                <div key={i} className="border border-white/10 p-2">
                  <p className="text-[10px] font-bold uppercase text-accent">{c.theme}</p>
                  <p className="mt-1 text-[11px] text-white/60">{c.description}</p>
                  {c.onScreenText && <p className="mt-1 text-[10px] font-semibold">{c.onScreenText}</p>}
                  <span className="mt-1 inline-block border border-white/15 px-1.5 py-0.5 text-[9px] capitalize text-white/40">{c.colorTheme}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-white/40">Generates 10 distinct reel cover concepts across luxury, minimal, bold, and street themes.</p>
        )}
      </div>
    </div>
  );
}
