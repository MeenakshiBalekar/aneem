import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteAsset } from "@/lib/blob";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";

export async function DELETE(req: Request, { params }: { params: Promise<{ productId: string; imageId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const { productId, imageId } = await params;
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) return NextResponse.json({ error: "Image not found" }, { status: 404 });

  await prisma.productImage.delete({ where: { id: imageId } });
  await deleteAsset(image.url).catch(() => {}); // best-effort — a dangling blob is harmless, a failed delete shouldn't block removing the record

  await logFounderAction({
    founderUserId: session.user.id,
    action: "product.image_deleted",
    entityType: "Product",
    entityId: productId,
    metadata: { imageId },
  });

  return NextResponse.json({ ok: true });
}
