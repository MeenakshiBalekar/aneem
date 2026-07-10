import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="bg-ink relative flex min-h-[80vh] items-end overflow-hidden text-white lg:min-h-[92vh]">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-70"
        style={{ backgroundImage: "url(https://picsum.photos/seed/aneem-hero/1800/1200)" }}
      />
      <div className="from-ink absolute inset-0 bg-gradient-to-t via-black/20 to-transparent" />
      <div className="container-aneem relative z-10 pb-16 pt-32 lg:pb-24">
        <p className="text-accent mb-4 text-xs font-bold uppercase tracking-[0.3em]">New Season Drop</p>
        <h1 className="max-w-3xl text-5xl font-black uppercase leading-[0.95] tracking-tightest sm:text-7xl lg:text-8xl">
          Dress
          <br />
          Louder
        </h1>
        <p className="mt-6 max-w-md text-sm text-ink-100 sm:text-base">
          Heavyweight oversized streetwear, built for the culture. Free shipping above ₹1499.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/collections/all" className={cn(buttonVariants({ variant: "accent", size: "lg" }))}>
            Shop New Arrivals
          </Link>
          <Link
            href="/bundles"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-white text-white hover:bg-white hover:text-ink")}
          >
            Explore Bundles
          </Link>
        </div>
      </div>
    </section>
  );
}
