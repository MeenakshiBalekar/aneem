import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Order Confirmed", robots: { index: false } };

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;

  return (
    <div className="container-aneem flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <CheckCircle2 size={56} className="text-green-600" />
      <h1 className="mt-6 text-3xl font-black uppercase">Order Confirmed</h1>
      {order && (
        <p className="text-ink-400 mt-2">
          Order <span className="font-bold text-ink">{order}</span> has been placed successfully.
        </p>
      )}
      <p className="text-ink-400 mt-1 max-w-md text-sm">
        We&apos;ve sent a confirmation to your email and WhatsApp. We&apos;ll notify you the moment it ships.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/account/orders" className={buttonVariants({ variant: "primary", size: "lg" })}>
          Track Order
        </Link>
        <Link href="/collections/all" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
