import { execFileSync } from "node:child_process";

/** Applies migrations to the test database once before the suite. */
export default function setup(): void {
  const url =
    process.env.DATABASE_URL_TEST ?? "postgresql://truejobs:truejobs@localhost:5432/truejobs_test";
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
