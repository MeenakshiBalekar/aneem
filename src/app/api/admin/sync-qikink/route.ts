import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runFullProductSync } from "@/lib/qikink/sync";

// Admin-triggered "Sync now" button — separate from the CRON_SECRET-protected
// scheduled route since this is authenticated via the admin's own session.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await runFullProductSync();
  return NextResponse.json(result);
}
