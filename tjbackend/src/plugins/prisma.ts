import type { FastifyInstance } from "fastify";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Decorates `app.prisma`; connects on ready and disconnects on close. */
export function registerPrisma(app: FastifyInstance, connectionString: string): PrismaClient {
  const prisma = createPrismaClient(connectionString);
  app.decorate("prisma", prisma);
  app.addHook("onReady", async () => {
    try {
      await prisma.$connect();
    } catch (err) {
      // Readiness (/readyz) reports DB availability; don't crash the process on boot.
      app.log.warn({ err }, "initial database connection failed");
    }
  });
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
  return prisma;
}
