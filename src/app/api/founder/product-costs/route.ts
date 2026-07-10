import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";

const schema = z.object({
  productId: z.string().cuid(),
  productCost: z.number().min(0),
  printingCost: z.number().min(0),
});

export async function PUT(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { productId, productCost, printingCost } = parsed.data;
  const updated = await prisma.productCost.upsert({
    where: { productId },
    update: { productCost, printingCost },
    create: { productId, productCost, printingCost },
  });

  await logFounderAction({
    founderUserId: session.user.id,
    action: "product_cost.updated",
    entityType: "Product",
    entityId: productId,
    metadata: { productCost, printingCost },
  });

  return NextResponse.json(updated);
}
