import type { DefaultSession } from "next-auth";

// NextAuth's module augmentation is global, and this app runs two separate
// NextAuth instances (customer auth in src/lib/auth.ts, founder auth in
// src/lib/founder/auth.ts) that share the same `next-auth` types. The role
// union below covers both realms' roles; each auth config only ever
// produces its own subset, but TS can't express "this instance narrows to
// CUSTOMER|ADMIN, that one to OWNER|STAFF" without two separate module
// declarations colliding, so callers narrow with the appropriate helper
// (getServerSession(authOptions) vs getServerSession(founderAuthOptions)).
type AppRole = "CUSTOMER" | "ADMIN" | "OWNER" | "STAFF";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
  }
}
