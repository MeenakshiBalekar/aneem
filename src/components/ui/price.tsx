import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Price({
  amount,
  compareAt,
  size = "md",
  className,
}: {
  amount: number;
  compareAt?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hasDiscount = compareAt && compareAt > amount;
  const discountPercent = hasDiscount ? Math.round(((compareAt - amount) / compareAt) * 100) : 0;

  const sizeClass = { sm: "text-sm", md: "text-base", lg: "text-2xl" }[size];

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-bold", sizeClass)}>{formatINR(amount)}</span>
      {hasDiscount && (
        <>
          <span className="text-ink-400 text-sm line-through">{formatINR(compareAt)}</span>
          <span className="text-xs font-semibold text-green-700">{discountPercent}% off</span>
        </>
      )}
    </div>
  );
}
