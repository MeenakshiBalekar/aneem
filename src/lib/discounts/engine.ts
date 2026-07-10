import "server-only";
import { prisma } from "@/lib/prisma";
import { isFreeShippingEligible } from "@/lib/utils";

export interface CartLineForDiscount {
  productId: string;
  categoryId: string | null;
  quantity: number;
  unitPrice: number;
}

export interface DiscountResult {
  label: string;
  amount: number; // rupees, always positive
  freeShipping: boolean;
  code?: string;
}

export interface DiscountEvaluation {
  subtotal: number;
  discounts: DiscountResult[];
  totalDiscount: number;
  freeShipping: boolean;
  shippingAmount: number;
}

const STANDARD_SHIPPING = 79;
const FREE_SHIPPING_THRESHOLD = 1499;

/**
 * Configurable discount engine. Rules live in the DiscountRule table so
 * marketing can launch/retire offers (qty breaks, coupons, free-shipping
 * thresholds, limited-time sales) from the admin without a deploy.
 *
 * Rules are additive unless `stackable` is false, in which case only the
 * single best non-stackable rule applies alongside any stackable ones.
 */
export async function evaluateDiscounts(
  lines: CartLineForDiscount[],
  opts: { couponCode?: string } = {},
): Promise<DiscountEvaluation> {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
  const now = new Date();

  const rules = await prisma.discountRule.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
  });

  const applicable: { rule: (typeof rules)[number]; amount: number; freeShipping: boolean }[] = [];

  for (const rule of rules) {
    if (rule.code && rule.code !== opts.couponCode) continue; // coupon requires explicit code match
    if (!rule.code && rule.type === "COUPON") continue; // coupon rules never auto-apply

    if (rule.usageLimit && rule.usageCount >= rule.usageLimit) continue;

    switch (rule.type) {
      case "QUANTITY_BREAK": {
        if (rule.minQuantity && totalQuantity >= rule.minQuantity) {
          const amount =
            rule.valueType === "PERCENTAGE" ? subtotal * (Number(rule.value) / 100) : Number(rule.value);
          applicable.push({ rule, amount, freeShipping: false });
        }
        break;
      }
      case "FREE_SHIPPING_THRESHOLD": {
        if (isFreeShippingEligible(subtotal, rule.minAmount ? Number(rule.minAmount) : FREE_SHIPPING_THRESHOLD)) {
          applicable.push({ rule, amount: 0, freeShipping: true });
        }
        break;
      }
      case "COUPON":
      case "LIMITED_TIME": {
        if (rule.minAmount && subtotal < Number(rule.minAmount)) break;
        if (rule.valueType === "FREE_SHIPPING") {
          applicable.push({ rule, amount: 0, freeShipping: true });
        } else {
          const amount =
            rule.valueType === "PERCENTAGE" ? subtotal * (Number(rule.value) / 100) : Number(rule.value);
          applicable.push({ rule, amount, freeShipping: false });
        }
        break;
      }
      case "BUNDLE":
        // Bundle discounts aren't DiscountRule rows — see bundleDiscounts below,
        // which detects complete bundle sets directly from the Bundle table.
        break;
    }
  }

  const stackable = applicable.filter((a) => a.rule.stackable);
  const nonStackable = applicable.filter((a) => !a.rule.stackable);
  const bestNonStackable = nonStackable.sort((a, b) => b.amount - a.amount)[0];

  const chosen = bestNonStackable ? [...stackable, bestNonStackable] : stackable;

  const discounts: DiscountResult[] = chosen.map((c) => ({
    label: c.rule.name,
    amount: Math.round(c.amount),
    freeShipping: c.freeShipping,
    code: c.rule.code ?? undefined,
  }));

  // Bundle detection: if the cart contains every product a Bundle requires
  // (in sufficient quantity), the bundle's discount% applies automatically
  // to the sum of just those items — no special "buy as bundle" cart action
  // needed, and the server always re-derives this from real cart contents
  // rather than trusting a client-supplied bundle price.
  const quantityByProduct = new Map<string, number>();
  const priceByProduct = new Map<string, number>();
  for (const line of lines) {
    quantityByProduct.set(line.productId, (quantityByProduct.get(line.productId) ?? 0) + line.quantity);
    priceByProduct.set(line.productId, line.unitPrice);
  }

  const activeBundles = await prisma.bundle.findMany({
    where: { isActive: true },
    include: { items: true },
  });

  for (const bundle of activeBundles) {
    const requiredItems = bundle.items.filter((i) => !i.isOptional);
    const satisfied = requiredItems.every((i) => (quantityByProduct.get(i.productId) ?? 0) >= i.quantity);
    if (!requiredItems.length || !satisfied) continue;

    const bundleValue = requiredItems.reduce(
      (sum, i) => sum + (priceByProduct.get(i.productId) ?? 0) * i.quantity,
      0,
    );
    const amount = Math.round(bundleValue * (Number(bundle.discountPercent) / 100));
    discounts.push({ label: `${bundle.name} bundle discount`, amount, freeShipping: false });
  }

  const totalDiscount = discounts.reduce((sum, d) => sum + d.amount, 0);
  const freeShipping =
    discounts.some((d) => d.freeShipping) || isFreeShippingEligible(subtotal, FREE_SHIPPING_THRESHOLD);

  return {
    subtotal,
    discounts,
    totalDiscount,
    freeShipping,
    shippingAmount: freeShipping ? 0 : STANDARD_SHIPPING,
  };
}

/** Fallback, zero-DB-dependency version used by the client cart drawer for instant UI feedback. */
export function estimateQuantityDiscount(totalQuantity: number, subtotal: number) {
  let percent = 0;
  if (totalQuantity >= 3) percent = 15;
  else if (totalQuantity >= 2) percent = 10;
  return Math.round(subtotal * (percent / 100));
}
