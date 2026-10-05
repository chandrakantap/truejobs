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
});
