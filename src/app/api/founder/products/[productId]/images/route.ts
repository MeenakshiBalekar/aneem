import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadAsset, isBlobConfigured } from "@/lib/blob";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Adds one real product photo — CSV/XLSX catalog imports create products
 * with zero images (the sheet has no image column, and Qikink's product
 * exports don't include one either), so this is how those get real photos
 * instead of the empty placeholder box. New upload becomes the primary
 * image only if the product had none yet; otherwise it's appended. */
export async function POST(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "Image storage isn't configured yet — set BLOB_READ_WRITE_TOKEN in your environment." },
      { status: 503 },
    );
  }

  const { productId } = await params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, images: { select: { id: true }, take: 1 } },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image uploads are supported" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Image must be under 10MB" }, { status: 400 });

  const url = await uploadAsset(file, `products/${productId}`);
  const isFirstImage = product.images.length === 0;

  const image = await prisma.productImage.create({
    data: {
      productId,
      url,
      altText: null,
      sortOrder: isFirstImage ? 0 : await prisma.productImage.count({ where: { productId } }),
      isLifestyle: !isFirstImage,
    },
  });

  await logFounderAction({
    founderUserId: session.user.id,
    action: "product.image_uploaded",
    entityType: "Product",
    entityId: productId,
    metadata: { imageId: image.id },
  });

  return NextResponse.json(image, { status: 201 });
}
