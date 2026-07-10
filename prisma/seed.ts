import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { MOCK_QIKINK_PRODUCTS } from "../src/lib/qikink/mock-data";
import { slugify } from "../src/lib/utils";

const prisma = new PrismaClient();

const CATEGORY_SLUG_MAP: Record<string, string> = {
  "Men's Oversized T-Shirts": "mens-oversized-tshirts",
  "Men's Gym T-Shirts": "mens-gym-tshirts",
  "Men's Oversized Shirts": "mens-oversized-shirts",
  "Women's Oversized T-Shirts": "womens-oversized-tshirts",
  "Women's Gym T-Shirts": "womens-gym-tshirts",
  Caps: "caps",
  Bottles: "bottles",
  Tumblers: "tumblers",
  Hoodies: "hoodies",
  Sweatshirts: "sweatshirts",
  Jackets: "jackets",
};

async function main() {
  console.log("Seeding categories...");
  const categoryOrder = Object.entries(CATEGORY_SLUG_MAP);
  for (const [name, slug] of categoryOrder) {
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, sortOrder: categoryOrder.findIndex(([n]) => n === name) },
    });
  }

  console.log("Seeding products from Qikink fixtures...");
  for (const qp of MOCK_QIKINK_PRODUCTS) {
    const categorySlug = CATEGORY_SLUG_MAP[qp.category] ?? slugify(qp.category);
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: categorySlug } });
    const slug = slugify(qp.name);
    const totalStock = qp.variants.reduce((sum, v) => sum + v.quantity, 0);

    const product = await prisma.product.upsert({
      where: { qikinkProductId: qp.product_id },
      update: {},
      create: {
        qikinkProductId: qp.product_id,
        title: qp.name,
        slug,
        description: qp.description,
        fabricDetails: qp.fabric,
        washCare: qp.care_instructions,
        categoryId: category.id,
        basePrice: qp.base_price,
        compareAtPrice: qp.mrp,
        isActive: totalStock > 0,
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({
      data: qp.images.map((img, i) => ({
        productId: product.id,
        url: img.url,
        altText: img.alt_text ?? qp.name,
        sortOrder: img.is_primary ? 0 : i + 1,
        isLifestyle: !img.is_primary,
      })),
    });

    for (const variant of qp.variants) {
      await prisma.productVariant.upsert({
        where: { qikinkVariantId: variant.variant_id },
        update: {},
        create: {
          qikinkVariantId: variant.variant_id,
          productId: product.id,
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          price: variant.price,
          compareAtPrice: variant.mrp,
          stock: variant.quantity,
          isOutOfStock: variant.quantity <= 0,
          weightGrams: variant.weight_grams,
        },
      });
    }
  }

  console.log("Flagging best sellers / new arrivals / trending...");
  const allProducts = await prisma.product.findMany();
  const flagBatches: Record<string, string[]> = {
    isBestSeller: ["blackout-oversized-tee", "oversized-fleece-hoodie-jet-black", "performance-gym-tee-dry-fit"],
    isNewArrival: ["essential-oversized-sweatshirt-charcoal", "coach-jacket-windbreaker", "womens-oversized-tee-dusty-pink"],
    isTrending: ["concrete-grey-oversized-tee", "heavy-cotton-oversized-shirt-olive", "aneem-signature-cap-black"],
  };
  for (const [flag, slugs] of Object.entries(flagBatches)) {
    for (const slug of slugs) {
      const product = allProducts.find((p) => p.slug === slug);
      if (product) await prisma.product.update({ where: { id: product.id }, data: { [flag]: true } });
    }
  }

  console.log("Seeding bundles...");
  const tee = allProducts.find((p) => p.slug === "blackout-oversized-tee");
  const cap = allProducts.find((p) => p.slug === "aneem-signature-cap-black");
  const bottle = allProducts.find((p) => p.slug === "aneem-steel-bottle-750ml");
  const tumbler = allProducts.find((p) => p.slug === "aneem-travel-tumbler-500ml");

  if (tee && cap) {
    const starterKit = await prisma.bundle.upsert({
      where: { slug: "starter-kit" },
      update: {},
      create: { name: "Starter Kit", slug: "starter-kit", description: "Oversized Tee + Cap", discountPercent: 10, sortOrder: 1 },
    });
    await prisma.bundleItem.deleteMany({ where: { bundleId: starterKit.id } });
    await prisma.bundleItem.createMany({
      data: [
        { bundleId: starterKit.id, productId: tee.id, quantity: 1 },
        { bundleId: starterKit.id, productId: cap.id, quantity: 1 },
      ],
    });
  }

  if (tee && bottle) {
    const travelKit = await prisma.bundle.upsert({
      where: { slug: "travel-kit" },
      update: {},
      create: { name: "Travel Kit", slug: "travel-kit", description: "Oversized Tee + Bottle", discountPercent: 12, sortOrder: 2 },
    });
    await prisma.bundleItem.deleteMany({ where: { bundleId: travelKit.id } });
    await prisma.bundleItem.createMany({
      data: [
        { bundleId: travelKit.id, productId: tee.id, quantity: 1 },
        { bundleId: travelKit.id, productId: bottle.id, quantity: 1 },
      ],
    });
  }

  if (tee && cap && bottle) {
    const premiumKit = await prisma.bundle.upsert({
      where: { slug: "premium-streetwear-kit" },
      update: {},
      create: {
        name: "Premium Streetwear Kit",
        slug: "premium-streetwear-kit",
        description: "Oversized Tee + Cap + Bottle",
        discountPercent: 15,
        sortOrder: 3,
      },
    });
    await prisma.bundleItem.deleteMany({ where: { bundleId: premiumKit.id } });
    await prisma.bundleItem.createMany({
      data: [
        { bundleId: premiumKit.id, productId: tee.id, quantity: 1 },
        { bundleId: premiumKit.id, productId: cap.id, quantity: 1 },
        { bundleId: premiumKit.id, productId: bottle.id, quantity: 1 },
      ],
    });
  }

  console.log("Seeding cross-sell relations...");
  if (tee && cap) {
    await prisma.productRelation.upsert({
      where: { sourceId_relatedId_type: { sourceId: tee.id, relatedId: cap.id, type: "FREQUENTLY_BOUGHT_TOGETHER" } },
      update: {},
      create: { sourceId: tee.id, relatedId: cap.id, type: "FREQUENTLY_BOUGHT_TOGETHER" },
    });
  }
  if (tee && tumbler) {
    await prisma.productRelation.upsert({
      where: { sourceId_relatedId_type: { sourceId: tee.id, relatedId: tumbler.id, type: "CROSS_SELL" } },
      update: {},
      create: { sourceId: tee.id, relatedId: tumbler.id, type: "CROSS_SELL" },
    });
  }

  console.log("Seeding discount rules...");
  await prisma.discountRule.upsert({
    where: { id: "seed-qty-2" },
    update: {},
    create: {
      id: "seed-qty-2",
      name: "Buy 2, Get 10% Off",
      type: "QUANTITY_BREAK",
      valueType: "PERCENTAGE",
      value: 10,
      minQuantity: 2,
      stackable: false,
    },
  });
  await prisma.discountRule.upsert({
    where: { id: "seed-qty-3" },
    update: {},
    create: {
      id: "seed-qty-3",
      name: "Buy 3+, Get 15% Off",
      type: "QUANTITY_BREAK",
      valueType: "PERCENTAGE",
      value: 15,
      minQuantity: 3,
      stackable: false,
    },
  });
  await prisma.discountRule.upsert({
    where: { id: "seed-free-shipping" },
    update: {},
    create: {
      id: "seed-free-shipping",
      name: "Free Shipping Above ₹1499",
      type: "FREE_SHIPPING_THRESHOLD",
      valueType: "FREE_SHIPPING",
      value: 0,
      minAmount: 1499,
      stackable: true,
    },
  });
  await prisma.discountRule.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      id: "seed-welcome10",
      name: "Welcome Offer",
      type: "COUPON",
      valueType: "PERCENTAGE",
      value: 10,
      code: "WELCOME10",
      minAmount: 999,
      stackable: false,
    },
  });

  console.log("Seeding admin user...");
  const adminPassword = await bcrypt.hash("Admin@12345", 12);
  await prisma.user.upsert({
    where: { email: "admin@aneem.in" },
    update: {},
    create: {
      name: "Aneem Admin",
      email: "admin@aneem.in",
      passwordHash: adminPassword,
      role: "ADMIN",
      referralCode: "ANEEMADMIN",
    },
  });

  console.log("Seed complete. Admin login: admin@aneem.in / Admin@12345 (change immediately in production).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
