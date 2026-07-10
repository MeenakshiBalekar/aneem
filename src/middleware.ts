import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

// Coarse per-IP rate limits on the routes most worth protecting: auth
// (credential stuffing) and checkout/order creation (abuse, inventory
// exhaustion). Webhooks are excluded — they're protected by signature
// verification instead, and a legitimate burst of fulfillment events
// shouldn't get throttled.
const LIMITS: { pattern: RegExp; limit: number }[] = [
  { pattern: /^\/api\/auth\/register$/, limit: 10 },
  { pattern: /^\/api\/auth\/callback\/credentials$/, limit: 15 },
  { pattern: /^\/api\/checkout\//, limit: 20 },
  { pattern: /^\/api\/reviews$/, limit: 10 },
];

export function middleware(req: NextRequest) {
  const rule = LIMITS.find((r) => r.pattern.test(req.nextUrl.pathname));
  if (!rule) return NextResponse.next();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed, remaining } = checkRateLimit(`${ip}:${req.nextUrl.pathname}`, rule.limit);

  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  return res;
}

export const config = {
  matcher: ["/api/auth/register", "/api/auth/callback/credentials", "/api/checkout/:path*", "/api/reviews"],
};
