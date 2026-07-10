// In-memory sliding-window rate limiter. Fine for a single Node/serverless
// instance; on multi-region Vercel deployments swap the Map for Upstash
// Redis (@upstash/ratelimit) — the call sites in middleware.ts don't change.

const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count };
}

// Periodic cleanup so the map doesn't grow unbounded on a long-lived process.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of Array.from(buckets.entries())) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, WINDOW_MS).unref?.();
}
