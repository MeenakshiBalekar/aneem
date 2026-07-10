import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";

const schema = z.object({
  collection: z.string().max(120).optional(),
  gsm: z.number().int().min(0).max(1000).optional(),
  fit: z.string().max(60).optional(),
  colorName: z.string().max(60).optional(),
  fabric: z.string().max(200).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await params;
  const profile = await prisma.productMarketingProfile.findUnique({ where: { productId } });
  const assets = await prisma.marketingAsset.findMany({ where: { productId }, orderBy: { createdAt: "desc" } });

  return NextResponse.json({ profile, assets });
}

export async function PUT(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const { productId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const profile = await prisma.productMarketingProfile.upsert({
    where: { productId },
    update: parsed.data,
    create: { productId, ...parsed.data },
  });

  return NextResponse.json(profile);
}
