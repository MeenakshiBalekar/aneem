import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { CSRF_COOKIE_NAME, generateCsrfToken } from "@/lib/founder/csrf";

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
  // Founder login gets the tightest limit of anything in the app — it's the
  // single highest-value credential-stuffing target.
  { pattern: /^\/api\/founder-auth\/callback\/credentials$/, limit: 8 },
];

// Host that serves the Founder Portal. Set via env so dev (founder.localhost:3000)
// and prod (founder.aneem.in) both work without code changes.
const FOUNDER_HOST = process.env.FOUNDER_PORTAL_HOST ?? "founder.localhost:3000";

function isFounderPath(pathname: string): boolean {
  return (
    pathname.startsWith("/founder") ||
    pathname.startsWith("/api/founder-auth") ||
    pathname.startsWith("/api/founder/")
  );
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;
  const onFounderHost = host === FOUNDER_HOST;
  const requestingFounderPath = isFounderPath(pathname);

  // Hard isolation: the founder subdomain serves *only* founder routes, and
  // founder routes are served *only* on the founder subdomain. Someone who
  // guesses /founder/dashboard on aneem.in gets a plain 404 — not a
  // redirect, not a login prompt, nothing that confirms the route exists.
  if (requestingFounderPath !== onFounderHost) {
    return new NextResponse(null, { status: 404 });
  }

  const rule = LIMITS.find((r) => r.pattern.test(pathname));
  const res = NextResponse.next();

  if (rule) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { allowed, remaining } = checkRateLimit(`${ip}:${pathname}`, rule.limit);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
    }
    res.headers.set("X-RateLimit-Remaining", String(remaining));
  }

  if (onFounderHost && !req.cookies.get(CSRF_COOKIE_NAME)) {
    res.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
      httpOnly: false, // must be JS-readable so founderFetch() can echo it as a header
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
