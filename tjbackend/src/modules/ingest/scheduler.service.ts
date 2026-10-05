import { Prisma } from "../../generated/prisma/client.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { AtsType, CrawlRunStatus } from "../../generated/prisma/enums.js";
import { AppError } from "../../lib/errors.js";

type Tx = Prisma.TransactionClient;

const MS_PER_MINUTE = 60_000;
const MAX_BACKOFF_MINUTES = 1440;
const MAX_BACKOFF_EXPONENT = 5;

export interface ClaimInput {
  workerId: string;
  maxRuns: number;
  atsTypes?: AtsType[];
}

export interface SchedulerOptions {
  leaseMinutes: number;
  /** Injectable clock for tests. */
  now?: () => Date;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MS_PER_MINUTE);
}

/**
 * Failure bookkeeping shared by the reaper and `complete(FAILED)`: counts the failure and backs
 * off `nextCrawlAt` using the post-increment failure count.
 */
export async function applySourceFailure(
  tx: Tx,
  sourceId: string,
  status: Extract<CrawlRunStatus, "FAILED" | "TIMED_OUT">,
  message: string,
  now: Date = new Date(),
): Promise<void> {
  const source = await tx.careerSource.update({
    where: { id: sourceId },
    data: {
      consecutiveFailures: { increment: 1 },
      lastRunStatus: status,
      lastError: message,
    },
    select: { consecutiveFailures: true, crawlIntervalMinutes: true },
  });
  const backoffMinutes = Math.min(
    source.crawlIntervalMinutes * 2 ** Math.min(source.consecutiveFailures, MAX_BACKOFF_EXPONENT),
    MAX_BACKOFF_MINUTES,
  );
  await tx.careerSource.update({
    where: { id: sourceId },
    data: { nextCrawlAt: addMinutes(now, backoffMinutes) },
  });
}

/** Marks RUNNING runs with an expired lease as TIMED_OUT and counts a failure on their sources. */
async function reapExpiredRuns(tx: Tx, now: Date): Promise<void> {
  const reaped = await tx.$queryRaw<{ career_source_id: string }[]>`
    UPDATE crawl_runs
    SET status = 'TIMED_OUT', finished_at = ${now}, error_message = 'Lease expired', updated_at = ${now}
    WHERE status = 'RUNNING' AND lease_expires_at < ${now}
    RETURNING career_source_id`;
  for (const { career_source_id } of reaped) {
    await applySourceFailure(tx, career_source_id, "TIMED_OUT", "Lease expired", now);
  }
}

export function createScheduler(prisma: PrismaClient, options: SchedulerOptions) {
  const clock = options.now ?? (() => new Date());

  async function claim({ workerId, maxRuns, atsTypes }: ClaimInput) {
    return prisma.$transaction(async (tx) => {
      const now = clock();
      await reapExpiredRuns(tx, now);

      const atsFilter = atsTypes?.length
        ? Prisma.sql`AND cs.ats_type = ANY(${atsTypes}::ats_type[])`
        : Prisma.empty;
      const due = await tx.$queryRaw<{ id: string }[]>`
        SELECT cs.id FROM career_sources cs
        JOIN companies c ON c.id = cs.company_id
        WHERE cs.is_enabled AND c.status = 'ACTIVE' AND cs.next_crawl_at <= ${now}
          AND NOT EXISTS (
            SELECT 1 FROM crawl_runs r WHERE r.career_source_id = cs.id AND r.status = 'RUNNING')
          ${atsFilter}
        ORDER BY cs.next_crawl_at ASC
        LIMIT ${maxRuns}
        FOR UPDATE OF cs SKIP LOCKED`;

      const leaseExpiresAt = addMinutes(now, options.leaseMinutes);
      const runs = [];
      for (const { id } of due) {
        const run = await tx.crawlRun.create({
          data: { careerSourceId: id, status: "RUNNING", workerId, startedAt: now, leaseExpiresAt },
        });
        const source = await tx.careerSource.update({
          where: { id },
          select: {
            id: true,
            atsType: true,
            identifier: true,
            config: true,
            careersPageUrl: true,
            crawlIntervalMinutes: true,
            company: { select: { id: true, name: true, slug: true, websiteUrl: true } },
          },
          data: { lastCrawlAt: now },
        });
        await tx.careerSource.update({
          where: { id },
          data: { nextCrawlAt: addMinutes(now, source.crawlIntervalMinutes) },
        });
        runs.push({
          runId: run.id,
          leaseExpiresAt: leaseExpiresAt.toISOString(),
          source: {
            id: source.id,
            atsType: source.atsType,
            identifier: source.identifier,
            config: source.config,
            careersPageUrl: source.careersPageUrl,
            company: source.company,
          },
        });
      }
      return { runs };
    });
  }

  async function heartbeat(runId: string) {
    const leaseExpiresAt = addMinutes(clock(), options.leaseMinutes);
    // Conditional update so a run completed concurrently is never revived.
    const { count } = await prisma.crawlRun.updateMany({
      where: { id: runId, status: "RUNNING" },
      data: { leaseExpiresAt },
    });
    if (count === 0) {
      const exists = await prisma.crawlRun.findUnique({ where: { id: runId }, select: { id: true } });
      if (!exists) throw new AppError(404, "RUN_NOT_FOUND", "Crawl run not found");
      throw new AppError(409, "RUN_NOT_RUNNING", "Crawl run is not running");
    }
    return { leaseExpiresAt: leaseExpiresAt.toISOString() };
  }

  return { claim, heartbeat };
}

export type Scheduler = ReturnType<typeof createScheduler>;
