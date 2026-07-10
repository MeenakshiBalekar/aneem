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
// and prod (founder.aneem.in) both work without code changes. This MUST be
// set as an environment variable on the Vercel project (Production, and
// Preview if you test there) — if it's unset in an environment, onFounderHost
// is never true there and the founder subdomain silently falls through to
// the storefront instead of 404ing or rewriting.
const FOUNDER_HOST = process.env.FOUNDER_PORTAL_HOST ?? "founder.localhost:3000";

// Every page and redirect in the app already hardcodes the `/founder/...`
// prefix (FounderSidebar links, `redirect("/founder/login")`, the NextAuth
// cookie path, etc). Rather than rewriting that surface area to drop the
// prefix, we treat `src/app/founder` as this *host's* document root: any
// request on the founder subdomain for a path that ISN'T already under
// /founder gets transparently mapped into it. `/` -> `/founder`,
// `/orders` -> `/founder/orders`. Paths that already start with /founder
// (i.e. everything the app itself links to) pass through untouched, so
// there's no double-prefixing.
function isFounderPagePath(pathname: string): boolean {
  return pathname === "/founder" || pathname.startsWith("/founder/");
}

function isFounderApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/founder-auth") || pathname.startsWith("/api/founder/");
}

// Vercel terminates TLS at the edge and proxies the request onward; the
// hostname the visitor actually typed (founder.aneem.in) is carried in
// `x-forwarded-host`. `host` is normally identical but is kept as a
// fallback for other proxies / `next dev`, per Vercel's recommended
// pattern for host-based routing.
function getRequestHost(req: NextRequest): string {
  return req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
}

function finalize(req: NextRequest, onFounderHost: boolean, res: NextResponse): NextResponse {
  const { pathname } = req.nextUrl;
  const rule = LIMITS.find((r) => r.pattern.test(pathname));

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

export function middleware(req: NextRequest) {
  const host = getRequestHost(req);
  const { pathname } = req.nextUrl;
  const onFounderHost = host === FOUNDER_HOST;

  // --- API routes: isolate by host, never rewrite. A rewrite here would
  // break same-origin calls like founderFetch(), which already target the
  // correct /api/founder/* path directly. ---
  if (pathname.startsWith("/api/")) {
    if (isFounderApiPath(pathname) !== onFounderHost) {
      return new NextResponse(null, { status: 404 });
    }
    return finalize(req, onFounderHost, NextResponse.next());
  }

  // --- Page routes ---
  if (onFounderHost) {
    if (isFounderPagePath(pathname)) {
      return finalize(req, onFounderHost, NextResponse.next());
    }
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/founder" : `/founder${pathname}`;
    return finalize(req, onFounderHost, NextResponse.rewrite(url));
  }

  // Main storefront host(s): founder pages must never resolve here — a
  // direct 404, not a redirect, so the route's existence isn't confirmed.
  if (isFounderPagePath(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  return finalize(req, onFounderHost, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
