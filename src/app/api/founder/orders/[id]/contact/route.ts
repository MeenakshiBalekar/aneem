import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";

const CONTACT_STATUSES = [
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
  "CALLBACK_REQUESTED",
  "NO_RESPONSE",
  "WRONG_NUMBER",
  "CANCELLED_BY_CUSTOMER",
] as const;

const FOLLOW_UP_STATUSES = new Set(["NO_RESPONSE", "CALLBACK_REQUESTED"]);

const schema = z.object({
  status: z.enum(CONTACT_STATUSES),
  note: z.string().max(2000).optional(),
  nextFollowUpAt: z.string().datetime().optional(),
});

// Called on every dropdown change / notes blur from the Calling Queue page —
// autosaves the founder's call-confirmation workflow state and appends an
// immutable log entry so "Number of Attempts" / "Last Contact Attempt" in
// the follow-up queue are always accurate, not just the latest snapshot.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { status, note, nextFollowUpAt } = parsed.data;

  // Default follow-up to +1 day if the status needs one and the caller
  // didn't specify a date — keeps the queue useful even without a picker.
  const resolvedFollowUp = FOLLOW_UP_STATUSES.has(status)
    ? nextFollowUpAt
      ? new Date(nextFollowUpAt)
      : new Date(Date.now() + 24 * 60 * 60 * 1000)
    : null;

  const order = await prisma.order.update({
    where: { id },
    data: {
      contactStatus: status,
      contactAttempts: { increment: 1 },
      nextFollowUpAt: resolvedFollowUp,
      callLogs: { create: { status, note, nextFollowUpAt: resolvedFollowUp, createdByEmail: session.user.email } },
    },
  });

  await logFounderAction({
    founderUserId: session.user.id,
    action: "order.contact_status_updated",
    entityType: "Order",
    entityId: order.id,
    metadata: { status, note },
  });

  return NextResponse.json({ success: true, contactStatus: order.contactStatus, nextFollowUpAt: order.nextFollowUpAt });
}
