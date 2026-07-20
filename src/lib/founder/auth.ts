import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { prisma } from "@/lib/prisma";
import { logFounderAction, logFounderLoginAttempt } from "@/lib/founder/audit";

// Completely separate NextAuth instance from the customer-facing auth in
// src/lib/auth.ts: different secret, different cookie name, different user
// table (FounderUser, not User). A compromise of one has zero bearing on
// the other. Cookies are host-only (no explicit Domain attribute set below),
// so this session cookie is never sent to the storefront's origin even if
// both are technically the same Vercel deployment.
export const founderAuthOptions: NextAuthOptions = {
  secret: process.env.FOUNDER_NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8h — re-authenticate daily
  pages: { signIn: "/login" },
  cookies: {
    // __Host- prefix requires Secure (HTTPS), which local http dev doesn't
    // have — Next-Auth's own useSecureCookies() switch (based on
    // NEXTAUTH_URL) handles picking the right prefix automatically; we only
    // need to give it a distinct base name from the customer session cookie.
    sessionToken: {
      name:
        process.env.NODE_ENV === "production" ? "__Secure-founder-session-token" : "founder-session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Founder Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials, req) {
        const ipAddress =
          (req?.headers as Record<string, string> | undefined)?.["x-forwarded-for"]?.split(",")[0]?.trim() ??
          "unknown";
        const email = credentials?.email?.toLowerCase().trim() ?? "";

        // Throw (don't return null) — NextAuth v4 only propagates a specific
        // error string to the client (res.error) when authorize() throws;
        // returning null/false always collapses to the generic
        // "CredentialsSignin", which is why the 2FA code prompt (checking
        // res.error === "2FA_REQUIRED" in founder-login-form.tsx) never
        // fired for any account with 2FA enabled — every login just looked
        // like a wrong password, no matter how correct it was.
        const fail = async (reason: string) => {
          await logFounderLoginAttempt({ email, ipAddress, success: false, failureReason: reason });
          throw new Error(reason);
        };

        if (!email || !credentials?.password) return fail("missing_credentials");

        const founder = await prisma.founderUser.findUnique({ where: { email } });
        if (!founder || !founder.isActive) return fail("no_such_user");

        const validPassword = await bcrypt.compare(credentials.password, founder.passwordHash);
        if (!validPassword) return fail("bad_password");

        if (founder.twoFactorEnabled) {
          if (!credentials.totpCode) return fail("2FA_REQUIRED");
          const valid = authenticator.check(credentials.totpCode, founder.twoFactorSecret ?? "");
          if (!valid) return fail("bad_totp");
        }

        await logFounderLoginAttempt({ email, ipAddress, success: true });
        await prisma.founderUser.update({ where: { id: founder.id }, data: { lastLoginAt: new Date() } });
        await logFounderAction({ founderUserId: founder.id, action: "login", ipAddress });

        return { id: founder.id, name: founder.name, email: founder.email, role: founder.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "OWNER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "OWNER" | "STAFF";
      }
      return session;
    },
  },
};
