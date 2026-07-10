import "server-only";
import { getServerSession } from "next-auth";
import { founderAuthOptions } from "@/lib/founder/auth";

export async function getFounderSession() {
  return getServerSession(founderAuthOptions);
}
