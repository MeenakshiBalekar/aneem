"use client";

import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export function NewsletterForm({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return toast.error("Enter a valid email");
    setLoading(true);
    // Wired to a future ESP (e.g. Klaviyo/Resend audiences) — stubbed for now.
    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
    setEmail("");
    toast.success("You're on the list. Watch your inbox.");
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className={cn(
          "h-11 w-full border px-4 text-sm focus:outline-none",
          variant === "dark"
            ? "border-white/20 bg-transparent text-white placeholder:text-ink-200"
            : "border-ink-200 bg-white text-ink",
        )}
      />
      <button
        type="submit"
        disabled={loading}
        className={cn(
          "h-11 shrink-0 px-5 text-xs font-bold uppercase tracking-wide disabled:opacity-50",
          variant === "dark" ? "bg-accent text-ink" : "bg-ink text-white",
        )}
      >
        {loading ? "..." : "Join"}
      </button>
    </form>
  );
}
