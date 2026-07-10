export function BarList({
  title,
  items,
  formatValue,
}: {
  title: string;
  items: { label: string; value: number }[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="border-ink-100 bg-white p-5">
      <h3 className="mb-4 text-sm font-bold uppercase">{title}</h3>
      {items.length === 0 ? (
        <p className="text-ink-400 text-xs">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium">{item.label}</span>
                <span className="text-ink-400">{formatValue ? formatValue(item.value) : item.value}</span>
              </div>
              <div className="bg-ink-100 h-1.5 w-full">
                <div className="bg-accent h-full" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
