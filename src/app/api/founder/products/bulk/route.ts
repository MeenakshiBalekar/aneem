import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";

const schema = z.object({
  action: z.enum(["activate", "draft", "delete", "set_category"]),
  productIds: z.array(z.string().min(1)).min(1).max(200),
  categoryId: z.string().nullable().optional(), // only for set_category
});

/** Bulk actions for the products list — activate / draft / delete /
 * set-category on a selection. Delete keeps the same order-history guard
 * as the single-product DELETE: products with real orders are skipped and
 * reported, never silently removed. */
export async function POST(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { action, productIds, categoryId } = parsed.data;

  let affected = 0;
  let skipped = 0;

  if (action === "activate" || action === "draft") {
    const result = await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { isActive: action === "activate" },
    });
    affected = result.count;
  } else if (action === "set_category") {
    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
      if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }
    const result = await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { categoryId: categoryId ?? null },
    });
    affected = result.count;
  } else {
    // delete — per-product guard, same rules as the single DELETE route
    const candidates = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, _count: { select: { orderItems: true } } },
    });
    const deletable = candidates.filter((p) => p._count.orderItems === 0).map((p) => p.id);
    skipped = candidates.length - deletable.length;
    if (deletable.length > 0) {
      await prisma.cartItem.deleteMany({ where: { productId: { in: deletable } } });
      await prisma.bundleItem.deleteMany({ where: { productId: { in: deletable } } });
      const result = await prisma.product.deleteMany({ where: { id: { in: deletable } } });
      affected = result.count;
    }
  }

  await logFounderAction({
    founderUserId: session.user.id,
    action: `product.bulk_${action}`,
    metadata: { count: affected, skipped, categoryId: categoryId ?? undefined },
  });

  return NextResponse.json({ affected, skipped });
}
