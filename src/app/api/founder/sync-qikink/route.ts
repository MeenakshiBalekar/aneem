import { NextResponse } from "next/server";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { runFullProductSync } from "@/lib/qikink/sync";
import { logFounderAction } from "@/lib/founder/audit";

export async function POST(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const result = await runFullProductSync();
  await logFounderAction({ founderUserId: session.user.id, action: "qikink.sync_triggered", metadata: result });

  return NextResponse.json(result);
}
