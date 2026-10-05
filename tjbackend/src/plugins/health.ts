import type { FastifyInstance } from "fastify";
import { errorBody } from "../lib/errors.js";

export type ReadinessCheck = () => Promise<void>;

export interface HealthOptions {
  /** Throws when a dependency is unavailable. TRUEJOBS-6 adds the DB ping. */
  readinessCheck?: ReadinessCheck;
}

export function registerHealthRoutes(app: FastifyInstance, options: HealthOptions = {}): void {
  const readinessCheck = options.readinessCheck ?? (async () => {});

  app.get("/healthz", async () => ({ status: "ok" }));

  app.get("/readyz", async (request, reply) => {
    try {
      await readinessCheck();
      return { status: "ok" };
    } catch (err) {
      request.log.warn({ err }, "readiness check failed");
      return reply.status(503).send(errorBody("NOT_READY", "Service is not ready"));
    }
  });
}
