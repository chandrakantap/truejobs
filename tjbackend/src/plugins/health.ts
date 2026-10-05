import type { FastifyInstance } from "fastify";
import { errorBody } from "../lib/errors.js";

export type ReadinessCheck = () => Promise<void>;

export interface HealthOptions {
  /** Throws when a dependency is unavailable. Overrides the default DB ping (used in tests). */
  readinessCheck?: ReadinessCheck;
}

export function registerHealthRoutes(app: FastifyInstance, options: HealthOptions = {}): void {
  const readinessCheck = options.readinessCheck ?? (async () => {});

  app.get("/healthz", { schema: { hide: true } }, async () => ({ status: "ok" }));

  app.get("/readyz", { schema: { hide: true } }, async (request, reply) => {
    try {
      await readinessCheck();
      return { status: "ok" };
    } catch (err) {
      request.log.warn({ err }, "readiness check failed");
      return reply.status(503).send(errorBody("NOT_READY", "Service is not ready"));
    }
  });
}
