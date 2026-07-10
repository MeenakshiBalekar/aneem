import { NextResponse } from "next/server";
import { z } from "zod";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { askCopilot } from "@/lib/founder/copilot";
import { logFounderAction } from "@/lib/founder/audit";

const schema = z.object({
  question: z.string().min(1).max(1000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(20).optional(),
});

export async function POST(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const answer = await askCopilot(parsed.data.question, parsed.data.history);
  await logFounderAction({ founderUserId: session.user.id, action: "copilot.question_asked", metadata: { question: parsed.data.question } });

  return NextResponse.json({ answer });
}
