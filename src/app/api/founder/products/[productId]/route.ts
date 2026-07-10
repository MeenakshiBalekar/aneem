import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";

const schema = z.object({
  categoryId: z.string().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30),
});

/** Assigns a category and/or tags to a synced product — this is the only
 * thing that can turn on isActive for a product that came in from Qikink
 * ("hidden until tagged"), so it recomputes isActive the same way the sync
 * does: category assigned AND at least one variant in stock. */
export async function PATCH(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const { productId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { categoryId, tags } = parsed.data;

  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { variants: { select: { stock: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const inStock = existing.variants.some((v) => v.stock > 0);
  const isActive = categoryId != null && inStock;

  const product = await prisma.product.update({
    where: { id: productId },
    data: { categoryId, tags, isActive },
    include: { category: { select: { id: true, name: true } } },
  });

  await logFounderAction({
    founderUserId: session.user.id,
    action: "product.categorized",
    entityType: "Product",
    entityId: productId,
    metadata: { categoryId, tags, isActive },
  });

  return NextResponse.json(product);
}

/** Blocked when the product has real order history (OrderItem has no
 * cascade — that's intentional, order records must never silently lose
 * their line items). Cart/bundle references aren't a data-loss concern so
 * those are cleared first; everything else (variants, images, cost,
 * wishlist entries, marketing assets) cascades via the schema. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(_req)) return csrfRejectedResponse();

  const { productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, title: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const orderCount = await prisma.orderItem.count({ where: { productId } });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: `Can't delete — ${orderCount} order(s) reference this product. Unassign its category instead to hide it from the storefront.` },
      { status: 409 },
    );
  }

  await prisma.cartItem.deleteMany({ where: { productId } });
  await prisma.bundleItem.deleteMany({ where: { productId } });
  await prisma.product.delete({ where: { id: productId } });

  await logFounderAction({
    founderUserId: session.user.id,
    action: "product.deleted",
    entityType: "Product",
    entityId: productId,
    metadata: { title: product.title },
  });

  return NextResponse.json({ ok: true });
}
