import type { Metadata } from "next";
import { FounderProviders } from "./providers";

// noindex everything under /founder as defense in depth — the host-based
// block in middleware.ts is the real barrier, this just keeps it out of
// search engines if it's ever crawled by mistake. This is a *nested*
// layout (no <html>/<body>) — the single root layout in src/app/layout.tsx
// already provides those for the whole app, founder routes included.
export const metadata: Metadata = {
  title: { default: "Founder Portal — Aneem", template: "%s | Aneem Founder Portal" },
  robots: { index: false, follow: false },
};

export default function FounderRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0d12] font-sans text-white">
      <FounderProviders>{children}</FounderProviders>
    </div>
  );
}
