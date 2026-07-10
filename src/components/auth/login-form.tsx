"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (res?.error) {
      toast.error("Invalid email or password");
      return;
    }
    router.push(searchParams.get("callbackUrl") ?? "/account");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-black uppercase">Welcome Back</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-ink-200 h-12 w-full border px-4 text-sm focus:outline-none"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-ink-200 h-12 w-full border px-4 text-sm focus:outline-none"
        />
        <button type="submit" disabled={loading} className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <p className="text-ink-400 mt-4 text-center text-sm">
        New to Aneem?{" "}
        <Link href="/register" className="font-semibold underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
