import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { generateReelBrief } from "@/lib/marketing-studio/reel-brief";
import { logFounderAction } from "@/lib/founder/audit";

const schema = z.object({ voiceOption: z.enum(["NONE", "MALE", "FEMALE", "LUXURY", "STREETWEAR", "MOTIVATIONAL"]).default("NONE") });

export async function POST(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const { productId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { reel, isMock } = await generateReelBrief(productId, parsed.data.voiceOption);

  await logFounderAction({
    founderUserId: session.user.id,
    action: "marketing_studio.reel_brief_generated",
    entityType: "Product",
    entityId: productId,
    metadata: { voiceOption: parsed.data.voiceOption, isMock },
  });

  return NextResponse.json(reel, { status: 201 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await params;
  const reels = await prisma.reelBrief.findMany({ where: { productId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(reels);
}
