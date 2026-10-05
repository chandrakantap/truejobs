import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer auto-loads .env when a config file is present.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
