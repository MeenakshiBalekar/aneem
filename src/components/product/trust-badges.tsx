import { ShieldCheck, Truck, RotateCcw, BadgeIndianRupee } from "lucide-react";

export function TrustBadges() {
  const items = [
    { icon: Truck, label: "Ships in 24-48h" },
    { icon: BadgeIndianRupee, label: "COD Available" },
    { icon: RotateCcw, label: "7-Day Exchange" },
    { icon: ShieldCheck, label: "Secure Checkout" },
  ];
  return (
    <div className="border-ink-100 grid grid-cols-2 gap-3 border-y py-4 sm:grid-cols-4">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 text-xs font-semibold">
          <Icon size={16} />
          {label}
        </div>
      ))}
    </div>
  );
}
