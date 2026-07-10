import { NextResponse } from "next/server";
import { getFounderSession } from "@/lib/founder/session";
import { suggestOffers } from "@/lib/marketing-studio/offer-engine";

export async function GET() {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await suggestOffers();
  return NextResponse.json(result);
}
