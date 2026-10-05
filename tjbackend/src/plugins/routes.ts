import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type { Config } from "../config.js";
import { ingestRoutes } from "../modules/ingest/routes.js";

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

// Later tickets add routes (and per-scope auth hooks) to these.
const publicRoutes: ZodRoutes = async () => {};
const adminRoutes: ZodRoutes = async () => {};

export async function registerRoutes(app: FastifyInstance, config: Config): Promise<void> {
  await app.register(scope("public", publicRoutes), { prefix: "/v1/public" });
  await app.register(scope("admin", adminRoutes), { prefix: "/v1/admin" });
  await app.register(scope("ingest", ingestRoutes(config)), { prefix: "/v1/ingest" });
}
