import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("applies defaults", () => {
    const config = loadConfig({ DATABASE_URL: "postgresql://x" });
    expect(config).toMatchObject({
      NODE_ENV: "development",
      PORT: 4000,
      HOST: "0.0.0.0",
      LOG_LEVEL: "info",
    });
  });

  it("names the missing variable", () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it("rejects an invalid PORT", () => {
    expect(() => loadConfig({ DATABASE_URL: "x", PORT: "abc" })).toThrow(/PORT/);
  });

  it("defaults CRAWL_LEASE_MINUTES and parses CRAWLER_API_TOKENS", () => {
    const token = "a".repeat(32);
    const config = loadConfig({
      DATABASE_URL: "x",
      CRAWLER_API_TOKENS: ` ${token}, ${"b".repeat(40)} `,
    });
    expect(config.CRAWL_LEASE_MINUTES).toBe(30);
    expect(config.CRAWLER_API_TOKENS).toEqual([token, "b".repeat(40)]);
  });

  it("requires CRAWLER_API_TOKENS in production", () => {
    expect(() => loadConfig({ DATABASE_URL: "x", NODE_ENV: "production" })).toThrow(
      /CRAWLER_API_TOKENS/,
    );
  });

  it("rejects tokens shorter than 32 characters", () => {
    expect(() => loadConfig({ DATABASE_URL: "x", CRAWLER_API_TOKENS: "short" })).toThrow(
      /at least 32/,
    );
  });
});
