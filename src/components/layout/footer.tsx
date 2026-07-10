import Link from "next/link";
import { Instagram, Facebook, Youtube } from "lucide-react";
import { NewsletterForm } from "@/components/home/newsletter";

export function Footer() {
  return (
    <footer className="bg-ink mt-24 text-white">
      <div className="container-aneem grid gap-10 py-16 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <h3 className="text-3xl font-black uppercase">Aneem</h3>
          <p className="text-ink-200 mt-4 max-w-sm text-sm">
            Premium oversized streetwear for the ones who dress louder than they talk. Designed in India, worn
            everywhere.
          </p>
          <div className="mt-6 flex gap-4">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Instagram size={20} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
              <Facebook size={20} />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">
              <Youtube size={20} />
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-ink-200">Shop</h4>
          <ul className="space-y-3 text-sm">
            <li><Link href="/collections/mens-oversized-tshirts">Oversized Tees</Link></li>
            <li><Link href="/collections/hoodies">Hoodies</Link></li>
            <li><Link href="/collections/mens-gym-tshirts">Gym Wear</Link></li>
            <li><Link href="/bundles">Bundles</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-ink-200">Support</h4>
          <ul className="space-y-3 text-sm">
            <li><Link href="/account/orders">Track Order</Link></li>
            <li><Link href="/pages/shipping">Shipping Policy</Link></li>
            <li><Link href="/pages/returns">Returns &amp; Exchanges</Link></li>
            <li><Link href="/pages/size-guide">Size Guide</Link></li>
            <li><Link href="/pages/contact">Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-ink-200">Stay in the loop</h4>
          <p className="text-ink-200 mb-4 text-sm">Drops, restocks, and offers — straight to your inbox.</p>
          <NewsletterForm variant="dark" />
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <div className="container-aneem flex flex-col items-center justify-between gap-2 text-xs text-ink-200 sm:flex-row">
          <p>© {new Date().getFullYear()} Aneem. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/pages/privacy">Privacy Policy</Link>
            <Link href="/pages/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
