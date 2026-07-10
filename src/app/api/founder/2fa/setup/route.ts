import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { getFounderSession } from "@/lib/founder/session";
import { verifyCsrfToken, csrfRejectedResponse } from "@/lib/founder/csrf";

// Generates a fresh TOTP secret + QR code. Not persisted until the founder
// proves they've actually scanned it by submitting a valid code to
// /api/founder/2fa/verify-setup — otherwise a half-finished setup could
// silently store an unconfirmed secret.
export async function POST(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrfToken(req)) return csrfRejectedResponse();

  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(session.user.email ?? "founder", "Aneem Founder Portal", secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return NextResponse.json({ secret, qrCodeDataUrl });
}
