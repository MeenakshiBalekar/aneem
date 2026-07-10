import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  lines: z.array(z.object({ variantId: z.string().cuid(), quantity: z.number().int().min(1).max(10) })),
});

// The cart lives client-side (zustand + localStorage) for guest browsing
// speed. This mirrors it into a DB-backed Cart right before checkout, so
// checkout/create-order has a server-trusted source of variant IDs/quantities
// to re-price against.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const cart = await prisma.cart.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: parsed.data.lines.map((l) => l.variantId) } },
  });
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const validLines = parsed.data.lines.filter((l) => variantMap.has(l.variantId));

  if (validLines.length) {
    await prisma.cartItem.createMany({
      data: validLines.map((l) => ({
        cartId: cart.id,
        variantId: l.variantId,
        productId: variantMap.get(l.variantId)!.productId,
        quantity: l.quantity,
      })),
    });
  }

  return NextResponse.json({ synced: validLines.length });
}
