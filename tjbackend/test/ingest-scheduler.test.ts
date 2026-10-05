import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { TEST_DATABASE_URL, createCompany, createSource, createTestPrisma, resetDb } from "./helpers/db.js";

const TOKEN = "t".repeat(40);
const auth = { authorization: `Bearer ${TOKEN}` };

let prisma: PrismaClient;
let app: FastifyInstance;

beforeAll(async () => {
  prisma = createTestPrisma();
  app = await buildApp({
    config: loadConfig({
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      DATABASE_URL: TEST_DATABASE_URL,
      CRAWLER_API_TOKENS: `${"o".repeat(32)},${TOKEN}`,
    }),
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(() => resetDb(prisma));
afterEach(() => resetDb(prisma));

const claim = (body: object, headers: Record<string, string> = auth) =>
  app.inject({ method: "POST", url: "/v1/ingest/crawl-runs/claim", headers, payload: body });

const past = () => new Date(Date.now() - 60_000);

describe("crawler auth", () => {
  it.each([
    ["no token", undefined],
    ["a wrong token of equal length", `Bearer ${"x".repeat(40)}`],
    ["a token of different length", "Bearer short"],
    ["a non-bearer scheme", `Basic ${TOKEN}`],
  ])("returns 401 for %s", async (_name, authorization) => {
    const res = await claim({ workerId: "w" }, authorization ? { authorization } : {});
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
  });

  it("accepts any configured token", async () => {
    const res = await claim({ workerId: "w" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ runs: [] });
  });

  it("rejects every token when none are configured", async () => {
    const bare = await buildApp({
      config: loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent", DATABASE_URL: TEST_DATABASE_URL }),
    });
    const res = await bare.inject({
      method: "POST",
      url: "/v1/ingest/crawl-runs/claim",
      headers: auth,
      payload: { workerId: "w" },
    });
    await bare.close();
    expect(res.statusCode).toBe(401);
  });
});

describe("POST /v1/ingest/crawl-runs/claim", () => {
  it("validates the body", async () => {
    expect((await claim({})).statusCode).toBe(400);
    expect((await claim({ workerId: "w", maxRuns: 21 })).statusCode).toBe(400);
    expect((await claim({ workerId: "w", atsTypes: ["NOPE"] })).statusCode).toBe(400);
  });

  it("returns the documented shape and schedules the next crawl", async () => {
    const company = await createCompany(prisma, { name: "Stripe", slug: "stripe" });
    const source = await createSource(prisma, {
      companyId: company.id,
      identifier: "stripe",
      careersPageUrl: "https://stripe.com/jobs",
      crawlIntervalMinutes: 120,
    });

    const res = await claim({ workerId: "crawler-1" });
    expect(res.statusCode).toBe(200);
    const [run, ...rest] = res.json().runs;
    expect(rest).toHaveLength(0);
    expect(run.source).toEqual({
      id: source.id,
      atsType: "GREENHOUSE",
      identifier: "stripe",
      config: {},
      careersPageUrl: "https://stripe.com/jobs",
      company: { id: company.id, name: "Stripe", slug: "stripe", websiteUrl: company.websiteUrl },
    });

    const row = await prisma.crawlRun.findUniqueOrThrow({ where: { id: run.runId } });
    expect(row).toMatchObject({ status: "RUNNING", workerId: "crawler-1" });
    expect(row.leaseExpiresAt.toISOString()).toBe(run.leaseExpiresAt);
    expect(row.leaseExpiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 60_000);

    const updated = await prisma.careerSource.findUniqueOrThrow({ where: { id: source.id } });
    expect(updated.lastCrawlAt).not.toBeNull();
    const expected = Date.now() + 120 * 60_000;
    expect(Math.abs(updated.nextCrawlAt.getTime() - expected)).toBeLessThan(5_000);
  });

  it("returns only due, enabled sources of ACTIVE companies without a RUNNING run", async () => {
    const due = await createSource(prisma);
    await createSource(prisma, { isEnabled: false });
    await createSource(prisma, { nextCrawlAt: new Date(Date.now() + 3_600_000) });
    const paused = await createCompany(prisma, { status: "PAUSED" });
    await createSource(prisma, { companyId: paused.id });
    const archived = await createCompany(prisma, { status: "ARCHIVED" });
    await createSource(prisma, { companyId: archived.id });
    const running = await createSource(prisma);
    await prisma.crawlRun.create({
      data: {
        careerSourceId: running.id,
        status: "RUNNING",
        workerId: "other",
        leaseExpiresAt: new Date(Date.now() + 600_000),
      },
    });

    const res = await claim({ workerId: "w", maxRuns: 20 });
    expect(res.json().runs.map((r: { source: { id: string } }) => r.source.id)).toEqual([due.id]);
  });

  it("does not hand the same source to two parallel claims", async () => {
    for (let i = 0; i < 6; i++) await createSource(prisma);
    const [a, b] = await Promise.all([
      claim({ workerId: "a", maxRuns: 5 }),
      claim({ workerId: "b", maxRuns: 5 }),
    ]);
    const ids = [a, b].flatMap((res) =>
      res.json().runs.map((r: { source: { id: string } }) => r.source.id),
    );
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
  });

  it("filters by atsTypes", async () => {
    await createSource(prisma, { atsType: "GREENHOUSE" });
    const lever = await createSource(prisma, { atsType: "LEVER" });
    const res = await claim({ workerId: "w", maxRuns: 5, atsTypes: ["LEVER", "ASHBY"] });
    expect(res.json().runs.map((r: { source: { id: string } }) => r.source.id)).toEqual([lever.id]);
  });

  it("honours maxRuns, oldest due first", async () => {
    const first = await createSource(prisma, { nextCrawlAt: new Date(Date.now() - 20_000) });
    await createSource(prisma, { nextCrawlAt: new Date(Date.now() - 10_000) });
    const res = await claim({ workerId: "w", maxRuns: 1 });
    expect(res.json().runs.map((r: { source: { id: string } }) => r.source.id)).toEqual([first.id]);
  });

  it("reaps expired runs, backs off the source and lets it be claimed once due", async () => {
    const source = await createSource(prisma, {
      crawlIntervalMinutes: 60,
      nextCrawlAt: new Date(Date.now() + 3_600_000),
      consecutiveFailures: 1,
    });
    const stale = await prisma.crawlRun.create({
      data: { careerSourceId: source.id, status: "RUNNING", workerId: "dead", leaseExpiresAt: past() },
    });

    const res = await claim({ workerId: "w" });
    expect(res.json().runs).toEqual([]); // backed off, so not due yet

    const run = await prisma.crawlRun.findUniqueOrThrow({ where: { id: stale.id } });
    expect(run).toMatchObject({ status: "TIMED_OUT", errorMessage: "Lease expired" });
    expect(run.finishedAt).not.toBeNull();

    const after = await prisma.careerSource.findUniqueOrThrow({ where: { id: source.id } });
    expect(after).toMatchObject({
      consecutiveFailures: 2,
      lastRunStatus: "TIMED_OUT",
      lastError: "Lease expired",
    });
    // 60 min * 2^2 = 240 min
    expect(Math.abs(after.nextCrawlAt.getTime() - (Date.now() + 240 * 60_000))).toBeLessThan(5_000);

    await prisma.careerSource.update({ where: { id: source.id }, data: { nextCrawlAt: past() } });
    const again = await claim({ workerId: "w" });
    expect(again.json().runs).toHaveLength(1);
  });

  it("caps the failure backoff at 24 hours", async () => {
    const source = await createSource(prisma, {
      crawlIntervalMinutes: 360,
      consecutiveFailures: 9,
    });
    await prisma.crawlRun.create({
      data: { careerSourceId: source.id, status: "RUNNING", workerId: "dead", leaseExpiresAt: past() },
    });
    await claim({ workerId: "w" });
    const after = await prisma.careerSource.findUniqueOrThrow({ where: { id: source.id } });
    expect(Math.abs(after.nextCrawlAt.getTime() - (Date.now() + 1440 * 60_000))).toBeLessThan(5_000);
  });
});

describe("POST /v1/ingest/crawl-runs/:runId/heartbeat", () => {
  const heartbeat = (runId: string) =>
    app.inject({
      method: "POST",
      url: `/v1/ingest/crawl-runs/${runId}/heartbeat`,
      headers: auth,
      payload: {},
    });

  async function createRun(status: "RUNNING" | "SUCCEEDED", leaseExpiresAt: Date) {
    const source = await createSource(prisma);
    return prisma.crawlRun.create({
      data: { careerSourceId: source.id, status, workerId: "w", leaseExpiresAt },
    });
  }

  it("requires a token", async () => {
    const run = await createRun("RUNNING", new Date());
    const res = await app.inject({
      method: "POST",
      url: `/v1/ingest/crawl-runs/${run.id}/heartbeat`,
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  it("extends the lease of a RUNNING run", async () => {
    const soon = new Date(Date.now() + 60_000);
    const run = await createRun("RUNNING", soon);
    const res = await heartbeat(run.id);
    expect(res.statusCode).toBe(200);
    const { leaseExpiresAt } = res.json();
    expect(new Date(leaseExpiresAt).getTime()).toBeGreaterThan(Date.now() + 29 * 60_000);
    const row = await prisma.crawlRun.findUniqueOrThrow({ where: { id: run.id } });
    expect(row.leaseExpiresAt.toISOString()).toBe(leaseExpiresAt);
  });

  it("returns 409 RUN_NOT_RUNNING for a finished run", async () => {
    const run = await createRun("SUCCEEDED", new Date());
    const res = await heartbeat(run.id);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("RUN_NOT_RUNNING");
  });

  it("returns 404 RUN_NOT_FOUND for an unknown run", async () => {
    const res = await heartbeat("00000000-0000-4000-8000-000000000000");
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("RUN_NOT_FOUND");
  });
});

describe("OpenAPI", () => {
  it("documents both routes under the ingest tag with bearer security", () => {
    const doc = app.swagger() as {
      paths: Record<string, { post?: { tags?: string[]; security?: unknown[] } }>;
      components?: { securitySchemes?: Record<string, unknown> };
    };
    for (const path of [
      "/v1/ingest/crawl-runs/claim",
      "/v1/ingest/crawl-runs/{runId}/heartbeat",
    ]) {
      expect(doc.paths[path]?.post?.tags).toEqual(["ingest"]);
      expect(doc.paths[path]?.post?.security).toEqual([{ bearerAuth: [] }]);
    }
    expect(doc.components?.securitySchemes).toHaveProperty("bearerAuth");
  });
});
