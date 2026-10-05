import { randomUUID } from "node:crypto";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import type { Company, CareerSource, Prisma } from "../../src/generated/prisma/client.js";
import { createPrismaClient } from "../../src/plugins/prisma.js";

export const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? "postgresql://truejobs:truejobs@localhost:5432/truejobs_test";

export function createTestPrisma(): PrismaClient {
  return createPrismaClient(TEST_DATABASE_URL);
}

/** Truncates every table except Prisma's migration history. */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

export function createCompany(
  prisma: PrismaClient,
  overrides: Partial<Prisma.CompanyUncheckedCreateInput> = {},
): Promise<Company> {
  const id = randomUUID().slice(0, 8);
  return prisma.company.create({
    data: {
      name: `Company ${id}`,
      slug: `company-${id}`,
      websiteUrl: `https://${id}.example.com`,
      ...overrides,
    },
  });
}

export async function createSource(
  prisma: PrismaClient,
  overrides: Partial<Prisma.CareerSourceUncheckedCreateInput> = {},
): Promise<CareerSource> {
  const companyId = overrides.companyId ?? (await createCompany(prisma)).id;
  return prisma.careerSource.create({
    data: {
      atsType: "GREENHOUSE",
      identifier: `board-${randomUUID().slice(0, 8)}`,
      ...overrides,
      companyId,
    },
  });
}
