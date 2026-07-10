export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-ink-100 bg-white p-5">
      <p className="text-ink-400 text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {hint && <p className="text-ink-400 mt-1 text-xs">{hint}</p>}
    </div>
  );
}
