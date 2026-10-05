import { randomUUID } from "node:crypto";
import type { Job, Prisma, PrismaClient } from "../../src/generated/prisma/client.js";
import { createSource } from "./db.js";

/** Creates a Job with valid defaults; creates a company and source unless `careerSourceId` is given. */
export async function createJob(
  prisma: PrismaClient,
  overrides: Partial<Prisma.JobUncheckedCreateInput> = {},
): Promise<Job> {
  const id = randomUUID().slice(0, 8);
  let { companyId, careerSourceId } = overrides;
  if (!careerSourceId) {
    const source = await createSource(prisma, companyId ? { companyId } : {});
    careerSourceId = source.id;
    companyId = source.companyId;
  } else if (!companyId) {
    const source = await prisma.careerSource.findUniqueOrThrow({ where: { id: careerSourceId } });
    companyId = source.companyId;
  }
  const now = new Date();
  return prisma.job.create({
    data: {
      slug: `job-${id}`,
      externalId: `ext-${id}`,
      title: "Software Engineer",
      normalizedTitle: "software engineer",
      descriptionHtml: "<p>Build things.</p>",
      descriptionText: "Build things.",
      applyUrl: `https://jobs.example.com/${id}`,
      locationRaw: "Remote",
      category: "BACKEND",
      firstSeenAt: now,
      lastSeenAt: now,
      contentHash: `hash-${id}`,
      normalizerVersion: 1,
      rawPayload: {},
      ...overrides,
      companyId: companyId!,
      careerSourceId,
    },
  });
}
