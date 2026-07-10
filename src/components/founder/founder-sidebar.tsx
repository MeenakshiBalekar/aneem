"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  PhoneCall,
  ClipboardList,
  IndianRupee,
  Megaphone,
  Boxes,
  Sparkles,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/founder", label: "Dashboard", icon: LayoutDashboard },
  { href: "/founder/calling-queue", label: "Calling Queue", icon: PhoneCall },
  { href: "/founder/orders", label: "Orders", icon: ClipboardList },
  { href: "/founder/profit", label: "Profit", icon: IndianRupee },
  { href: "/founder/marketing", label: "Marketing", icon: Megaphone },
  { href: "/founder/inventory", label: "Inventory", icon: Boxes },
  { href: "/founder/copilot", label: "AI Copilot", icon: Sparkles },
  { href: "/founder/settings/security", label: "Security", icon: ShieldCheck },
];

export function FounderSidebar({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#0b0d12] p-5">
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest text-white/40">Aneem</p>
        <p className="text-lg font-bold">Founder Portal</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/founder" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 pt-4">
        <p className="mb-2 truncate text-xs text-white/40">{name}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/founder/login" })}
          className="flex items-center gap-2 text-xs font-medium text-red-400 hover:text-red-300"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
