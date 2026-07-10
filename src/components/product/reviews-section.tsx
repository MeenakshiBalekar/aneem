import { RatingStars } from "@/components/ui/rating-stars";
import { Badge } from "@/components/ui/badge";

interface ReviewData {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  user: { name: string | null };
}

export function ReviewsSection({ reviews, avgRating, reviewCount }: { reviews: ReviewData[]; avgRating: number; reviewCount: number }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <span className="text-4xl font-black">{avgRating.toFixed(1)}</span>
        <div>
          <RatingStars rating={avgRating} size={18} />
          <p className="text-ink-400 text-xs">{reviewCount} reviews</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="text-ink-400 text-sm">No reviews yet. Be the first to review this product.</p>
      ) : (
        <ul className="space-y-6">
          {reviews.map((r) => (
            <li key={r.id} className="border-ink-100 border-b pb-6">
              <div className="mb-1 flex items-center gap-2">
                <RatingStars rating={r.rating} />
                {r.isVerifiedPurchase && <Badge variant="outline">Verified Purchase</Badge>}
              </div>
              {r.title && <h4 className="mt-2 text-sm font-bold">{r.title}</h4>}
              {r.body && <p className="text-ink-600 mt-1 text-sm leading-relaxed">{r.body}</p>}
              <p className="text-ink-400 mt-2 text-xs">
                {r.user.name ?? "Verified Buyer"} · {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
