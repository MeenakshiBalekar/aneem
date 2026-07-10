import NextAuth from "next-auth";
import { founderAuthOptions } from "@/lib/founder/auth";

const handler = NextAuth(founderAuthOptions);

export { handler as GET, handler as POST };
