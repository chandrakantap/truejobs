# tjbackend

Fastify 5 + TypeScript API for truejobs.tech. It will own the Postgres schema and serve
`/v1/public`, `/v1/admin` and `/v1/ingest` (see [docs/architecture.md](../docs/architecture.md)).
This is the bare skeleton: config, logging, error handling, health endpoints, tests and CI.

## Setup

```bash
cd tjbackend
cp .env.example .env
pnpm install
pnpm dev        # http://localhost:4000
```

Node version: see the root `.nvmrc`.

## Scripts

| Script           | Purpose                                         |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | Run with `tsx watch`, loading `.env` if present |
| `pnpm build`     | Compile `src/` to `dist/`                       |
| `pnpm start`     | Run the compiled server (`dist/server.js`)      |
| `pnpm lint`      | ESLint                                          |
| `pnpm typecheck` | `tsc --noEmit`                                  |
| `pnpm test`      | Vitest                                          |
| `pnpm openapi:export` | Regenerate `openapi.json` (commit the result) |

## Environment variables

Validated with Zod at startup. A missing or invalid variable stops the process with a message
naming it.

| Variable       | Default       | Notes                                                            |
| -------------- | ------------- | ---------------------------------------------------------------- |
| `NODE_ENV`     | `development` | `development`, `test` or `production`                            |
| `PORT`         | `4000`        |                                                                  |
| `HOST`         | `0.0.0.0`     |                                                                  |
| `LOG_LEVEL`    | `info`        | pino level, or `silent`                                          |
| `DATABASE_URL` | required      | Postgres connection string used by Prisma; see `.env.example`. Tests use `DATABASE_URL_TEST`. |
| `CRAWLER_API_TOKENS` | required in production | Comma-separated bearer tokens for `/v1/ingest`, each at least 32 chars. |
| `CRAWL_LEASE_MINUTES` | `30` | Crawl-run lease length; extended by heartbeats. |

## Layout

- `src/server.ts`: entry point, listens on `PORT`.
- `src/app.ts`: `buildApp({ config })` factory; tests use `app.inject`.
- `src/config.ts`: environment parsing.
- `src/plugins/`: error handlers, health routes and `routes.ts` (the `/v1` scopes).
- `src/modules/<feature>/`: routes, service and schemas per feature.
- `src/lib/`: shared helpers such as `AppError` and `schemas.ts` (Zod schemas, pagination).

## Errors

Every error response has the shape `{ "error": { "code", "message", "details"? } }`.

- Unknown route: 404 `NOT_FOUND`.
- Invalid request (body, query, params): 400 `VALIDATION_ERROR`, with the Zod issues in `details`.
- Unhandled exception: 500 `INTERNAL_ERROR` with a generic message. The stack is logged, never returned.
- Services throw `AppError(statusCode, code, message, details?)` for expected failures.

## API conventions

Routes are declared with Zod schemas (`fastify-type-provider-zod`), which validate requests,
serialize responses and feed the OpenAPI document (3.1). Swagger UI is served at `/docs` unless
`NODE_ENV=production`.

### Adding a route

Routes live under one of three scopes in `src/plugins/routes.ts`: `/v1/public`, `/v1/admin` and
`/v1/ingest`. Each scope is an encapsulated plugin, so hooks added inside it (for example auth)
affect only that scope, and its routes are tagged `public`, `admin` or `ingest` in OpenAPI.

```ts
const publicRoutes: ZodRoutes = async (app) => {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/jobs",
    {
      schema: {
        querystring: paginationQuery({ maxPageSize: 50 }),
        response: { 200: paginated(JobSummary), 400: ErrorResponse },
      },
    },
    async (req) => {
      const { skip, take } = toSkipTake(req.query);
      // ...
    },
  );
};
```

The `/v1/ingest` scope requires `Authorization: Bearer <token>` (see `src/modules/ingest/auth.ts`).

### Pagination and shared schemas (`src/lib/schemas.ts`)

- `paginationQuery({ maxPageSize })`: `page` (int ≥ 1, default 1) and `pageSize` (1..max, default 20).
  Use 50 for public and 100 for admin. A larger `pageSize` is rejected with 400, not clamped.
- `paginated(itemSchema)`: response `{ items, page, pageSize, total }`.
- `toSkipTake({ page, pageSize })`: Prisma `skip`/`take`.
- `csvEnumList(values)`: parses `?category=backend,FRONTEND` into `["BACKEND", "FRONTEND"]`.
- `IsoDateTime`, `ErrorResponse`: shared building blocks.

### OpenAPI export

`openapi.json` is the contract for tjnext, tjadminui and tjcrawler. After changing any route or
schema run `pnpm openapi:export` and commit the result; CI fails with "openapi.json is stale" otherwise.

## Health

- `GET /healthz`: liveness, always `{"status":"ok"}`.
- `GET /readyz`: 200 when the readiness check passes, 503 `NOT_READY` otherwise. The check is a
  no-op for now; TRUEJOBS-6 adds a DB ping.

## Docker

```bash
docker build -t tjbackend tjbackend
docker run --rm -p 4000:4000 -e DATABASE_URL=postgresql://truejobs:truejobs@host.docker.internal:5432/truejobs tjbackend
```

## Database

Schema and migrations live in `prisma/`. With Postgres running (`docker compose up -d postgres`):

- `pnpm db:migrate`: create/apply migrations in development (`prisma migrate dev`)
- `pnpm db:deploy`: apply existing migrations (CI, production)
- `pnpm db:reset`, `pnpm db:studio`, `pnpm prisma:generate` (also runs on `postinstall`)

The generated client (`src/generated/`) is git-ignored. Tests migrate and truncate `truejobs_test` automatically.
