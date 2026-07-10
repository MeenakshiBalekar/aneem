import { NextResponse } from "next/server";
import { runFullProductSync } from "@/lib/qikink/sync";

// Triggered hourly by a GitHub Actions workflow (see
// .github/workflows/qikink-sync.yml) rather than Vercel Cron — the Hobby
// plan only allows daily cron triggers, too infrequent to keep stock/pricing
// fresh. Keeps the catalog fresh even if webhooks are missed. Also callable
// on-demand from the admin/Founder Portal "Sync now" buttons.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runFullProductSync();
  return NextResponse.json(result);
}

export const dynamic = "force-dynamic";
