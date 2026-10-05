import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import type { Config } from "../../config.js";
import { AtsTypeSchema } from "../../lib/enums.js";
import { ErrorResponse, IsoDateTime } from "../../lib/schemas.js";
import type { ZodRoutes } from "../../plugins/routes.js";
import { crawlerAuth } from "./auth.js";
import { createScheduler } from "./scheduler.service.js";

const ClaimBody = z.object({
  workerId: z.string().min(1).max(100),
  maxRuns: z.number().int().min(1).max(20).default(1),
  atsTypes: z.array(AtsTypeSchema).optional(),
});

const ClaimedRun = z.object({
  runId: z.uuid(),
  leaseExpiresAt: IsoDateTime,
  source: z.object({
    id: z.uuid(),
    atsType: AtsTypeSchema,
    identifier: z.string(),
    config: z.unknown(),
    careersPageUrl: z.string().nullable(),
    company: z.object({
      id: z.uuid(),
      name: z.string(),
      slug: z.string(),
      websiteUrl: z.string(),
    }),
  }),
});

const security = [{ bearerAuth: [] }];

export function ingestRoutes(config: Config): ZodRoutes {
  return async (app) => {
    app.addHook("onRequest", crawlerAuth(config.CRAWLER_API_TOKENS));
    const scheduler = createScheduler(app.prisma, { leaseMinutes: config.CRAWL_LEASE_MINUTES });
    const typed = app.withTypeProvider<ZodTypeProvider>();

    typed.post(
      "/crawl-runs/claim",
      {
        schema: {
          summary: "Lease due career sources for crawling",
          security,
          body: ClaimBody,
          response: {
            200: z.object({ runs: z.array(ClaimedRun) }),
            400: ErrorResponse,
            401: ErrorResponse,
          },
        },
      },
      async (req) => scheduler.claim(req.body),
    );

    typed.post(
      "/crawl-runs/:runId/heartbeat",
      {
        schema: {
          summary: "Extend the lease of a running crawl run",
          security,
          params: z.object({ runId: z.uuid() }),
          body: z.object({}).optional(),
          response: {
            200: z.object({ leaseExpiresAt: IsoDateTime }),
            400: ErrorResponse,
            401: ErrorResponse,
            404: ErrorResponse,
            409: ErrorResponse,
          },
        },
      },
      async (req) => scheduler.heartbeat(req.params.runId),
    );
  };
}
