import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "../src/generated/prisma/client.js";
import { JobCategorySchema, JobEventType, JobStatusSchema } from "../src/lib/enums.js";
import { createSource, createTestPrisma, resetDb } from "./helpers/db.js";
import { createJob } from "./helpers/factories.js";

const prisma = createTestPrisma();

beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

async function searchIds(query: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM jobs WHERE search_vector @@ websearch_to_tsquery('english', ${query})`;
  return rows.map((r) => r.id);
}

describe("job schema", () => {
  it("creates the job tables, enums, GIN indexes and trigger", async () => {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'job%'`;
    expect(tables.map((t) => t.tablename).sort()).toEqual(["job_events", "job_versions", "jobs"]);

    const idx = await prisma.$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'jobs' AND indexdef LIKE '%USING gin%'`;
    const defs = Object.fromEntries(idx.map((i) => [i.indexname, i.indexdef]));
    expect(defs["jobs_tech_tags_gin"]).toMatch(/\(tech_tags\)/);
    expect(defs["jobs_regions_gin"]).toMatch(/\(regions\)/);
    expect(defs["jobs_search_vector_gin"]).toMatch(/\(search_vector\)/);
    expect(defs["jobs_title_trgm"]).toMatch(/title gin_trgm_ops/);

    const trg = await prisma.$queryRaw<{ tgname: string }[]>`
      SELECT tgname FROM pg_trigger WHERE tgrelid = 'jobs'::regclass AND NOT tgisinternal`;
    expect(trg.map((t) => t.tgname)).toEqual(["jobs_search_vector_trigger"]);
  });

  it("populates search_vector on insert", async () => {
    const job = await createJob(prisma, { title: "Senior Backend Engineer", techTags: ["java"] });
    await createJob(prisma, { title: "Product Designer", techTags: ["figma"] });
    expect(await searchIds("backend java")).toEqual([job.id]);
  });

  it("refreshes search_vector when the title changes", async () => {
    const job = await createJob(prisma, { title: "Senior Backend Engineer", techTags: ["java"] });
    await prisma.job.update({ where: { id: job.id }, data: { title: "Staff Frontend Engineer" } });
    expect(await searchIds("backend")).toEqual([]);
    expect(await searchIds("frontend")).toEqual([job.id]);
  });

  it("indexes tech_tags and description_text", async () => {
    const job = await createJob(prisma, { techTags: ["golang"], descriptionText: "Kubernetes operators" });
    expect(await searchIds("kubernetes")).toEqual([job.id]);
    await prisma.job.update({ where: { id: job.id }, data: { techTags: ["rust"] } });
    expect(await searchIds("golang")).toEqual([]);
    expect(await searchIds("rust")).toEqual([job.id]);
  });

  it("rejects a duplicate (careerSourceId, externalId)", async () => {
    const source = await createSource(prisma);
    await createJob(prisma, { careerSourceId: source.id, companyId: source.companyId, externalId: "42" });
    const err = await createJob(prisma, {
      careerSourceId: source.id,
      companyId: source.companyId,
      externalId: "42",
    }).catch((e) => e);
    expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(err.code).toBe("P2002");
  });

  it("cascades versions and events when a job is deleted", async () => {
    const job = await createJob(prisma);
    await prisma.jobVersion.create({
      data: {
        jobId: job.id,
        versionNumber: 1,
        contentHash: "h",
        title: job.title,
        descriptionHtml: job.descriptionHtml,
        locationRaw: job.locationRaw,
      },
    });
    await prisma.jobEvent.create({ data: { jobId: job.id, type: "FIRST_SEEN" } });
    await prisma.job.delete({ where: { id: job.id } });
    expect(await prisma.jobVersion.count()).toBe(0);
    expect(await prisma.jobEvent.count()).toBe(0);
  });

  it("rejects a duplicate (jobId, versionNumber)", async () => {
    const job = await createJob(prisma);
    const data = {
      jobId: job.id,
      versionNumber: 1,
      contentHash: "h",
      title: "t",
      descriptionHtml: "d",
      locationRaw: "l",
    };
    await prisma.jobVersion.create({ data });
    const err = await prisma.jobVersion.create({ data }).catch((e) => e);
    expect(err.code).toBe("P2002");
  });

  it("restricts deleting a company or source that has jobs", async () => {
    const job = await createJob(prisma);
    const e1 = await prisma.company.delete({ where: { id: job.companyId } }).catch((e) => e);
    expect(e1.code).toBe("P2003");
    const e2 = await prisma.careerSource.delete({ where: { id: job.careerSourceId } }).catch((e) => e);
    expect(e2.code).toBe("P2003");
  });

  it("sets duplicate/repost links to null when the target is deleted", async () => {
    const target = await createJob(prisma);
    const job = await createJob(prisma, { duplicateOfJobId: target.id, repostOfJobId: target.id });
    await prisma.job.delete({ where: { id: target.id } });
    const after = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(after.duplicateOfJobId).toBeNull();
    expect(after.repostOfJobId).toBeNull();
  });

  it("applies defaults", async () => {
    const job = await createJob(prisma);
    expect(job).toMatchObject({
      status: "ACTIVE",
      isHidden: false,
      workplaceType: "UNKNOWN",
      employmentType: "UNKNOWN",
      seniority: "UNKNOWN",
      consecutiveMisses: 0,
      versionCount: 1,
      locations: [],
      techTags: [],
      regions: [],
    });
  });
});

describe("enums", () => {
  it("exposes Prisma enums and Zod schemas", () => {
    expect(JobEventType.REOPENED).toBe("REOPENED");
    expect(JobStatusSchema.parse("CLOSED")).toBe("CLOSED");
    expect(JobCategorySchema.safeParse("NOPE").success).toBe(false);
  });
});
