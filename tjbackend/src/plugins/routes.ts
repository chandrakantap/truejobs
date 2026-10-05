import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { ErrorResponse } from "../lib/schemas.js";

export type RouteScope = "public" | "admin" | "ingest";

export const ROUTE_SCOPES: readonly RouteScope[] = ["public", "admin", "ingest"];

/** A plugin that declares routes; call `app.withTypeProvider<ZodTypeProvider>()` for typed schemas. */
export type ZodRoutes = FastifyPluginAsync;

/**
 * Registers `routes` under `/v1/<scope>` as an encapsulated plugin: hooks added inside it (such as
 * auth) only affect that scope, and every route is tagged with the scope in OpenAPI.
 */
export function scope(name: RouteScope, routes: ZodRoutes): FastifyPluginAsync {
  return async (app) => {
    app.addHook("onRoute", (route) => {
      route.schema = { tags: [name], ...route.schema };
    });
    await app.register(routes);
  };
}

const publicRoutes: ZodRoutes = async (app) => {
  // Sample route proving the validation/OpenAPI pipeline. Remove it in the first ticket that adds
  // a real public route.
  app.withTypeProvider<ZodTypeProvider>().get(
    "/ping",
    {
      schema: {
        response: { 200: z.object({ pong: z.literal(true) }), 500: ErrorResponse },
      },
    },
    async () => ({ pong: true as const }),
  );
};

// Later tickets add routes (and per-scope auth hooks) to these.
const adminRoutes: ZodRoutes = async () => {};
const ingestRoutes: ZodRoutes = async () => {};

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(scope("public", publicRoutes), { prefix: "/v1/public" });
  await app.register(scope("admin", adminRoutes), { prefix: "/v1/admin" });
  await app.register(scope("ingest", ingestRoutes), { prefix: "/v1/ingest" });
}
