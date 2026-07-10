import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { generateMarketingContent } from "@/lib/founder/copilot";
import { logFounderAction } from "@/lib/founder/audit";

const schema = z.object({
  productId: z.string().cuid(),
  platform: z.enum(["instagram_caption", "instagram_reel_script", "facebook_ad", "google_ad", "email", "whatsapp_broadcast"]),
});

export async function POST(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const content = await generateMarketingContent({
    productTitle: product.title,
    productDescription: product.description,
    platform: parsed.data.platform,
  });

  await logFounderAction({
    founderUserId: session.user.id,
    action: "copilot.marketing_content_generated",
    entityType: "Product",
    entityId: product.id,
    metadata: { platform: parsed.data.platform },
  });

  return NextResponse.json({ content });
}
