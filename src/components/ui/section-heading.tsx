import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("mb-8", align === "center" && "text-center", className)}>
      {eyebrow && (
        <p className="text-accent-dark mb-2 text-xs font-bold uppercase tracking-[0.2em]">{eyebrow}</p>
      )}
      <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="text-ink-400 mt-2 max-w-xl text-sm sm:text-base">{subtitle}</p>}
    </div>
  );
}
