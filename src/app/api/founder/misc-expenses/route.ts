import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";

const schema = z.object({
  date: z.string().datetime().or(z.string().min(1)),
  category: z.string().min(1).max(80),
  amount: z.number().min(0),
  note: z.string().max(300).optional(),
});

export async function GET() {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expenses = await prisma.miscExpense.findMany({ orderBy: { date: "desc" }, take: 100 });
  return NextResponse.json(expenses);
}

export async function POST(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const expense = await prisma.miscExpense.create({ data: { ...parsed.data, date: new Date(parsed.data.date) } });
  await logFounderAction({ founderUserId: session.user.id, action: "misc_expense.created", entityId: expense.id, metadata: parsed.data });

  return NextResponse.json(expense, { status: 201 });
}
