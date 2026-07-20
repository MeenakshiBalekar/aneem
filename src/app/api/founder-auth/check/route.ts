import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logFounderLoginAttempt } from "@/lib/founder/audit";

/** Pre-checks a password and reports whether 2FA is required — called by
 * the login form BEFORE it ever invokes NextAuth's signIn(), so the
 * decision to show the 2FA code field doesn't depend on NextAuth
 * propagating a custom error message back to the client. That path turned
 * out not to work the same in a production build as in local dev (verified
 * against the live site: same generic CredentialsSignin even after the
 * authorize()-throws fix), so this sidesteps it entirely — the actual
 * sign-in still goes through NextAuth's authorize() normally once the
 * client knows what to submit. Rate-limited the same as the real login
 * endpoint (see middleware.ts) since it's still a password-testing surface. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!email || !password) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const founder = await prisma.founderUser.findUnique({ where: { email } });
  if (!founder || !founder.isActive) {
    await logFounderLoginAttempt({ email, ipAddress, success: false, failureReason: "no_such_user" });
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const validPassword = await bcrypt.compare(password, founder.passwordHash);
  if (!validPassword) {
    await logFounderLoginAttempt({ email, ipAddress, success: false, failureReason: "bad_password" });
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Password's good — don't log this as a login attempt yet, the actual
  // NextAuth authorize() call (right after this, from the client) is what
  // records the real success/failure once 2FA (if any) is settled.
  return NextResponse.json({ ok: true, requires2FA: founder.twoFactorEnabled });
}
