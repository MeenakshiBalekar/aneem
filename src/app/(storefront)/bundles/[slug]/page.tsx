import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getBundleBySlug } from "@/lib/bundles/engine";
import { computeBundlePrice } from "@/lib/bundles/engine";
import { formatINR } from "@/lib/utils";
import { AddBundleToCartButton } from "@/components/product/add-bundle-to-cart-button";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getBundleBySlug(slug);
  if (!bundle) return { title: "Bundle Not Found" };
  return { title: bundle.name, description: bundle.description ?? undefined, alternates: { canonical: `/bundles/${slug}` } };
}

export default async function BundleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bundle = await getBundleBySlug(slug);
  if (!bundle) notFound();

  const items = bundle.items.map((i) => ({ price: Number(i.product.basePrice), quantity: i.quantity }));
  const { fullPrice, bundlePrice, youSave } = computeBundlePrice(items, Number(bundle.discountPercent));

  return (
    <div className="container-aneem grid gap-10 py-10 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-2">
        {bundle.items.map((item) => (
          <div key={item.id} className="relative aspect-square overflow-hidden bg-ink-50">
            <Image
              src={item.product.images[0]?.url ?? "https://picsum.photos/seed/bundle/600/600"}
              alt={item.product.title}
              fill
              sizes="300px"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div>
        <h1 className="text-3xl font-black uppercase">{bundle.name}</h1>
        <p className="text-ink-400 mt-2">{bundle.description}</p>

        <div className="mt-6 flex items-baseline gap-3">
          <span className="text-3xl font-black">{formatINR(bundlePrice)}</span>
          <span className="text-ink-400 text-lg line-through">{formatINR(fullPrice)}</span>
          <span className="text-sm font-bold text-green-700">Save {formatINR(youSave)}</span>
        </div>

        <ul className="mt-6 space-y-2">
          {bundle.items.map((item) => (
            <li key={item.id} className="border-ink-100 flex justify-between border-b py-2 text-sm">
              <span>
                {item.product.title} x{item.quantity}
              </span>
              <span className="text-ink-400">{formatINR(Number(item.product.basePrice) * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <AddBundleToCartButton
            products={bundle.items.map((item) => ({
              productId: item.product.id,
              slug: item.product.slug,
              title: item.product.title,
              imageUrl: item.product.images[0]?.url ?? "https://picsum.photos/seed/bundle/600/600",
              variants: item.product.variants.map((v) => ({
                id: v.id,
                size: v.size,
                color: v.color,
                price: Number(v.price),
                stock: v.stock,
                isOutOfStock: v.isOutOfStock,
              })),
            }))}
          />
          <p className="text-ink-400 mt-2 text-center text-xs">
            Default size added for each item — adjust sizes in your bag before checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
