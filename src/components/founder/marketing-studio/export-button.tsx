"use client";

import { Download } from "lucide-react";

export function ExportButton({ productId }: { productId: string }) {
  return (
    <a
      href={`/api/founder/marketing-studio/${productId}/export`}
      className="border-accent text-accent flex items-center gap-1.5 border px-4 py-2 text-xs font-bold uppercase hover:bg-accent hover:text-ink"
    >
      <Download size={14} /> Export Marketing Kit (ZIP)
    </a>
  );
}
