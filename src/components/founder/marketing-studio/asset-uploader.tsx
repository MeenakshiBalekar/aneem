"use client";

import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Upload } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";

export interface StudioAsset {
  id: string;
  kind: string;
  url: string;
}

const SLOTS: { kind: string; label: string }[] = [
  { kind: "SOURCE_FRONT", label: "Front" },
  { kind: "SOURCE_BACK", label: "Back" },
  { kind: "SOURCE_LIFESTYLE", label: "Lifestyle (optional)" },
  { kind: "SOURCE_FABRIC", label: "Fabric Close-up" },
];

export function AssetUploader({ productId, initialAssets }: { productId: string; initialAssets: StudioAsset[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [uploading, setUploading] = useState<string | null>(null);

  function assetFor(kind: string) {
    return assets.filter((a) => a.kind === kind).slice(-1)[0];
  }

  async function onUpload(kind: string, file: File) {
    setUploading(kind);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("productId", productId);
    formData.append("kind", kind);

    const res = await founderFetch("/api/founder/marketing-studio/upload", { method: "POST", body: formData });
    setUploading(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Upload failed");
      return;
    }
    const asset = await res.json();
    setAssets((prev) => [...prev, asset]);
    toast.success(`${kind.replace("SOURCE_", "")} image uploaded`);
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SLOTS.map((slot) => {
        const existing = assetFor(slot.kind);
        return (
          <label key={slot.kind} className="group relative block aspect-[4/5] cursor-pointer overflow-hidden border border-white/15 bg-white/[0.03]">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading === slot.kind}
              onChange={(e) => e.target.files?.[0] && onUpload(slot.kind, e.target.files[0])}
            />
            {existing ? (
              <Image src={existing.url} alt={slot.label} fill sizes="200px" className="object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-white/30">
                <Upload size={20} />
                <span className="text-[11px]">{uploading === slot.kind ? "Uploading..." : slot.label}</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-center text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
              {existing ? "Replace" : "Upload"}
            </div>
          </label>
        );
      })}
    </div>
  );
}
