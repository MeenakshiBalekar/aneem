import { NextResponse } from "next/server";
import { runFullProductSync } from "@/lib/qikink/sync";

// Vercel Cron (see vercel.json) hits this on a schedule to keep the catalog
// fresh even if webhooks are missed. Also callable on-demand from the admin
// "Sync now" button.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runFullProductSync();
  return NextResponse.json(result);
}

export const dynamic = "force-dynamic";
