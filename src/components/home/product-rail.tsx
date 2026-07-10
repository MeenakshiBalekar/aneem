import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductCard, type ProductCardData } from "@/components/product/product-card";

export function ProductRail({
  eyebrow,
  title,
  subtitle,
  products,
  viewAllHref,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  products: ProductCardData[];
  viewAllHref?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="container-aneem py-14 lg:py-20">
      <div className="flex items-end justify-between">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} className="mb-8" />
        {viewAllHref && (
          <Link href={viewAllHref} className="hidden text-xs font-bold uppercase underline underline-offset-4 sm:block">
            View All
          </Link>
        )}
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {products.map((p) => (
          <div key={p.id} className="w-[65vw] shrink-0 snap-start sm:w-auto">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      {viewAllHref && (
        <Link href={viewAllHref} className="mt-8 block text-center text-xs font-bold uppercase underline underline-offset-4 sm:hidden">
          View All
        </Link>
      )}
    </section>
  );
}
