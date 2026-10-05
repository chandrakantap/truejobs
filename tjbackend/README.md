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

## Environment variables

Validated with Zod at startup. A missing or invalid variable stops the process with a message
naming it.

| Variable       | Default       | Notes                                                            |
| -------------- | ------------- | ---------------------------------------------------------------- |
| `NODE_ENV`     | `development` | `development`, `test` or `production`                            |
| `PORT`         | `4000`        |                                                                  |
| `HOST`         | `0.0.0.0`     |                                                                  |
| `LOG_LEVEL`    | `info`        | pino level, or `silent`                                          |
| `DATABASE_URL` | required      | Not used yet (Prisma arrives in TRUEJOBS-6); see `.env.example`. |

## Layout

- `src/server.ts`: entry point, listens on `PORT`.
- `src/app.ts`: `buildApp({ config })` factory; tests use `app.inject`.
- `src/config.ts`: environment parsing.
- `src/plugins/`: error handlers and health routes.
- `src/modules/<feature>/`: routes, service and schemas per feature.
- `src/lib/`: shared helpers such as `AppError`.

## Errors

Every error response has the shape `{ "error": { "code", "message", "details"? } }`.

- Unknown route: 404 `NOT_FOUND`.
- Unhandled exception: 500 `INTERNAL_ERROR` with a generic message. The stack is logged, never returned.
- Services throw `AppError(statusCode, code, message, details?)` for expected failures.

## Health

- `GET /healthz`: liveness, always `{"status":"ok"}`.
- `GET /readyz`: 200 when the readiness check passes, 503 `NOT_READY` otherwise. The check is a
  no-op for now; TRUEJOBS-6 adds a DB ping.

## Docker

```bash
docker build -t tjbackend tjbackend
docker run --rm -p 4000:4000 -e DATABASE_URL=postgresql://truejobs:truejobs@host.docker.internal:5432/truejobs tjbackend
```
