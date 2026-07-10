"use client";

import { useState } from "react";
import { X, Ruler } from "lucide-react";

const SIZE_CHART = [
  { size: "S", chest: "38-40", length: "27" },
  { size: "M", chest: "40-42", length: "28" },
  { size: "L", chest: "42-44", length: "29" },
  { size: "XL", chest: "44-46", length: "30" },
  { size: "XXL", chest: "46-48", length: "31" },
];

export function SizeGuideModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4"
      >
        <Ruler size={14} /> Size Guide
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold uppercase">Size Guide</h3>
              <button aria-label="Close" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <p className="text-ink-400 mb-4 text-xs">All measurements in inches. Oversized fit — size down for a slimmer look.</p>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-ink-100 border-b">
                  <th className="py-2 font-bold">Size</th>
                  <th className="py-2 font-bold">Chest</th>
                  <th className="py-2 font-bold">Length</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_CHART.map((row) => (
                  <tr key={row.size} className="border-ink-100 border-b">
                    <td className="py-2">{row.size}</td>
                    <td className="py-2">{row.chest}</td>
                    <td className="py-2">{row.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
