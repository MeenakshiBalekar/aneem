import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";

const schema = z.object({
  defaultShippingCost: z.number().min(0),
  defaultPackagingCost: z.number().min(0),
  gatewayFeePercent: z.number().min(0).max(100),
  gstPercent: z.number().min(0).max(100),
});

export async function PUT(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.costSettings.upsert({
    where: { id: "default" },
    update: parsed.data,
    create: { id: "default", ...parsed.data },
  });

  await logFounderAction({ founderUserId: session.user.id, action: "cost_settings.updated", metadata: parsed.data });

  return NextResponse.json(updated);
}
