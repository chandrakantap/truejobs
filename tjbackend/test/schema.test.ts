import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "../src/generated/prisma/client.js";
import { createCompany, createSource, createTestPrisma, resetDb } from "./helpers/db.js";

const prisma = createTestPrisma();

beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

describe("schema", () => {
  it("creates snake_case tables, enums and the trigram index", async () => {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    expect(tables.map((t) => t.tablename).sort()).toEqual([
      "admin_users",
      "career_sources",
      "companies",
      "crawl_runs",
      "job_events",
      "job_versions",
      "jobs",
    ]);

    const enums = await prisma.$queryRaw<{ typname: string }[]>`
      SELECT typname FROM pg_type WHERE typtype = 'e'`;
    expect(enums.map((e) => e.typname).sort()).toEqual([
      "ats_type",
      "company_status",
      "crawl_run_status",
      "employment_type",
      "job_category",
      "job_event_type",
      "job_status",
      "region",
      "salary_period",
      "seniority",
      "workplace_type",
    ]);

    const idx = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'company_name_trgm'`;
    expect(idx[0]?.indexdef).toMatch(/USING gin \(name gin_trgm_ops\)/);
  });

  it("rejects a duplicate (atsType, identifier) CareerSource", async () => {
    await createSource(prisma, { atsType: "LEVER", identifier: "acme" });
    const err = await createSource(prisma, { atsType: "LEVER", identifier: "acme" }).catch((e) => e);
    expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(err.code).toBe("P2002");
  });

  it("allows the same identifier under a different atsType", async () => {
    await createSource(prisma, { atsType: "LEVER", identifier: "acme" });
    await expect(createSource(prisma, { atsType: "ASHBY", identifier: "acme" })).resolves.toBeDefined();
  });

  it("rejects deleting a Company that has sources (Restrict)", async () => {
    const company = await createCompany(prisma);
    await createSource(prisma, { companyId: company.id });
    const err = await prisma.company.delete({ where: { id: company.id } }).catch((e) => e);
    expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(err.code).toBe("P2003");
  });

  it("cascades CrawlRuns when a CareerSource is deleted", async () => {
    const source = await createSource(prisma);
    await prisma.crawlRun.create({
      data: {
        careerSourceId: source.id,
        status: "RUNNING",
        workerId: "w1",
        leaseExpiresAt: new Date(Date.now() + 60_000),
      },
    });
    await prisma.careerSource.delete({ where: { id: source.id } });
    expect(await prisma.crawlRun.count()).toBe(0);
  });

  it("applies column defaults", async () => {
    const source = await createSource(prisma);
    expect(source).toMatchObject({
      isEnabled: true,
      crawlIntervalMinutes: 360,
      consecutiveFailures: 0,
      config: {},
    });
    const company = await prisma.company.findUniqueOrThrow({ where: { id: source.companyId } });
    expect(company.status).toBe("ACTIVE");
  });
});
