import { NextResponse } from "next/server";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { analyzeProduct } from "@/lib/marketing-studio/product-analysis";
import { logFounderAction } from "@/lib/founder/audit";

export async function POST(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const { productId } = await params;

  try {
    const { profile, attributes, isMock } = await analyzeProduct(productId);
    await logFounderAction({
      founderUserId: session.user.id,
      action: "marketing_studio.product_analyzed",
      entityType: "Product",
      entityId: productId,
      metadata: { isMock },
    });
    return NextResponse.json({ profile, attributes, isMock });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Analysis failed" }, { status: 500 });
  }
}
