import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL!;

  if (url.startsWith("file:") || url.startsWith("libsql:")) {
    // SQLite / libSQL (local dev or Windows)
    const { createClient } = require("@libsql/client");
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    const client = createClient({ url });
    const adapter = new PrismaLibSql(client);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  } else {
    // PostgreSQL (production)
    const { PrismaPg } = require("@prisma/adapter-pg");
    const adapter = new PrismaPg({ connectionString: url });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

