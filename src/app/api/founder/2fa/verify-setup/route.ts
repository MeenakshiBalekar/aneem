import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticator } from "otplib";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";

const schema = z.object({ secret: z.string().min(16), code: z.string().length(6) });

export async function POST(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const valid = authenticator.check(parsed.data.code, parsed.data.secret);
  if (!valid) return NextResponse.json({ error: "Incorrect code — check your authenticator app and try again." }, { status: 400 });

  await prisma.founderUser.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: true, twoFactorSecret: parsed.data.secret },
  });
  await logFounderAction({ founderUserId: session.user.id, action: "2fa.enabled" });

  return NextResponse.json({ success: true });
}
