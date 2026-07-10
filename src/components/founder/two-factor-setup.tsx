"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { founderFetch } from "@/lib/founder/fetch-client";

export function TwoFactorSetup({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [step, setStep] = useState<"idle" | "scanning">("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setLoading(true);
    const res = await founderFetch("/api/founder/2fa/setup", { method: "POST" });
    setLoading(false);
    if (!res.ok) return toast.error("Couldn't start 2FA setup");
    const data = await res.json();
    setQrCode(data.qrCodeDataUrl);
    setSecret(data.secret);
    setStep("scanning");
  }

  async function confirmSetup() {
    setLoading(true);
    const res = await founderFetch("/api/founder/2fa/verify-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, code }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      return toast.error(data.error ?? "Verification failed");
    }
    setEnabled(true);
    setStep("idle");
    toast.success("Two-factor authentication enabled");
  }

  async function disable2fa() {
    setLoading(true);
    const res = await founderFetch("/api/founder/2fa/disable", { method: "POST" });
    setLoading(false);
    if (!res.ok) return toast.error("Couldn't disable 2FA");
    setEnabled(false);
    toast.success("Two-factor authentication disabled");
  }

  return (
    <div className="max-w-md border border-white/10 bg-white/[0.03] p-6">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">Two-Factor Authentication</h2>
      <p className="mb-4 text-xs text-white/50">
        {enabled ? "2FA is currently enabled on your account." : "Require a 6-digit authenticator code at login, in addition to your password."}
      </p>

      {enabled ? (
        <button onClick={disable2fa} disabled={loading} className="border border-red-500/40 px-4 py-2 text-xs font-bold uppercase text-red-400 disabled:opacity-50">
          Disable 2FA
        </button>
      ) : step === "idle" ? (
        <button onClick={startSetup} disabled={loading} className="bg-accent text-ink px-4 py-2 text-xs font-bold uppercase disabled:opacity-50">
          Enable 2FA
        </button>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-white/60">Scan with Google Authenticator, Authy, or any TOTP app:</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamically generated data: URI, not an optimizable remote asset */}
          {qrCode && <img src={qrCode} alt="2FA QR code" width={180} height={180} className="border border-white/10" />}
          <p className="break-all text-[10px] text-white/30">Manual entry key: {secret}</p>
          <input
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-11 w-full border border-white/15 bg-white/5 px-4 text-center text-lg tracking-[0.5em] text-white focus:border-white/40 focus:outline-none"
          />
          <button onClick={confirmSetup} disabled={loading || code.length !== 6} className="bg-accent text-ink w-full px-4 py-2 text-xs font-bold uppercase disabled:opacity-50">
            Confirm & Enable
          </button>
        </div>
      )}
    </div>
  );
}
