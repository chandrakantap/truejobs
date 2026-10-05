import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSeed } from "../prisma/seed.js";
import { JobCategory, Region, Seniority, WorkplaceType } from "../src/lib/enums.js";
import { createTestPrisma, resetDb } from "./helpers/db.js";

const prisma = createTestPrisma();
const NOW = new Date("2026-06-15T12:00:00Z");

async function counts() {
  const [companies, careerSources, jobs, jobVersions, jobEvents, crawlRuns] = await Promise.all([
    prisma.company.count(),
    prisma.careerSource.count(),
    prisma.job.count(),
    prisma.jobVersion.count(),
    prisma.jobEvent.count(),
    prisma.crawlRun.count(),
  ]);
  return { companies, careerSources, jobs, jobVersions, jobEvents, crawlRuns };
}

beforeAll(async () => {
  await resetDb(prisma);
  await runSeed(prisma, NOW);
});
afterAll(() => prisma.$disconnect());

describe("dev seed", () => {
  it("is idempotent: a second run creates no duplicates", async () => {
    const before = await counts();
    expect(before.companies).toBe(9);
    expect(before.careerSources).toBe(9);
    expect(before.jobs).toBe(40);
    await runSeed(prisma, new Date(NOW.getTime() + 3600_000));
    expect(await counts()).toEqual(before);
  });

  it("covers every JobCategory, Seniority, WorkplaceType and Region", async () => {
    const jobs = await prisma.job.findMany();
    expect(new Set(jobs.map((j) => j.category))).toEqual(new Set(Object.values(JobCategory)));
    expect(new Set(jobs.map((j) => j.seniority))).toEqual(new Set(Object.values(Seniority)));
    expect(new Set(jobs.map((j) => j.workplaceType))).toEqual(new Set(Object.values(WorkplaceType)));
    expect(new Set(jobs.flatMap((j) => j.regions))).toEqual(new Set(Object.values(Region)));
    expect(jobs.filter((j) => j.category === "NON_ENGINEERING")).toHaveLength(3);
  });

  it("covers salary currencies, no-salary jobs and the last-24h window", async () => {
    const jobs = await prisma.job.findMany();
    expect(new Set(jobs.map((j) => j.salaryCurrency).filter(Boolean))).toEqual(new Set(["USD", "EUR", "INR"]));
    expect(jobs.some((j) => j.salaryMin === null)).toBe(true);
    const recent = jobs.filter((j) => NOW.getTime() - j.firstSeenAt.getTime() <= 24 * 3600_000);
    expect(recent.length).toBeGreaterThanOrEqual(3);
  });

  it("covers closed, hidden, repost and multi-version jobs", async () => {
    const closed = await prisma.job.findMany({ where: { status: "CLOSED" } });
    expect(closed).toHaveLength(5);
    expect(closed.every((j) => j.closedAt !== null)).toBe(true);
    expect(await prisma.job.count({ where: { status: "ACTIVE" } })).toBe(35);
    expect(await prisma.job.count({ where: { isHidden: true } })).toBe(1);

    const reposts = await prisma.job.findMany({ where: { repostOfJobId: { not: null } }, include: { repostOf: true } });
    expect(reposts).toHaveLength(1);
    expect(reposts[0]?.repostOf?.status).toBe("CLOSED");

    const multi = await prisma.job.findMany({ where: { versionCount: { gt: 1 } }, include: { versions: true } });
    expect(multi).toHaveLength(2);
    for (const job of multi) {
      expect(job.versionCount).toBeGreaterThanOrEqual(2);
      expect(job.versionCount).toBeLessThanOrEqual(3);
      expect(job.versions).toHaveLength(job.versionCount);
    }
    const jobs = await prisma.job.findMany({ include: { versions: true } });
    for (const job of jobs) expect(job.versions).toHaveLength(job.versionCount);
  });

  it("seeds companies, disabled sources and an archived company with two jobs", async () => {
    const statuses = await prisma.company.groupBy({ by: ["status"], _count: true });
    expect(Object.fromEntries(statuses.map((s) => [s.status, s._count]))).toEqual({ ACTIVE: 7, PAUSED: 1, ARCHIVED: 1 });
    expect(await prisma.careerSource.count({ where: { isEnabled: true } })).toBe(0);
    expect(await prisma.job.count({ where: { company: { slug: "archived-co" } } })).toBe(2);
    const shopify = await prisma.careerSource.findFirstOrThrow({ where: { atsType: "WORKDAY" } });
    expect(shopify.identifier).toBe("shopify/External");
    expect(shopify.config).toEqual({ host: "shopify.wd1.myworkdayjobs.com", tenant: "shopify", site: "External" });
  });

  it("uses the seed markers on every job", async () => {
    const jobs = await prisma.job.findMany();
    for (const job of jobs) {
      expect(job.normalizerVersion).toBe(0);
      expect(job.rawPayload).toEqual({ seed: true });
      expect(job.slug).toMatch(/^[a-z0-9-]+-[0-9a-f]{8}$/);
      expect(job.contentHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("keeps event timestamps consistent with job dates", async () => {
    const jobs = await prisma.job.findMany({ include: { events: true } });
    for (const job of jobs) {
      const byType = (t: string) => job.events.filter((e) => e.type === t);
      expect(byType("FIRST_SEEN")).toHaveLength(1);
      expect(byType("FIRST_SEEN")[0]?.occurredAt).toEqual(job.firstSeenAt);
      for (const e of job.events) {
        expect(e.occurredAt.getTime()).toBeGreaterThanOrEqual(job.firstSeenAt.getTime());
        expect(e.occurredAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
      }
      if (job.status === "CLOSED") {
        expect(byType("CLOSED")).toHaveLength(1);
        expect(byType("CLOSED")[0]?.occurredAt).toEqual(job.closedAt);
      } else {
        expect(byType("CLOSED")).toHaveLength(0);
      }
      if (job.versionCount > 1) expect(byType("DESCRIPTION_CHANGED")).toHaveLength(job.versionCount - 1);
      if (job.repostOfJobId) expect(byType("REPOSTED")).toHaveLength(1);
    }
    expect(await prisma.jobEvent.count({ where: { type: "SALARY_CHANGED" } })).toBeGreaterThan(0);
  });

  it("creates succeeded, failed and timed-out crawl runs", async () => {
    const runs = await prisma.crawlRun.groupBy({ by: ["status"], _count: true });
    const byStatus = Object.fromEntries(runs.map((x) => [x.status, x._count]));
    expect(byStatus["SUCCEEDED"]).toBeGreaterThan(0);
    expect(byStatus["FAILED"]).toBeGreaterThan(0);
    expect(byStatus["TIMED_OUT"]).toBe(1);
    const failed = await prisma.crawlRun.findMany({ where: { status: "FAILED" } });
    expect(failed.every((f) => f.errorMessage)).toBe(true);
  });
});
