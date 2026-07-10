"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Sparkles, Play, Film } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import type { ReelScene, MusicSuggestion } from "@/lib/marketing-studio/types";

interface ReelRow {
  id: string;
  status: string;
  scenes: ReelScene[];
  voiceOption: string;
  voiceoverScript: string | null;
  musicSuggestion: MusicSuggestion | null;
  videoUrl: string | null;
  isMock: boolean;
}

const VOICES = [
  { value: "NONE", label: "No Voice" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "LUXURY", label: "Luxury" },
  { value: "STREETWEAR", label: "Streetwear" },
  { value: "MOTIVATIONAL", label: "Motivational" },
];

export function ReelGeneratorPanel({ productId, initialReel }: { productId: string; initialReel: ReelRow | null }) {
  const [reel, setReel] = useState(initialReel);
  const [voice, setVoice] = useState("NONE");
  const [generating, setGenerating] = useState(false);
  const [rendering, setRendering] = useState(false);

  async function generateBrief() {
    setGenerating(true);
    const res = await founderFetch(`/api/founder/marketing-studio/${productId}/reel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceOption: voice }),
    });
    setGenerating(false);
    if (!res.ok) return toast.error("Couldn't generate reel brief");
    const data: ReelRow = await res.json();
    setReel(data);
    toast.success(data.isMock ? "Brief generated (mock — set ANTHROPIC_API_KEY for real direction)" : "Reel brief generated");
  }

  async function startRender() {
    if (!reel) return;
    setRendering(true);
    const res = await founderFetch(`/api/founder/marketing-studio/reel/${reel.id}/render`, { method: "POST" });
    setRendering(false);
    if (!res.ok) return toast.error("Couldn't start render");
    const data: ReelRow = await res.json();
    setReel(data);
    if (data.isMock) {
      toast(
        "No video render provider configured (VIDEO_RENDER_API_KEY) — showing the creative brief only. Connect Creatomate/Shotstack/JSON2Video for real MP4 output.",
        { icon: "🎬", duration: 6000 },
      );
    } else {
      toast.success("Render started");
    }
  }

  const totalDuration = reel?.scenes.reduce((s, sc) => s + sc.durationSeconds, 0) ?? 0;

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Film size={16} /> AI Reel Generator
        </h2>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/30">Voice</label>
          <select value={voice} onChange={(e) => setVoice(e.target.value)} className="h-9 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none">
            {VOICES.map((v) => (
              <option key={v.value} value={v.value} className="bg-[#0b0d12]">{v.label}</option>
            ))}
          </select>
        </div>
        <button onClick={generateBrief} disabled={generating} className="bg-accent text-ink flex h-9 items-center gap-1.5 px-4 text-xs font-bold uppercase disabled:opacity-50">
          <Sparkles size={12} /> {generating ? "Directing..." : "Generate Reel"}
        </button>
      </div>

      {!reel ? (
        <p className="text-xs text-white/40">
          AI will write a complete scene-by-scene shot list (camera direction, on-screen text, cinematic effects), voiceover script, and music brief — ready to hand to an editor or send to a render provider.
        </p>
      ) : (
        <div>
          {reel.isMock && !reel.videoUrl && (
            <p className="mb-3 text-[11px] text-orange-400">
              {reel.status === "READY"
                ? "No video render provider configured — this is the creative brief only, no MP4 was generated."
                : "Creative brief is real; video rendering needs VIDEO_RENDER_API_KEY (Creatomate/Shotstack/JSON2Video)."}
            </p>
          )}

          <div className="mb-4 flex items-center gap-4 text-xs text-white/50">
            <span>Status: <span className="text-white">{reel.status}</span></span>
            <span>{totalDuration}s · 1080×1920 · 60fps</span>
            {reel.status !== "RENDERING" && (
              <button onClick={startRender} disabled={rendering} className="flex items-center gap-1 border border-white/15 px-2 py-1 hover:bg-white/5 disabled:opacity-50">
                <Play size={12} /> {rendering ? "Starting..." : reel.videoUrl ? "Re-render" : "Render"}
              </button>
            )}
          </div>

          {reel.videoUrl && (
            <video src={reel.videoUrl} controls className="mb-4 aspect-[9/16] w-full max-w-[240px] bg-black" />
          )}

          <div className="space-y-2">
            {reel.scenes.map((scene) => (
              <div key={scene.order} className="border border-white/10 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Scene {scene.order} — {scene.title}</p>
                  <span className="text-[10px] text-white/30">{scene.durationSeconds}s</span>
                </div>
                <p className="mt-1 text-xs text-white/60">{scene.description}</p>
                {scene.onScreenText && <p className="mt-1 whitespace-pre-line text-xs font-medium text-accent">{scene.onScreenText}</p>}
                <p className="mt-1 text-[10px] text-white/30">Camera: {scene.cameraDirection}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {scene.effects.map((fx) => (
                    <span key={fx} className="border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40">{fx}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {reel.voiceoverScript && (
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-white/30">Voiceover Script</p>
              <p className="text-xs italic text-white/60">&ldquo;{reel.voiceoverScript}&rdquo;</p>
            </div>
          )}

          {reel.musicSuggestion && (
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-white/30">Music Suggestion</p>
              <p className="text-xs">
                <span className="font-semibold">{reel.musicSuggestion.songName}</span> — {reel.musicSuggestion.mood}, {reel.musicSuggestion.bpm} BPM
                {reel.musicSuggestion.isCopyrightFree && <span className="text-emerald-400"> (copyright-free)</span>}
              </p>
              <p className="mt-0.5 text-[10px] text-white/40">{reel.musicSuggestion.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
