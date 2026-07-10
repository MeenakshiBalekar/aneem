import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validations/checkout";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const parsed = reviewSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const verifiedPurchase = await prisma.orderItem.findFirst({
    where: { productId: parsed.data.productId, order: { userId: session.user.id, status: "DELIVERED" } },
  });

  const review = await prisma.review.create({
    data: { ...parsed.data, userId: session.user.id, isVerifiedPurchase: Boolean(verifiedPurchase) },
  });

  const agg = await prisma.review.aggregate({
    where: { productId: parsed.data.productId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.product.update({
    where: { id: parsed.data.productId },
    data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count },
  });

  return NextResponse.json(review, { status: 201 });
}
