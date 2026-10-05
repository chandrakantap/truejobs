import Fastify, { type FastifyInstance } from "fastify";
import type { Config } from "./config.js";
import { registerErrorHandlers } from "./plugins/errors.js";
import { registerHealthRoutes, type HealthOptions } from "./plugins/health.js";

export interface BuildAppOptions extends HealthOptions {
  config: Config;
}

export function buildApp({ config, ...health }: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: ["req.headers.authorization", "req.headers.cookie"],
      ...(config.NODE_ENV === "development" && {
        transport: { target: "pino-pretty" },
      }),
    },
  });

  registerErrorHandlers(app);
  registerHealthRoutes(app, health);

  return app;
}
