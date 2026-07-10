import Link from "next/link";
import Image from "next/image";
import { SectionHeading } from "@/components/ui/section-heading";

interface CategoryCard {
  slug: string;
  name: string;
  imageUrl: string | null;
}

export function ShopByCategory({ categories }: { categories: CategoryCard[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="container-aneem py-14 lg:py-20">
      <SectionHeading eyebrow="Categorized For You" title="Shop by Category" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((c) => (
          <Link key={c.slug} href={`/collections/${c.slug}`} className="group block">
            <div className="relative aspect-square overflow-hidden bg-ink-50">
              <Image
                src={c.imageUrl ?? `https://picsum.photos/seed/${c.slug}/600/600`}
                alt={c.name}
                fill
                sizes="200px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/40" />
              <span className="absolute inset-x-0 bottom-3 text-center text-xs font-bold uppercase tracking-wide text-white">
                {c.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
