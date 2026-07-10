import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { evaluateDiscounts } from "@/lib/discounts/engine";

const schema = z.object({
  variantIds: z.array(z.string().cuid()).min(1),
  quantities: z.record(z.string(), z.number().int().min(1)),
  couponCode: z.string().optional(),
});

// Cart-page discount preview — same server-trusted engine used at checkout,
// so what the customer sees in the cart matches what they're charged.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: parsed.data.variantIds } },
    include: { product: true },
  });

  const lines = variants.map((v) => ({
    productId: v.productId,
    categoryId: v.product.categoryId,
    quantity: parsed.data.quantities[v.id] ?? 1,
    unitPrice: Number(v.price),
  }));

  const evaluation = await evaluateDiscounts(lines, { couponCode: parsed.data.couponCode });
  return NextResponse.json(evaluation);
}
