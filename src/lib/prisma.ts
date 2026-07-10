import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

// A Proxy defers actually constructing PrismaClient (which throws if
// DATABASE_URL isn't set) from module-import time to first real query.
// `next build` imports every API route module during its "Collect page
// data" step regardless of whether the route ever runs, so an eagerly
// constructed client crashes the build in any environment where
// DATABASE_URL isn't visible at build time — even though the route is
// perfectly fine once deployed with the env var set at runtime.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
