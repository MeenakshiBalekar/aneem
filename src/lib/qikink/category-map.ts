// Single source of truth for how Qikink's flat category names map into our
// two-level catalog (Men / Women / Accessories -> sub-categories). Both the
// live sync (sync.ts) and the local dev seed (prisma/seed.ts) import this so
// the two never drift apart.

export const PARENT_CATEGORIES = {
  men: { slug: "men", name: "Men" },
  women: { slug: "women", name: "Women" },
  accessories: { slug: "accessories", name: "Accessories" },
} as const;

export type ParentCategoryKey = keyof typeof PARENT_CATEGORIES;

interface LeafCategoryDef {
  slug: string;
  parent: ParentCategoryKey | null;
}

// A Qikink category not listed here still gets a category created for it
// (via slugify() as a fallback) — new product types in Qikink are never
// silently dropped, they just start out ungrouped until added here.
export const CATEGORY_MAP: Record<string, LeafCategoryDef> = {
  "Men's Oversized T-Shirts": { slug: "mens-oversized-tshirts", parent: "men" },
  "Men's Gym T-Shirts": { slug: "mens-gym-tshirts", parent: "men" },
  "Men's Oversized Shirts": { slug: "mens-oversized-shirts", parent: "men" },
  "Women's Oversized T-Shirts": { slug: "womens-oversized-tshirts", parent: "women" },
  "Women's Gym T-Shirts": { slug: "womens-gym-tshirts", parent: "women" },
  Hoodies: { slug: "hoodies", parent: "men" },
  Sweatshirts: { slug: "sweatshirts", parent: "men" },
  Jackets: { slug: "jackets", parent: "men" },
  Caps: { slug: "caps", parent: "accessories" },
  Bottles: { slug: "bottles", parent: "accessories" },
  Tumblers: { slug: "tumblers", parent: "accessories" },
};
