"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock } from "lucide-react";
import toast from "react-hot-toast";

export function FounderLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Decide whether to show the 2FA field ourselves, via a dedicated
    // check — NextAuth's signIn() error message turned out not to be a
    // reliable way to detect "this account needs a 2FA code" in a
    // production build (only worked in local dev), so this doesn't depend
    // on that at all. Only skip the check on the second submit, once we're
    // already in the 2FA step and know the password was right.
    if (!needsTotp) {
      const checkRes = await fetch("/api/founder-auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const checkData = await checkRes.json().catch(() => ({ ok: false }));

      if (!checkRes.ok || !checkData.ok) {
        setLoading(false);
        toast.error("Invalid credentials");
        return;
      }
      if (checkData.requires2FA) {
        setLoading(false);
        setNeedsTotp(true);
        toast("Enter your 2FA code", { icon: "🔐" });
        return;
      }
    }

    const res = await signIn("credentials", { email, password, totpCode, redirect: false });
    setLoading(false);

    if (res?.error) {
      toast.error(needsTotp ? "Invalid 2FA code" : "Invalid credentials");
      return;
    }

    router.push("/founder");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex items-center gap-2">
        <ShieldCheck className="text-accent" size={28} />
        <div>
          <p className="text-xs uppercase tracking-widest text-white/50">Aneem</p>
          <h1 className="text-xl font-bold">Founder Portal</h1>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          required
          disabled={needsTotp}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 w-full border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none disabled:opacity-50"
        />
        <input
          type="password"
          required
          disabled={needsTotp}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 w-full border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none disabled:opacity-50"
        />

        {needsTotp && (
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs text-white/60">
              <Lock size={12} /> 6-digit authenticator code
            </label>
            <input
              autoFocus
              required
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-12 w-full border border-white/15 bg-white/5 px-4 text-center text-lg tracking-[0.5em] text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-ink h-12 w-full text-sm font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {loading ? "Verifying..." : needsTotp ? "Verify & Sign In" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-[11px] text-white/30">
        This portal is restricted to authorized Aneem founders. All access attempts are logged.
      </p>
    </div>
  );
}
