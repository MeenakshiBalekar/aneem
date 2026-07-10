import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { generateThumbnailConcepts } from "@/lib/marketing-studio/thumbnails";

export async function POST(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const { productId } = await params;
  const { concepts, isMock } = await generateThumbnailConcepts(productId);

  const content = await prisma.marketingContent.create({
    data: { productId, type: "THUMBNAIL_CONCEPT", content: concepts as never, isMock },
  });

  return NextResponse.json(content, { status: 201 });
}
