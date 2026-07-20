import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";

// All fields optional so this handles both the quick inline categorize
// (the products table sends just { categoryId, tags }) and the full
// product edit page (title/description/pricing/status/etc). Only provided
// fields are touched.
const schema = z.object({
  categoryId: z.string().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(8000).optional(),
  basePrice: z.number().positive().optional(),
  compareAtPrice: z.number().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const { productId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { variants: { select: { stock: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.basePrice !== undefined) updateData.basePrice = data.basePrice;
  if (data.compareAtPrice !== undefined) updateData.compareAtPrice = data.compareAtPrice;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.tags !== undefined) updateData.tags = data.tags;

  // Status: honour an explicit isActive from the edit page. Otherwise keep
  // the legacy behaviour of the quick-categorize flow (a product goes live
  // once it has a category AND at least one variant in stock — that's how a
  // Qikink-synced "hidden until tagged" product first becomes visible).
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  } else if (data.categoryId !== undefined) {
    updateData.isActive = data.categoryId != null && existing.variants.some((v) => v.stock > 0);
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: updateData,
    include: { category: { select: { id: true, name: true } } },
  });

  await logFounderAction({
    founderUserId: session.user.id,
    action: "product.updated",
    entityType: "Product",
    entityId: productId,
    metadata: { fields: Object.keys(updateData) },
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
