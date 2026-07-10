import { Truck, ShieldCheck, RotateCcw, Award } from "lucide-react";

const REASONS = [
  { icon: Award, title: "240 GSM+ Fabric", desc: "Heavyweight cotton that holds shape wash after wash." },
  { icon: Truck, title: "Fast, Trackable Shipping", desc: "Dispatched in 24-48h with live tracking to your door." },
  { icon: RotateCcw, title: "7-Day Easy Returns", desc: "Didn't fit right? Free size exchange, no questions asked." },
  { icon: ShieldCheck, title: "100% Secure Payments", desc: "UPI, cards, wallets, and Cash on Delivery — all encrypted." },
];

export function WhyAneem() {
  return (
    <section className="bg-paper py-14 lg:py-20">
      <div className="container-aneem grid grid-cols-2 gap-8 lg:grid-cols-4">
        {REASONS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex flex-col items-start gap-3">
            <Icon size={28} strokeWidth={1.5} />
            <h3 className="text-sm font-bold uppercase">{title}</h3>
            <p className="text-ink-400 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
