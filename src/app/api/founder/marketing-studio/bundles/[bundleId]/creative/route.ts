import { NextResponse } from "next/server";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { generateBundleCreative } from "@/lib/marketing-studio/bundle-creative";

export async function POST(req: Request, { params }: { params: Promise<{ bundleId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const { bundleId } = await params;
  const result = await generateBundleCreative(bundleId);
  return NextResponse.json(result);
}
