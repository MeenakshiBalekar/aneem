import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "accent" | "outline" | "danger";
  className?: string;
}) {
  const variants = {
    default: "bg-ink text-white",
    accent: "bg-accent text-ink",
    outline: "border border-ink text-ink",
    danger: "bg-red-600 text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
