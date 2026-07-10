const MESSAGES = [
  "FREE SHIPPING ABOVE ₹1499",
  "BUY 2 T-SHIRTS, GET 10% OFF",
  "BUY 3, GET 15% OFF",
  "COD AVAILABLE PAN INDIA",
];

export function AnnouncementBar() {
  const loop = [...MESSAGES, ...MESSAGES];
  return (
    <div className="bg-ink overflow-hidden text-white">
      <div className="animate-marquee flex w-max gap-16 whitespace-nowrap py-2 text-xs font-semibold tracking-wide">
        {loop.map((msg, i) => (
          <span key={i}>{msg}</span>
        ))}
      </div>
    </div>
  );
}
