"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error?.formErrors?.[0] ?? data.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      toast.success("Account created — please sign in.");
      router.push("/login");
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <div className="container-aneem flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-black uppercase">Create Account</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="border-ink-200 h-12 w-full border px-4 text-sm focus:outline-none"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="border-ink-200 h-12 w-full border px-4 text-sm focus:outline-none"
          />
          <input
            placeholder="Phone (10 digits)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
            className="border-ink-200 h-12 w-full border px-4 text-sm focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="border-ink-200 h-12 w-full border px-4 text-sm focus:outline-none"
          />
          <button type="submit" disabled={loading} className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p className="text-ink-400 mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
