import Fastify, { type FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import type { Config } from "./config.js";
import { registerErrorHandlers } from "./plugins/errors.js";
import { registerPrisma } from "./plugins/prisma.js";
import { registerHealthRoutes, type HealthOptions } from "./plugins/health.js";
import { ROUTE_SCOPES, registerRoutes } from "./plugins/routes.js";

export interface BuildAppOptions extends HealthOptions {
  config: Config;
}

export async function buildApp({
  config,
  ...health
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: ["req.headers.authorization", "req.headers.cookie"],
      ...(config.NODE_ENV === "development" && {
        transport: { target: "pino-pretty" },
      }),
    },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: { title: "truejobs API", version: "1.0.0" },
      tags: ROUTE_SCOPES.map((name) => ({ name })),
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });
  if (config.NODE_ENV !== "production") {
    await app.register(swaggerUi, { routePrefix: "/docs" });
  }

  registerErrorHandlers(app);
  registerHealthRoutes(app, health);
  await registerRoutes(app);
  const prisma = registerPrisma(app, config.DATABASE_URL);
  registerHealthRoutes(app, {
    readinessCheck: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
    ...health,
  });

  return app;
}
