import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { csvEnumList, paginated, paginationQuery, toSkipTake } from "../src/lib/schemas.js";

const env = {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgresql://truejobs:truejobs@localhost:5432/truejobs_test",
};

let app: FastifyInstance;
afterEach(() => app.close());

describe("routing and validation", () => {
  it("serves the sample route under /v1/public", async () => {
    app = await buildApp({ config: loadConfig(env) });
    const res = await app.inject("/v1/public/ping");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ pong: true });
  });

  it("maps an invalid query to 400 VALIDATION_ERROR with details", async () => {
    app = await buildApp({ config: loadConfig(env) });
    app.withTypeProvider<ZodTypeProvider>().get(
      "/v1/public/things",
      { schema: { querystring: paginationQuery({ maxPageSize: 50 }) } },
      async (req) => req.query,
    );
    const res = await app.inject("/v1/public/things?pageSize=51");
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(body.error.details)).toBe(true);
    expect(body.error.details.length).toBeGreaterThan(0);
  });

  it("applies pagination defaults", async () => {
    app = await buildApp({ config: loadConfig(env) });
    app.withTypeProvider<ZodTypeProvider>().get(
      "/v1/public/things",
      { schema: { querystring: paginationQuery({ maxPageSize: 50 }) } },
      async (req) => req.query,
    );
    const res = await app.inject("/v1/public/things");
    expect(res.json()).toEqual({ page: 1, pageSize: 20 });
  });
});

describe("/docs", () => {
  it("is served outside production", async () => {
    app = await buildApp({ config: loadConfig(env) });
    const res = await app.inject("/docs");
    expect([200, 302]).toContain(res.statusCode);
  });

  it("returns 404 in production", async () => {
    app = await buildApp({ config: loadConfig({ ...env, NODE_ENV: "production" }) });
    const res = await app.inject("/docs");
    expect(res.statusCode).toBe(404);
  });
});

describe("OpenAPI document", () => {
  it("contains the ping route, scope tags and ErrorResponse", async () => {
    app = await buildApp({ config: loadConfig(env) });
    await app.ready();
    const doc = app.swagger() as {
      openapi: string;
      paths: Record<string, { get?: { tags?: string[] } }>;
      components?: { schemas?: Record<string, unknown> };
    };
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.paths["/v1/public/ping"]?.get?.tags).toEqual(["public"]);
    expect(doc.components?.schemas).toHaveProperty("ErrorResponse");
    expect(doc.paths["/healthz"]).toBeUndefined();
  });
});

describe("schema helpers", () => {
  const query = paginationQuery({ maxPageSize: 100 });

  it("defaults page and pageSize", () => {
    expect(query.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("coerces strings", () => {
    expect(query.parse({ page: "3", pageSize: "10" })).toEqual({ page: 3, pageSize: 10 });
  });

  it("rejects page 0, pageSize 0 and pageSize over max", () => {
    expect(query.safeParse({ page: "0" }).success).toBe(false);
    expect(query.safeParse({ pageSize: "0" }).success).toBe(false);
    expect(query.safeParse({ pageSize: "101" }).success).toBe(false);
  });

  it("toSkipTake computes offsets", () => {
    expect(toSkipTake({ page: 1, pageSize: 20 })).toEqual({ skip: 0, take: 20 });
    expect(toSkipTake({ page: 3, pageSize: 10 })).toEqual({ skip: 20, take: 10 });
  });

  it("paginated wraps items", () => {
    const schema = paginated(z.object({ id: z.string() }));
    expect(schema.parse({ items: [{ id: "a" }], page: 1, pageSize: 20, total: 1 }).total).toBe(1);
  });

  it("csvEnumList parses case-insensitively and rejects unknown values", () => {
    const list = csvEnumList(["BACKEND", "FRONTEND"]);
    expect(list.parse("backend, Frontend")).toEqual(["BACKEND", "FRONTEND"]);
    expect(list.safeParse("BACKEND,NOPE").success).toBe(false);
  });
});
