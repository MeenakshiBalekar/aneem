import { NextResponse } from "next/server";

export const CSRF_COOKIE_NAME = "founder-csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

// Uses Web Crypto (globalThis.crypto) rather than node:crypto — this file
// is imported from src/middleware.ts, which runs on the Edge runtime and
// doesn't support Node's crypto module. Web Crypto is available in both
// Edge and Node 18+, so the same code works from API routes too.
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Double-submit-cookie CSRF check for founder API mutation routes. The
 * cookie is set by middleware.ts on every founder-portal page load; the
 * client (src/lib/founder/fetch-client.ts) echoes it back as a header on
 * every mutating request. A cross-site form/fetch can't read the cookie
 * (browsers block cross-origin cookie reads), so it can't produce a
 * matching header value. */
export function verifyCsrfToken(req: Request): boolean {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieToken = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.split("=")[1];

  const headerToken = req.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) return false;
  return timingSafeEqual(cookieToken, headerToken);
}

export function csrfRejectedResponse() {
  return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
}
