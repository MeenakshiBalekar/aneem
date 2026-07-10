"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Sparkles, Copy } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import { cn } from "@/lib/utils";
import type { ContentScore } from "@/lib/marketing-studio/types";

interface ContentRow {
  id: string;
  type: string;
  content: unknown;
  score: ContentScore | null;
  isMock: boolean;
  createdAt: string;
}

const CONTENT_TYPES = [
  { type: "CAPTION", label: "Captions" },
  { type: "HASHTAGS", label: "Hashtags" },
  { type: "CAROUSEL", label: "Carousel" },
  { type: "STORY", label: "Stories" },
  { type: "PRODUCT_DESCRIPTION", label: "Description" },
  { type: "META_AD", label: "Meta Ad" },
  { type: "WHATSAPP_CAMPAIGN", label: "WhatsApp" },
  { type: "EMAIL_CAMPAIGN", label: "Email" },
];

function copyText(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied");
}

function ScoreBar({ score }: { score: ContentScore }) {
  const items: [string, number][] = [
    ["Hook", score.hookScore],
    ["Scroll-Stop", score.scrollStopScore],
    ["Luxury", score.luxuryScore],
    ["Virality", score.viralityScore],
    ["Conversion", score.conversionScore],
    ["Confidence", score.confidenceScore],
  ];
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 sm:grid-cols-6">
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-[9px] uppercase tracking-wide text-white/30">{label}</p>
          <p className={cn("text-sm font-bold", value >= 70 ? "text-emerald-400" : value >= 45 ? "text-white" : "text-orange-400")}>{value}</p>
        </div>
      ))}
      <div className="col-span-3 flex gap-4 text-[10px] text-white/40 sm:col-span-6">
        <span>Expected CTR: {score.expectedCTR}%</span>
        <span>Saves: {score.expectedSaves}</span>
        <span>Shares: {score.expectedShares}</span>
        <span>Watch Time: {score.expectedWatchTime}%</span>
      </div>
    </div>
  );
}

function ContentBody({ type, content }: { type: string; content: unknown }) {
  if (type === "CAPTION" && content && typeof content === "object") {
    const c = content as Record<string, string>;
    return (
      <div className="space-y-2">
        {Object.entries(c).map(([variant, text]) => (
          <div key={variant} className="flex items-start justify-between gap-2 border-b border-white/5 pb-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-white/30">{variant}</p>
              <p className="text-sm">{text}</p>
            </div>
            <button onClick={() => copyText(text)} className="shrink-0 text-white/40 hover:text-white"><Copy size={14} /></button>
          </div>
        ))}
      </div>
    );
  }

  if (type === "HASHTAGS" && content && typeof content === "object") {
    const c = content as { all30?: string[] };
    return (
      <div>
        <div className="flex flex-wrap gap-1.5">
          {(c.all30 ?? []).map((tag) => (
            <span key={tag} className="border border-white/15 px-2 py-0.5 text-xs">{tag}</span>
          ))}
        </div>
        <button onClick={() => copyText((c.all30 ?? []).join(" "))} className="mt-2 text-xs text-white/50 underline">Copy all 30</button>
      </div>
    );
  }

  if (type === "CAROUSEL" && Array.isArray(content)) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {content.map((slide: { slideNumber: number; role: string; headline: string; subtext: string; visualDirection: string }) => (
          <div key={slide.slideNumber} className="border border-white/10 p-2">
            <p className="text-[10px] uppercase tracking-wide text-white/30">Slide {slide.slideNumber} — {slide.role}</p>
            <p className="text-sm font-semibold">{slide.headline}</p>
            <p className="text-xs text-white/50">{slide.subtext}</p>
            <p className="mt-1 text-[10px] italic text-white/30">{slide.visualDirection}</p>
          </div>
        ))}
      </div>
    );
  }

  if (type === "STORY" && Array.isArray(content)) {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        {content.map((story: { type: string; headline: string; subtext: string; stickerSuggestion: string; cta: string }, i: number) => (
          <div key={i} className="border border-white/10 p-2">
            <p className="text-[10px] uppercase tracking-wide text-accent">{story.type.replace(/_/g, " ")}</p>
            <p className="text-sm font-semibold">{story.headline}</p>
            <p className="text-xs text-white/50">{story.subtext}</p>
            <p className="mt-1 text-[10px] text-white/40">Sticker: {story.stickerSuggestion}</p>
            <p className="text-[10px] text-white/40">CTA: {story.cta}</p>
          </div>
        ))}
      </div>
    );
  }

  // Generic fallback for description / meta ad / whatsapp / email — render key/value pairs.
  if (content && typeof content === "object") {
    return (
      <div className="space-y-2">
        {Object.entries(content as Record<string, unknown>).map(([key, value]) => (
          <div key={key} className="border-b border-white/5 pb-2">
            <p className="text-[10px] uppercase tracking-wide text-white/30">{key.replace(/([A-Z])/g, " $1")}</p>
            <p className="whitespace-pre-wrap text-sm">{typeof value === "string" ? value : JSON.stringify(value)}</p>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm">{String(content)}</p>;
}

export function ContentGeneratorPanel({ productId, initialContent }: { productId: string; initialContent: ContentRow[] }) {
  const [active, setActive] = useState(CONTENT_TYPES[0].type);
  const [byType, setByType] = useState<Record<string, ContentRow | undefined>>(() => {
    const map: Record<string, ContentRow> = {};
    for (const c of initialContent) if (!map[c.type]) map[c.type] = c;
    return map;
  });
  const [loading, setLoading] = useState<string | null>(null);

  async function generate(type: string) {
    setLoading(type);
    const res = await founderFetch(`/api/founder/marketing-studio/${productId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Generation failed");
      return;
    }
    const row: ContentRow = await res.json();
    setByType((prev) => ({ ...prev, [type]: row }));
    toast.success(row.isMock ? "Generated (mock — set ANTHROPIC_API_KEY for real output)" : "Generated");
  }

  const current = byType[active];

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CONTENT_TYPES.map((ct) => (
          <button
            key={ct.type}
            onClick={() => setActive(ct.type)}
            className={cn("px-3 py-1.5 text-xs font-semibold uppercase", active === ct.type ? "bg-white text-ink" : "border border-white/15 text-white/60 hover:bg-white/5")}
          >
            {ct.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-white/40">{current ? new Date(current.createdAt).toLocaleString("en-IN") : "Not generated yet"}</p>
        <button onClick={() => generate(active)} disabled={loading === active} className="bg-accent text-ink flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase disabled:opacity-50">
          <Sparkles size={12} /> {loading === active ? "Generating..." : current ? "Regenerate" : "Generate"}
        </button>
      </div>

      {current ? (
        <>
          {current.isMock && <p className="mb-2 text-[11px] text-orange-400">Mock output — set ANTHROPIC_API_KEY for real generation.</p>}
          <ContentBody type={active} content={current.content} />
          {current.score && <ScoreBar score={current.score} />}
        </>
      ) : (
        <p className="text-xs text-white/40">Click Generate to create {CONTENT_TYPES.find((c) => c.type === active)?.label.toLowerCase()}.</p>
      )}
    </div>
  );
}
