import "server-only";
import { prisma } from "@/lib/prisma";
import { callClaudeJSON, isAIConfigured } from "./claude";
import { getProductContext } from "./context";
import type { ReelScene, MusicSuggestion } from "./types";
import type { ReelVoiceOption } from "@prisma/client";

const CINEMATIC_TECHNIQUES = [
  "slow motion",
  "speed ramps",
  "camera shake",
  "light leaks",
  "film grain",
  "motion blur",
  "depth/parallax",
  "animated typography",
  "cinematic transitions (not cuts)",
  "dynamic zoom",
  "glow effects",
  "luxury color grading",
  "product reflections",
  "shadow movement",
  "premium lighting",
];

const VOICE_LABELS: Record<ReelVoiceOption, string> = {
  NONE: "no voiceover — on-screen text and music carry the reel",
  MALE: "confident male voice, mid register, minimal delivery",
  FEMALE: "confident female voice, mid register, minimal delivery",
  LUXURY: "slow, deliberate, editorial luxury-fashion-film voiceover",
  STREETWEAR: "raw, street, slightly gritty delivery — like a hype-brand drop video",
  MOTIVATIONAL: "energetic, motivational delivery — like a training/discipline reel",
};

const SYSTEM = `You are an award-winning creative director who has directed campaign films for Nike, Represent, YoungLA, Gymshark, and Rare Rabbit. You are briefing a video editor on a 15-30 second vertical Instagram Reel for Aneem, a premium oversized streetwear brand. The brief must read like a real shot list from a production house — specific camera direction, specific on-screen text, specific pacing — never generic "show the product" language. Every reel must feel different from the last one you wrote: vary the opening hook, the scene order, and the transition style each time.`;

interface ReelBriefOutput {
  scenes: ReelScene[];
  voiceoverScript: string;
  musicSuggestion: MusicSuggestion;
}

function buildPrompt(contextBlock: string, voiceOption: ReelVoiceOption): string {
  return `${contextBlock}

Voice option: ${VOICE_LABELS[voiceOption]}

Format: 1080x1920 vertical, 60fps, 15-30 seconds total, no watermark.

Available cinematic techniques to draw from (use 4-6 per reel, don't use all of them every time): ${CINEMATIC_TECHNIQUES.join(", ")}.

Build a scene-by-scene shot list of 6-8 scenes covering, in an order and style you choose (don't always default to the same structure): brand intro moment, product reveal from darkness/spotlight, texture/fabric close-up, fit/silhouette demonstration, lifestyle context, 2-3 key benefits as animated text, and a call-to-action ending with "Available Now — aneem.in".

Return JSON:
{
  "scenes": [
    { "order": 1, "title": "short scene name", "description": "what happens, camera-direction-level detail", "onScreenText": "exact text overlay, or empty string if none", "cameraDirection": "specific camera move/angle", "durationSeconds": number, "effects": ["2-4 techniques from the list above used in this scene"] }
  ],
  "voiceoverScript": "the full voiceover script matching the scene timing, or empty string if voice option is none",
  "musicSuggestion": { "songName": "a real or plausible trending-style track name", "mood": "", "bpm": number, "reason": "why this track fits this specific reel", "isCopyrightFree": boolean }
}

Scene durations must sum to 15-30 seconds total.`;
}

export async function generateReelBrief(productId: string, voiceOption: ReelVoiceOption = "NONE") {
  const { contextBlock } = await getProductContext(productId);

  let output: ReelBriefOutput;
  let isMock = false;

  if (!isAIConfigured()) {
    isMock = true;
    output = mockReelBrief(voiceOption);
  } else {
    try {
      output = await callClaudeJSON<ReelBriefOutput>(SYSTEM, buildPrompt(contextBlock, voiceOption), 2500);
    } catch {
      isMock = true;
      output = mockReelBrief(voiceOption);
    }
  }

  const reel = await prisma.reelBrief.create({
    data: {
      productId,
      status: "SCRIPT_READY",
      scenes: output.scenes as never,
      voiceOption,
      voiceoverScript: output.voiceoverScript,
      musicSuggestion: output.musicSuggestion as never,
      isMock,
    },
  });

  return { reel, isMock };
}

function mockReelBrief(voiceOption: ReelVoiceOption): ReelBriefOutput {
  const scenes: ReelScene[] = [
    {
      order: 1,
      title: "Black Screen Intro",
      description: "Black screen. ANEEM wordmark fades in with a subtle glow, then the line 'Streetwear isn't worn. It's lived.' types on.",
      onScreenText: "ANEEM\nStreetwear isn't worn. It's lived.",
      cameraDirection: "Static, centered — let the typography do the work",
      durationSeconds: 3,
      effects: ["animated typography", "glow effects", "film grain"],
    },
    {
      order: 2,
      title: "Product Reveal",
      description: "Product emerges from darkness under a single spotlight, slow 180° rotation on a turntable.",
      onScreenText: "",
      cameraDirection: "Slow dolly-in, spotlight sweep",
      durationSeconds: 4,
      effects: ["premium lighting", "slow motion", "product reflections"],
    },
    {
      order: 3,
      title: "Fabric Macro",
      description: "Extreme close-up on fabric texture and print, catching light as it moves.",
      onScreenText: "100% Cotton\n240 GSM",
      cameraDirection: "Macro lens, slow pan across texture",
      durationSeconds: 4,
      effects: ["depth/parallax", "animated typography", "motion blur"],
    },
    {
      order: 4,
      title: "Silhouette",
      description: "Full silhouette shot showing the oversized fit, subtle camera shake for energy.",
      onScreenText: "Oversized Fit",
      cameraDirection: "Low-angle, slight handheld shake",
      durationSeconds: 4,
      effects: ["camera shake", "dynamic zoom", "luxury color grading"],
    },
    {
      order: 5,
      title: "Lifestyle",
      description: "Street lifestyle context shot, model walking, natural light with a light leak transition in.",
      onScreenText: "",
      cameraDirection: "Tracking shot, shallow depth of field",
      durationSeconds: 4,
      effects: ["light leaks", "depth/parallax", "cinematic transitions (not cuts)"],
    },
    {
      order: 6,
      title: "Benefits",
      description: "Three benefit lines animate in sequence over quick product cuts.",
      onScreenText: "Premium Fabric\nComfort Fit\nBuilt to Last",
      cameraDirection: "Speed-ramped cuts between angles",
      durationSeconds: 4,
      effects: ["speed ramps", "animated typography", "glow effects"],
    },
    {
      order: 7,
      title: "Call To Action",
      description: "Final hero shot with logo and CTA, fading to black.",
      onScreenText: "Available Now\naneem.in",
      cameraDirection: "Static hero shot, slow fade",
      durationSeconds: 3,
      effects: ["luxury color grading", "glow effects"],
    },
  ];

  const voiceoverScript =
    voiceOption === "NONE"
      ? ""
      : "Streetwear isn't worn. It's lived. Heavyweight cotton. Built oversized. Made for every day that matters. Available now, at aneem dot in.";

  return {
    scenes,
    voiceoverScript,
    musicSuggestion: {
      songName: "Concrete Bloom (Instrumental)",
      mood: "Dark, cinematic, confident",
      bpm: 92,
      reason: "Slow-building instrumental with a bass drop that lands on the product reveal scene.",
      isCopyrightFree: true,
    },
  };
}
