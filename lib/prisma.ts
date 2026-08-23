import { PrismaClient } from "@prisma/client";

// Prevents exhausting the DB connection pool from Next.js hot-reload
// creating a new PrismaClient on every file change in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
