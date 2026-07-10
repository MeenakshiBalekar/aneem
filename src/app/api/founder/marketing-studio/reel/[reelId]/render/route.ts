import { NextResponse } from "next/server";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { renderReel } from "@/lib/marketing-studio/video-render";
import { logFounderAction } from "@/lib/founder/audit";

export async function POST(req: Request, { params }: { params: Promise<{ reelId: string }> }) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const { reelId } = await params;
  const reel = await renderReel(reelId);

  await logFounderAction({
    founderUserId: session.user.id,
    action: "marketing_studio.reel_render_started",
    entityType: "ReelBrief",
    entityId: reelId,
    metadata: { status: reel.status, isMock: reel.isMock },
  });

  return NextResponse.json(reel);
}
