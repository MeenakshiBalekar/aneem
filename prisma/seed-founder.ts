import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Deliberately separate from prisma/seed.ts (which seeds the public
// storefront catalog) — this creates exactly one founder account, from env
// vars rather than a hardcoded password, since FounderUser is a
// security-sensitive table with no public registration route.
async function main() {
  const email = process.env.FOUNDER_EMAIL;
  const password = process.env.FOUNDER_PASSWORD;
  const name = process.env.FOUNDER_NAME ?? "Founder";

  if (!email || !password) {
    throw new Error("Set FOUNDER_EMAIL and FOUNDER_PASSWORD before running this script.");
  }
  if (password.length < 12) {
    throw new Error("FOUNDER_PASSWORD must be at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const founder = await prisma.founderUser.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name, role: "OWNER" },
  });

  console.log(`Founder account ready: ${founder.email}. Enable 2FA immediately from /founder/settings/security.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
