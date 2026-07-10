import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadAsset, isBlobConfigured } from "@/lib/blob";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";
import { logFounderAction } from "@/lib/founder/audit";

const VALID_KINDS = ["SOURCE_FRONT", "SOURCE_BACK", "SOURCE_LIFESTYLE", "SOURCE_FABRIC"] as const;

export async function POST(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "File storage isn't configured yet — set BLOB_READ_WRITE_TOKEN in your environment." },
      { status: 503 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const productId = formData.get("productId");
  const kind = formData.get("kind");

  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (typeof productId !== "string") return NextResponse.json({ error: "productId required" }, { status: 400 });
  if (typeof kind !== "string" || !VALID_KINDS.includes(kind as (typeof VALID_KINDS)[number])) {
    return NextResponse.json({ error: `kind must be one of: ${VALID_KINDS.join(", ")}` }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are supported" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 10MB" }, { status: 400 });
  }

  const url = await uploadAsset(file, `marketing-studio/${productId}`);

  const asset = await prisma.marketingAsset.create({
    data: { productId, kind: kind as (typeof VALID_KINDS)[number], url, provider: "vercel-blob" },
  });

  await logFounderAction({
    founderUserId: session.user.id,
    action: "marketing_studio.asset_uploaded",
    entityType: "Product",
    entityId: productId,
    metadata: { kind, url },
  });

  return NextResponse.json(asset, { status: 201 });
}
