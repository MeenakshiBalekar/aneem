import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFounderSession } from "@/lib/founder/session";

export async function GET(_req: Request, { params }: { params: Promise<{ reelId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reelId } = await params;
  const reel = await prisma.reelBrief.findUnique({ where: { id: reelId } });
  if (!reel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(reel);
}
