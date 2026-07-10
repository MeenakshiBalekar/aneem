import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data/catalog";
import { getBundlesContainingProduct } from "@/lib/bundles/engine";
import { ProductGallery } from "@/components/product/product-gallery";
import { AddToCartPanel } from "@/components/product/add-to-cart-panel";
import { TrustBadges } from "@/components/product/trust-badges";
import { DeliveryEstimate } from "@/components/product/delivery-estimate";
import { FaqAccordion } from "@/components/product/faq-accordion";
import { ReviewsSection } from "@/components/product/reviews-section";
import { WriteReviewForm } from "@/components/product/write-review-form";
import { RecentlyViewed, RecentlyViewedTracker } from "@/components/product/recently-viewed";
import { ProductRail } from "@/components/home/product-rail";
import { BundleOffers } from "@/components/home/bundle-offers";
import { RatingStars } from "@/components/ui/rating-stars";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found" };

  return {
    title: product.seoTitle ?? product.title,
    description: product.seoDescription ?? product.description.slice(0, 155),
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      title: product.title,
      description: product.description.slice(0, 155),
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const bundles = await getBundlesContainingProduct(product.id);
  const relatedProducts = product.crossSellTo.map((r) => ({
    ...r.related,
    basePrice: Number(r.related.basePrice),
    compareAtPrice: r.related.compareAtPrice ? Number(r.related.compareAtPrice) : null,
  }));

  const primaryImage = product.images[0]?.url ?? "https://picsum.photos/seed/placeholder/1200/1500";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.map((i) => i.url),
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: "Aneem" },
    aggregateRating:
      product.reviewCount > 0
        ? { "@type": "AggregateRating", ratingValue: product.avgRating, reviewCount: product.reviewCount }
        : undefined,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: Math.min(...product.variants.map((v) => Number(v.price))),
      highPrice: Math.max(...product.variants.map((v) => Number(v.price))),
      availability: product.variants.some((v) => !v.isOutOfStock)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <RecentlyViewedTracker
        product={{ id: product.id, slug: product.slug, title: product.title, price: Number(product.basePrice), imageUrl: primaryImage }}
      />

      <div className="container-aneem grid gap-10 py-8 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} title={product.title} />

        <div>
          <p className="text-ink-400 text-xs font-semibold uppercase tracking-wide">{product.category.name}</p>
          <h1 className="mt-1 text-2xl font-black uppercase sm:text-3xl">{product.title}</h1>
          {product.reviewCount > 0 && (
            <div className="mt-2">
              <RatingStars rating={product.avgRating} count={product.reviewCount} />
            </div>
          )}

          <div className="mt-4">
            <AddToCartPanel
              productId={product.id}
              slug={product.slug}
              title={product.title}
              imageUrl={primaryImage}
              variants={product.variants.map((v) => ({
                id: v.id,
                size: v.size,
                color: v.color,
                price: Number(v.price),
                compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
                stock: v.stock,
                isOutOfStock: v.isOutOfStock,
              }))}
            />
          </div>

          <div className="mt-6">
            <TrustBadges />
          </div>

          <div className="mt-6">
            <DeliveryEstimate />
          </div>

          <div className="mt-8 space-y-4 text-sm leading-relaxed">
            <p className="text-ink-600">{product.description}</p>
            {product.fabricDetails && (
              <div>
                <h3 className="text-xs font-bold uppercase">Fabric</h3>
                <p className="text-ink-400">{product.fabricDetails}</p>
              </div>
            )}
            {product.washCare && (
              <div>
                <h3 className="text-xs font-bold uppercase">Wash Care</h3>
                <p className="text-ink-400">{product.washCare}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {bundles.length > 0 && (
        <BundleOffers
          bundles={bundles.map((b) => ({
            id: b.id,
            slug: b.slug,
            name: b.name,
            description: b.description,
            discountPercent: Number(b.discountPercent),
            items: b.items.map((i) => ({ quantity: i.quantity, product: { title: i.product.title, basePrice: i.product.basePrice, images: i.product.images } })),
          }))}
        />
      )}

      <ProductRail title="Complete Your Outfit" subtitle="Frequently bought together" products={relatedProducts} />

      <div className="container-aneem grid gap-10 py-14 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-black uppercase">FAQs</h2>
          <FaqAccordion />
        </div>
        <div>
          <h2 className="mb-4 text-xl font-black uppercase">Reviews</h2>
          <ReviewsSection reviews={product.reviews} avgRating={product.avgRating} reviewCount={product.reviewCount} />
          <WriteReviewForm productId={product.id} />
        </div>
      </div>

      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}
