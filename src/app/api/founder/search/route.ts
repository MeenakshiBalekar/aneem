import { NextResponse } from "next/server";
import { getFounderSession } from "@/lib/founder/session";
import { globalFounderSearch } from "@/lib/founder/global-search";

export async function GET(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const hits = await globalFounderSearch(q);
  return NextResponse.json({ hits });
}
