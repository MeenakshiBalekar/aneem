"use client";

import { useState } from "react";
import { Dumbbell, Plane, Sun, Briefcase, GraduationCap, Loader2 } from "lucide-react";
import { ProductCard, type ProductCardData } from "@/components/product/product-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

const CONTEXTS = [
  { key: "gym", label: "Gym", icon: Dumbbell },
  { key: "travel", label: "Travel", icon: Plane },
  { key: "weekend", label: "Weekend", icon: Sun },
  { key: "office", label: "Office Casual", icon: Briefcase },
  { key: "college", label: "College", icon: GraduationCap },
] as const;

export default function StyleAssistantPage() {
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [blurb, setBlurb] = useState("");
  const [products, setProducts] = useState<ProductCardData[]>([]);

  async function pick(context: string) {
    setActive(context);
    setLoading(true);
    const res = await fetch(`/api/ai/style-assistant?context=${context}`);
    const data = await res.json();
    setBlurb(data.blurb);
    setProducts(
      data.products.map((p: ProductCardData & { basePrice: unknown; compareAtPrice: unknown }) => ({
        ...p,
        basePrice: Number(p.basePrice),
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      })),
    );
    setLoading(false);
  }

  return (
    <div className="container-aneem py-14">
      <SectionHeading eyebrow="AI Style Assistant" title="What's the Occasion?" align="center" subtitle="Tell us where you're headed — we'll pull the fits that fit." className="items-center" />

      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-5">
        {CONTEXTS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => pick(key)}
            className={cn(
              "flex flex-col items-center gap-2 border p-6 transition-colors",
              active === key ? "border-ink bg-ink text-white" : "border-ink-200 hover:border-ink",
            )}
          >
            <Icon size={24} />
            <span className="text-xs font-bold uppercase">{label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-14 flex justify-center">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {!loading && active && (
        <div className="mt-14">
          <p className="mb-8 text-center text-lg font-semibold">{blurb}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
