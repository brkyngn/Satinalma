import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const connectionString = process.env.DATABASE_URL ?? "";

// Railway'in özel ağı (postgres.railway.internal) ve yerel Postgres TLS
// kullanmaz; bu durumlarda SSL'i açmak bağlantıyı bozar. Public proxy üzerinden
// (ör. *.rlwy.net) bağlanıldığında ise sertifika kendinden imzalı olduğundan
// rejectUnauthorized: false ile TLS kullanılır.
const usesInternalNetwork =
  connectionString.includes("railway.internal") ||
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const adapter = new PrismaPg({
  connectionString,
  ...(usesInternalNetwork ? {} : { ssl: { rejectUnauthorized: false } }),
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
