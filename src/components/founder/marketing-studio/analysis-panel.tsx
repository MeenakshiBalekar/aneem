"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import type { DetectedProductAttributes } from "@/lib/marketing-studio/types";

interface Profile {
  typographyStyle: string | null;
  mood: string | null;
  aesthetic: string | null;
  positioning: string | null;
  targetAudience: string | null;
  colorPalette: unknown;
  designLanguage: string | null;
  analyzedAt: string | null;
}

export function AnalysisPanel({ productId, initialProfile }: { productId: string; initialProfile: Profile | null }) {
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);

  async function analyze() {
    setLoading(true);
    const res = await founderFetch(`/api/founder/marketing-studio/${productId}/analyze`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Analysis failed");
      return;
    }
    const data: { profile: Profile; attributes: DetectedProductAttributes; isMock: boolean } = await res.json();
    setProfile(data.profile);
    setIsMock(data.isMock);
    toast.success(data.isMock ? "Analyzed (mock — set ANTHROPIC_API_KEY for real vision analysis)" : "Product analyzed");
  }

  const palette = Array.isArray(profile?.colorPalette) ? (profile!.colorPalette as string[]) : [];

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide">AI Product Understanding</h2>
        <button onClick={analyze} disabled={loading} className="bg-accent text-ink flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase disabled:opacity-50">
          <Sparkles size={12} /> {loading ? "Analyzing..." : profile?.analyzedAt ? "Re-analyze" : "Analyze Product"}
        </button>
      </div>

      {!profile?.analyzedAt ? (
        <p className="text-xs text-white/40">Upload images above, then click Analyze — AI will detect typography, mood, aesthetic, audience, and color palette automatically.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {isMock && <p className="col-span-2 text-[11px] text-orange-400">Mock analysis — set ANTHROPIC_API_KEY for real vision analysis.</p>}
          <Field label="Typography Style" value={profile.typographyStyle} />
          <Field label="Mood" value={profile.mood} />
          <Field label="Aesthetic" value={profile.aesthetic} />
          <Field label="Positioning" value={profile.positioning} />
          <Field label="Target Audience" value={profile.targetAudience} />
          <Field label="Design Language" value={profile.designLanguage} />
          {palette.length > 0 && (
            <div className="col-span-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-white/30">Color Palette</p>
              <div className="flex gap-2">
                {palette.map((hex) => (
                  <div key={hex} className="flex items-center gap-1">
                    <div className="h-6 w-6 border border-white/20" style={{ backgroundColor: hex }} />
                    <span className="text-[10px] text-white/40">{hex}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-white/30">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
