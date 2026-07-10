import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  href,
  trend,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  trend?: { value: number; label?: string };
  className?: string;
}) {
  const content = (
    <div className={cn("border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1.5 text-2xl font-black">{value}</p>
      {trend && (
        <p className={cn("mt-1 text-xs font-semibold", trend.value >= 0 ? "text-emerald-400" : "text-red-400")}>
          {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value).toFixed(1)}% {trend.label ?? ""}
        </p>
      )}
      {hint && <p className="mt-1 text-[11px] text-white/30">{hint}</p>}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
