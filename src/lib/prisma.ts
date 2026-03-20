// ─────────────────────────────────────────────
// BirbRacer — Prisma Client Singleton
// ─────────────────────────────────────────────
// Prevents multiple Prisma instances in dev
// (Next.js hot reloads create new instances)
// ─────────────────────────────────────────────

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
