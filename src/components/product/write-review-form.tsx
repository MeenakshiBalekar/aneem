"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function WriteReviewForm({ productId }: { productId: string }) {
  const { status } = useSession();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (status !== "authenticated") {
    return <p className="text-ink-400 text-sm">Sign in to your account to write a review.</p>;
  }

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, title, body }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Thanks for your review!");
      setTitle("");
      setBody("");
    } else {
      toast.error("Couldn't submit review. Try again.");
    }
  }

  return (
    <div className="border-ink-100 mt-8 border-t pt-8">
      <h3 className="mb-3 text-sm font-bold uppercase">Write a Review</h3>
      <div className="mb-3 flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} onClick={() => setRating(i + 1)} aria-label={`${i + 1} stars`}>
            <Star size={22} className={cn(i < rating ? "fill-ink text-ink" : "fill-ink-100 text-ink-100")} />
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Review title"
        className="border-ink-200 mb-3 h-10 w-full border px-3 text-sm focus:outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Tell us what you think"
        rows={3}
        className="border-ink-200 mb-3 w-full border p-3 text-sm focus:outline-none"
      />
      <button
        onClick={submit}
        disabled={submitting}
        className="bg-ink px-6 py-3 text-xs font-bold uppercase text-white disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </div>
  );
}
