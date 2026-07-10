"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="border border-black/20 px-4 py-1.5 text-xs font-semibold hover:bg-black/5">
      Print / Save as PDF
    </button>
  );
}
