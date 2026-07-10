import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";

const schema = z.object({
  platform: z.enum(["META", "GOOGLE", "OTHER"]),
  campaign: z.string().max(120).optional(),
  date: z.string().min(1),
  spend: z.number().min(0),
  impressions: z.number().int().min(0).optional(),
  clicks: z.number().int().min(0).optional(),
  conversions: z.number().int().min(0).optional(),
  newCustomers: z.number().int().min(0).optional(),
});

export async function GET() {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const spend = await prisma.adSpend.findMany({ orderBy: { date: "desc" }, take: 100 });
  return NextResponse.json(spend);
}

export async function POST(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const entry = await prisma.adSpend.create({ data: { ...parsed.data, date: new Date(parsed.data.date) } });
  await logFounderAction({ founderUserId: session.user.id, action: "ad_spend.created", entityId: entry.id, metadata: parsed.data });

  return NextResponse.json(entry, { status: 201 });
}
