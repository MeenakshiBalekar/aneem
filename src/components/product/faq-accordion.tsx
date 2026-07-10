"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  { q: "How does the oversized fit run?", a: "Our oversized fits are cut with dropped shoulders and extra room through the body. If you want a true streetwear silhouette, order your regular size. For a slimmer fit, size down." },
  { q: "Is Cash on Delivery available?", a: "Yes, COD is available pan-India with a small handling fee shown at checkout." },
  { q: "What's your exchange policy?", a: "Free size exchange within 7 days of delivery. The product must be unworn with tags attached." },
  { q: "How long does shipping take?", a: "Orders are produced and dispatched within 24-48 hours, with delivery in 3-7 business days depending on your location." },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-ink-100 divide-y border-y border-ink-100">
      {FAQS.map((faq, i) => (
        <div key={i}>
          <button
            className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold"
            onClick={() => setOpen(open === i ? null : i)}
          >
            {faq.q}
            <ChevronDown size={16} className={cn("transition-transform", open === i && "rotate-180")} />
          </button>
          {open === i && <p className="text-ink-400 pb-4 text-sm leading-relaxed">{faq.a}</p>}
        </div>
      ))}
    </div>
  );
}
