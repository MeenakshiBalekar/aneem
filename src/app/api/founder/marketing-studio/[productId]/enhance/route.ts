import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { enhanceImage } from "@/lib/marketing-studio/image-enhancement";
import { logFounderAction } from "@/lib/founder/audit";

const OPERATIONS = [
  "remove_background",
  "increase_resolution",
  "improve_shadows",
  "correct_lighting",
  "hero_image",
  "lifestyle_mockup",
  "studio_shot",
  "folded_image",
  "flat_lay",
  "hoodie_mockup",
  "cap_mockup",
  "bottle_mockup",
  "bundle_image",
] as const;

const KIND_MAP: Record<(typeof OPERATIONS)[number], "ENHANCED" | "MOCKUP" | "HERO"> = {
  remove_background: "ENHANCED",
  increase_resolution: "ENHANCED",
  improve_shadows: "ENHANCED",
  correct_lighting: "ENHANCED",
  hero_image: "HERO",
  lifestyle_mockup: "MOCKUP",
  studio_shot: "MOCKUP",
  folded_image: "MOCKUP",
  flat_lay: "MOCKUP",
  hoodie_mockup: "MOCKUP",
  cap_mockup: "MOCKUP",
  bottle_mockup: "MOCKUP",
  bundle_image: "MOCKUP",
};

const schema = z.object({ sourceAssetId: z.string().cuid(), operation: z.enum(OPERATIONS) });

export async function POST(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const { productId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const source = await prisma.marketingAsset.findUnique({ where: { id: parsed.data.sourceAssetId } });
  if (!source || source.productId !== productId) {
    return NextResponse.json({ error: "Source asset not found" }, { status: 404 });
  }

  const result = await enhanceImage(source.url, parsed.data.operation);

  const asset = await prisma.marketingAsset.create({
    data: {
      productId,
      kind: KIND_MAP[parsed.data.operation],
      url: result.url,
      provider: result.isMock ? "mock" : "image-api",
      isMock: result.isMock,
      metadata: { operation: parsed.data.operation, sourceAssetId: source.id },
    },
  });

  await logFounderAction({
    founderUserId: session.user.id,
    action: "marketing_studio.image_enhanced",
    entityType: "Product",
    entityId: productId,
    metadata: { operation: parsed.data.operation, isMock: result.isMock },
  });

  return NextResponse.json(asset, { status: 201 });
}
