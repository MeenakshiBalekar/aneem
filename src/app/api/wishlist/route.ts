import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

const schema = z.object({ productId: z.string().cuid() });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: session.user.id, productId: parsed.data.productId } },
    update: {},
    create: { userId: session.user.id, productId: parsed.data.productId },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.wishlistItem.deleteMany({
    where: { userId: session.user.id, productId: parsed.data.productId },
  });
  return NextResponse.json({ removed: true });
}
