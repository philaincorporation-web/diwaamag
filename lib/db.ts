import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Client Prisma unique, réutilisé entre les rechargements à chaud en développement
// (recréé si l'URL de connexion change ou si le client a été régénéré par « prisma generate »).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaUrl?: string; prismaClasse?: unknown };

function createClient(connectionString: string) {
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 5),
  });
  return new PrismaClient({ adapter });
}

function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL n'est pas définie. Voir .env.example.");
  if (globalForPrisma.prisma && globalForPrisma.prismaUrl === url && globalForPrisma.prismaClasse === PrismaClient) return globalForPrisma.prisma;
  const client = createClient(url);
  if (process.env.NODE_ENV !== "production") {
    void globalForPrisma.prisma?.$disconnect().catch(() => {});
    globalForPrisma.prisma = client;
    globalForPrisma.prismaUrl = url;
    globalForPrisma.prismaClasse = PrismaClient;
  }
  return client;
}

export const prisma = getClient();
