import { amountRemainingForFreeShipping, formatINR, isFreeShippingEligible } from "@/lib/utils";

export function FreeShippingBar({ subtotal, threshold = 1499 }: { subtotal: number; threshold?: number }) {
  const eligible = isFreeShippingEligible(subtotal, threshold);
  const remaining = amountRemainingForFreeShipping(subtotal, threshold);
  const percent = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div>
      <p className="mb-2 text-xs font-semibold">
        {eligible ? (
          <span className="text-green-700">You&apos;ve unlocked FREE shipping 🎉</span>
        ) : (
          <>
            Add <span className="font-bold">{formatINR(remaining)}</span> more for FREE shipping
          </>
        )}
      </p>
      <div className="bg-ink-100 h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="bg-accent h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
