import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { ProductRail } from "@/components/home/product-rail";
import { ShopByCategory } from "@/components/home/shop-by-category";
import { WhyAneem } from "@/components/home/why-aneem";
import { BundleOffers } from "@/components/home/bundle-offers";
import { CustomerReviews } from "@/components/home/customer-reviews";
import { InstagramFeed } from "@/components/home/instagram-feed";
import { NewsletterForm } from "@/components/home/newsletter";
import { SectionHeading } from "@/components/ui/section-heading";
import { getBestSellers, getFeaturedReviews, getNewArrivals, getShopCategories, getTrending } from "@/lib/data/catalog";
import { getActiveBundles } from "@/lib/bundles/engine";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Premium Oversized Streetwear for Men & Women",
  alternates: { canonical: "/" },
};

function toCardData<T extends { basePrice: unknown; compareAtPrice: unknown }>(products: T[]) {
  return products.map((p) => ({
    ...p,
    basePrice: Number(p.basePrice),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
  })) as never;
}

export default async function HomePage() {
  const [bestSellers, newArrivals, trending, categories, bundles, reviews] = await Promise.all([
    getBestSellers(),
    getNewArrivals(),
    getTrending(),
    getShopCategories(),
    getActiveBundles(),
    getFeaturedReviews(),
  ]);

  return (
    <>
      <Hero />
      <ProductRail
        eyebrow="Most Loved"
        title="Best Sellers"
        subtitle="The pieces that sell out first, every single drop."
        products={toCardData(bestSellers)}
        viewAllHref="/collections/all?sort=rating"
      />
      <ShopByCategory categories={categories} />
      <ProductRail
        eyebrow="Just Landed"
        title="New Arrivals"
        subtitle="Fresh off production. Limited first-run stock."
        products={toCardData(newArrivals)}
        viewAllHref="/collections/all?sort=newest"
      />
      <WhyAneem />
      <BundleOffers bundles={bundles as never} />
      <ProductRail
        eyebrow="Right Now"
        title="Trending"
        subtitle="What everyone's adding to their bag this week."
        products={toCardData(trending)}
        viewAllHref="/collections/all"
      />
      <CustomerReviews reviews={reviews as never} />
      <InstagramFeed />
      <section className="bg-ink py-16 text-white">
        <div className="container-aneem">
          <SectionHeading eyebrow="Never Miss a Drop" title="Join the Aneem List" align="center" />
          <div className="flex justify-center">
            <NewsletterForm variant="dark" />
          </div>
        </div>
      </section>
    </>
  );
}
