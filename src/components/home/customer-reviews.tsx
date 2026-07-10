import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { RatingStars } from "@/components/ui/rating-stars";

interface ReviewCard {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  user: { name: string | null };
  product: { title: string; slug: string };
}

export function CustomerReviews({ reviews }: { reviews: ReviewCard[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="bg-paper py-14 lg:py-20">
      <div className="container-aneem">
        <SectionHeading eyebrow="Real Talk" title="What Aneem Wearers Say" align="center" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <div key={r.id} className="border-ink-100 bg-white p-6">
              <RatingStars rating={r.rating} />
              {r.title && <h4 className="mt-3 text-sm font-bold">{r.title}</h4>}
              {r.body && <p className="text-ink-600 mt-2 text-sm leading-relaxed">{r.body}</p>}
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="font-semibold">{r.user.name ?? "Verified Buyer"}</span>
                <Link href={`/products/${r.product.slug}`} className="text-ink-400 underline underline-offset-2">
                  {r.product.title}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
