import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, bundles] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    prisma.bundle.findMany({ where: { isActive: true }, select: { slug: true } }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/collections/all`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/bundles`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/style-assistant`, changeFrequency: "monthly", priority: 0.5 },
  ];

  return [
    ...staticRoutes,
    ...categories.map((c) => ({ url: `${SITE_URL}/collections/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...bundles.map((b) => ({ url: `${SITE_URL}/bundles/${b.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
