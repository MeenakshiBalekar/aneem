"use client";

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/founder/csrf";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** fetch() wrapper for founder-portal client components — attaches the
 * CSRF header automatically for mutating requests so callers don't have to
 * remember to. GET requests pass through untouched. */
export async function founderFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (method !== "GET" && method !== "HEAD") {
    const token = readCookie(CSRF_COOKIE_NAME);
    if (token) headers.set(CSRF_HEADER_NAME, token);
  }

  return fetch(input, { ...init, headers });
}
