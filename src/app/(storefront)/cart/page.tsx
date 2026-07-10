import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { getTrending } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "Your Bag" };
export const revalidate = 300;

export default async function CartPage() {
  const trending = await getTrending(6);
  const upsells = trending.map((p) => ({
    ...p,
    basePrice: Number(p.basePrice),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
  }));

  return <CartView upsells={upsells as never} />;
}
