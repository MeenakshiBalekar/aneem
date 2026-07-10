import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({ rating, count, size = 14 }: { rating: number; count?: number; size?: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={size}
            className={cn(i < Math.round(rating) ? "fill-ink text-ink" : "fill-ink-100 text-ink-100")}
          />
        ))}
      </div>
      {typeof count === "number" && <span className="text-ink-400 text-xs">({count})</span>}
    </div>
  );
}
