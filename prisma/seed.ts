// ─────────────────────────────────────────────
// BirbRacer — Database Seed
// ─────────────────────────────────────────────
// Run: npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || "pancho";
  const adminPassword = process.env.ADMIN_PASSWORD || "asdf1234";

  // Create admin user
  const existing = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash,
        isAdmin: true,
        avatarEmoji: "👑",
      },
    });
    console.log(`✅ Admin user "${adminUsername}" created`);
  } else {
    console.log(`ℹ️  Admin user "${adminUsername}" already exists`);
  }

  console.log("🏁 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
