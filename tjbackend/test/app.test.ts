import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { AppError } from "../src/lib/errors.js";

const config = loadConfig({
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgresql://truejobs:truejobs@localhost:5432/truejobs_test",
});

let app: FastifyInstance;
afterEach(() => app.close());

describe("health", () => {
  it("GET /healthz returns ok", async () => {
    app = buildApp({ config });
    const res = await app.inject("/healthz");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("GET /readyz returns 200 when the check passes", async () => {
    app = buildApp({ config });
    const res = await app.inject("/readyz");
    expect(res.statusCode).toBe(200);
  });

  it("GET /readyz returns 503 when the check fails", async () => {
    app = buildApp({
      config,
      readinessCheck: async () => {
        throw new Error("db down");
      },
    });
    const res = await app.inject("/readyz");
    expect(res.statusCode).toBe(503);
    expect(res.json().error.code).toBe("NOT_READY");
    expect(res.body).not.toContain("db down");
  });
});

describe("error handling", () => {
  it("returns the standard 404 shape", async () => {
    app = buildApp({ config });
    const res = await app.inject("/nope");
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("returns 500 INTERNAL_ERROR without leaking the stack", async () => {
    app = buildApp({ config });
    app.get("/boom", async () => {
      throw new Error("secret detail");
    });
    const res = await app.inject("/boom");
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
    expect(res.body).not.toContain("secret detail");
    expect(res.body).not.toContain("at ");
  });

  it("maps AppError to its status, code and details", async () => {
    app = buildApp({ config });
    app.get("/conflict", async () => {
      throw new AppError(409, "CONFLICT", "Already exists", { field: "slug" });
    });
    const res = await app.inject("/conflict");
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: { code: "CONFLICT", message: "Already exists", details: { field: "slug" } },
    });
  });

  it("maps malformed JSON to a 400 in the standard shape", async () => {
    app = buildApp({ config });
    app.post("/echo", async (req) => req.body);
    const res = await app.inject({
      method: "POST",
      url: "/echo",
      headers: { "content-type": "application/json" },
      payload: "{bad",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("BAD_REQUEST");
  });
});
