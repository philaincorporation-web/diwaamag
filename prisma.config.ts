import "dotenv/config";
import { defineConfig } from "prisma/config";

// Les migrations utilisent la connexion directe (non mutualisée) de Neon quand elle est fournie.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.mts",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
