import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";
import { scoreContent } from "@/lib/marketing-studio/scoring";
import {
  generateCaptions,
  generateHashtags,
  generateCarousel,
  generateStories,
  generateProductDescription,
  generateMetaAd,
  generateWhatsAppCampaign,
  generateEmailCampaign,
} from "@/lib/marketing-studio/copy-generators";

const CONTENT_TYPES = [
  "CAPTION",
  "HASHTAGS",
  "CAROUSEL",
  "STORY",
  "PRODUCT_DESCRIPTION",
  "META_AD",
  "WHATSAPP_CAMPAIGN",
  "EMAIL_CAMPAIGN",
] as const;

const schema = z.object({ type: z.enum(CONTENT_TYPES) });

/** Flattens a generator's structured output into a single string for
 * scoring — the scorer reads intent/hook quality from prose, not JSON keys. */
function contentToScoreableText(type: string, data: unknown): string {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map((d) => JSON.stringify(d)).join("\n");
  return JSON.stringify(data, null, 2);
}

export async function POST(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const { productId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { type } = parsed.data;

  let result: { data: unknown; isMock: boolean };
  switch (type) {
    case "CAPTION":
      result = await generateCaptions(productId);
      break;
    case "HASHTAGS":
      result = await generateHashtags(productId);
      break;
    case "CAROUSEL":
      result = await generateCarousel(productId);
      break;
    case "STORY":
      result = await generateStories(productId);
      break;
    case "PRODUCT_DESCRIPTION":
      result = await generateProductDescription(productId);
      break;
    case "META_AD":
      result = await generateMetaAd(productId);
      break;
    case "WHATSAPP_CAMPAIGN":
      result = await generateWhatsAppCampaign(productId);
      break;
    case "EMAIL_CAMPAIGN":
      result = await generateEmailCampaign(productId);
      break;
  }

  const { score, isMock: scoreIsMock } = await scoreContent(type, contentToScoreableText(type, result.data));

  const content = await prisma.marketingContent.create({
    data: {
      productId,
      type,
      content: result.data as never,
      score: score as never,
      isMock: result.isMock || scoreIsMock,
    },
  });

  await logFounderAction({
    founderUserId: session.user.id,
    action: "marketing_studio.content_generated",
    entityType: "Product",
    entityId: productId,
    metadata: { type, isMock: content.isMock },
  });

  return NextResponse.json(content, { status: 201 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await params;
  const content = await prisma.marketingContent.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(content);
}
