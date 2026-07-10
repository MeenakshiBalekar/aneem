"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { founderFetch } from "@/lib/founder/fetch-client";

const PLATFORMS = [
  { value: "instagram_caption", label: "Instagram Caption" },
  { value: "instagram_reel_script", label: "Reel Script" },
  { value: "facebook_ad", label: "Facebook Ad" },
  { value: "google_ad", label: "Google Ad" },
  { value: "email", label: "Email" },
  { value: "whatsapp_broadcast", label: "WhatsApp Broadcast" },
];

export function MarketingContentGenerator({ products }: { products: { id: string; title: string }[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [platform, setPlatform] = useState(PLATFORMS[0].value);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!productId) return toast.error("Pick a product");
    setLoading(true);
    const res = await founderFetch("/api/founder/copilot/marketing-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, platform }),
    });
    const data = await res.json();
    setLoading(false);
    setContent(data.content ?? "Something went wrong.");
  }

  function copy() {
    navigator.clipboard.writeText(content);
    toast.success("Copied");
  }

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">AI Marketing Content Generator</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="h-9 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none">
          {products.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#0b0d12]">{p.title}</option>
          ))}
        </select>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="h-9 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none">
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value} className="bg-[#0b0d12]">{p.label}</option>
          ))}
        </select>
        <button onClick={generate} disabled={loading} className="bg-accent text-ink h-9 px-4 text-xs font-bold uppercase disabled:opacity-50">
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>
      {content && (
        <div className="border border-white/10 bg-white/5 p-3">
          <p className="whitespace-pre-wrap text-sm">{content}</p>
          <button onClick={copy} className="mt-2 text-xs text-white/50 underline">Copy</button>
        </div>
      )}
    </div>
  );
}
