import { writeFile } from "node:fs/promises";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

/** Recursively sorts object keys so the committed file is stable across runs. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, child]) => [key, sortKeys(child)]),
    );
  }
  return value;
}

const config = loadConfig({
  ...process.env,
  NODE_ENV: "development",
  LOG_LEVEL: "silent",
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://unused",
});
const app = await buildApp({ config });
await app.ready();

const outFile = new URL("../openapi.json", import.meta.url);
await writeFile(outFile, `${JSON.stringify(sortKeys(app.swagger()), null, 2)}\n`);
await app.close();
console.log("wrote openapi.json");
