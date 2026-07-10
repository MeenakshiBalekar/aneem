import Link from "next/link";
import { getDailyActionItems } from "@/lib/founder/action-center";
import { cn } from "@/lib/utils";

const DOT_COLOR = { red: "bg-red-500", orange: "bg-orange-400", green: "bg-emerald-500" };

export async function DailyActionBanner() {
  const items = await getDailyActionItems();
  if (items.length === 0) return null;

  return (
    <div className="mb-6 border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">Today&apos;s Priorities</p>
      <ul className="space-y-2">
        {items.map((item, i) => {
          const content = (
            <span className="flex items-center gap-2.5 text-sm">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_COLOR[item.severity])} />
              {item.text}
            </span>
          );
          return (
            <li key={i}>
              {item.href ? (
                <Link href={item.href} className="hover:text-accent transition-colors">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
