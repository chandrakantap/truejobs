import { z } from "zod";

const MIN_TOKEN_LENGTH = 32;

const envSchema = z
  .object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().min(1).default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().min(1),
  /** Comma-separated bearer tokens accepted on /v1/ingest. */
  CRAWLER_API_TOKENS: z
    .string()
    .default("")
    .transform((raw) =>
      raw
        .split(",")
        .map((token) => token.trim())
        .filter((token) => token.length > 0),
    ),
  CRAWL_LEASE_MINUTES: z.coerce.number().int().min(1).default(30),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.CRAWLER_API_TOKENS.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["CRAWLER_API_TOKENS"],
        message: "is required in production",
      });
    }
    if (env.CRAWLER_API_TOKENS.some((token) => token.length < MIN_TOKEN_LENGTH)) {
      ctx.addIssue({
        code: "custom",
        path: ["CRAWLER_API_TOKENS"],
        message: `each token must be at least ${MIN_TOKEN_LENGTH} characters`,
      });
    }
  });

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}
