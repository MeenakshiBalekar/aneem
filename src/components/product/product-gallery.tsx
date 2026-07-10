"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, title }: { images: { url: string; altText: string | null }[]; title: string }) {
  const list = images.length ? images : [{ url: "https://picsum.photos/seed/placeholder/1200/1500", altText: title }];
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-3 sm:flex-row-reverse">
      <div className="relative aspect-[4/5] flex-1 overflow-hidden bg-ink-50">
        <Image
          src={list[active].url}
          alt={list[active].altText ?? title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto sm:w-20 sm:flex-col sm:overflow-y-auto">
        {list.map((img, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={cn(
              "relative aspect-square w-16 shrink-0 overflow-hidden border-2 sm:w-full",
              active === i ? "border-ink" : "border-transparent",
            )}
          >
            <Image src={img.url} alt={img.altText ?? title} fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
