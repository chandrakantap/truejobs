# truejobs.tech — Phase 1 Architecture

> Source of truth for the Plane project `truejobs` (TRUEJOBS). Every work item assumes the
> decisions below. If a work item conflicts with this document, the work item wins for its own
> scope and the agent should flag the conflict in the PR.

## 1. Product scope (Phase 1)

truejobs.tech is a job intelligence board for software engineers. Jobs come **only** from company
career sites and public ATS boards that the truejobs team curates by hand. Each job keeps its
history: first seen, last verified, closed, reopened, reposted, and content changes.

**In scope (Phase 1)**

- **tjadminui**: the truejobs team (the founder plus employees) curates companies and their career
  sources, monitors crawls, and hides bad jobs.
- **tjcrawler**: crawls each career source on a schedule and sends normalized-ready job snapshots
  to the backend.
- **tjbackend**: the single owner of the database. It handles ingestion, normalization, lifecycle
  and history, plus the public, admin and ingest APIs.
- **tjnext**: the public job board, with search, filters, job details and intelligence signals,
  company pages and SEO. Anonymous only.

**Out of scope (Phase 2)**: job-seeker registration and login, saved searches and alerts,
subscriptions, payments and paywall. Design for them, but do not build them. For example, keep
public read endpoints under `/v1/public` so a future `/v1/me` or `/v1/billing` can sit next to them.

## 2. System overview

```text
                 ┌──────────────────────┐        ┌──────────────────────┐
 truejobs team → │ tjadminui (Vite SPA) │        │  tjnext (Next.js)    │ ← job seekers
                 │ admin.truejobs.tech  │        │  truejobs.tech       │
                 └─────────┬────────────┘        └─────────┬────────────┘
                   /api/v1/admin/* (same-origin,           │ server-side fetch only
                   cookie session, Caddy proxy)            │ /v1/public/*  (internal network)
                           ▼                               ▼
                 ┌────────────────────────────────────────────────────────┐
                 │ tjbackend (Fastify + Prisma)  :4000                    │
                 │  /v1/admin/*   /v1/public/*   /v1/ingest/*   /healthz  │
                 │  normalization · job lifecycle engine · scheduler      │
                 └─────────┬───────────────────────────────▲──────────────┘
                           │ Prisma                        │ Bearer token
                           ▼                               │ claim → jobs → complete
                 ┌──────────────────────┐        ┌─────────┴────────────┐
                 │ PostgreSQL 16        │        │ tjcrawler (Scrapy)   │ → Greenhouse, Lever,
                 │ (FTS + pg_trgm)      │        │ worker + spiders     │   Ashby, Workday,
                 └──────────────────────┘        └──────────────────────┘   SmartRecruiters, JSON-LD
```

### Key architecture decisions

| #    | Decision                                                                                                                                                                                                                                                           | Why                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| AD1  | **tjbackend is the only service that touches Postgres.** Prisma schema and migrations live in `tjbackend/prisma`.                                                                                                                                                  | One owner of the data model; the crawler and the UIs stay stateless.                                                                     |
| AD2  | **The backend schedules crawling and the crawler pulls work** (`claim` with lease, `heartbeat`, `jobs` batches, `complete`).                                                                                                                                       | Admin "crawl now", per-source intervals, backoff and health all live in one place. Crawlers can scale horizontally without coordinating. |
| AD3  | **The crawler sends raw-ish job data and the backend normalizes it** (seniority, category, tech tags, location/region, salary, HTML sanitization). `rawPayload` is stored, so jobs can be re-normalized later.                                                     | Classification rules live in one TypeScript codebase with tests and can be re-run over history.                                          |
| AD4  | **Job lifecycle is computed from full snapshots.** A run that ends `SUCCEEDED` with `isCompleteSnapshot=true` allows jobs that are missing to be counted as misses. A job closes after `JOB_CLOSE_MISS_THRESHOLD` (default 2) consecutive misses.                  | Avoids false closures from flaky crawls. History (versions and events) is the product's core asset.                                      |
| AD5  | **Search uses Postgres FTS (tsvector + GIN) plus pg_trgm.** No Elasticsearch in Phase 1.                                                                                                                                                                           | Volumes of 10k–200k jobs fit comfortably. One less system to run.                                                                        |
| AD6  | **tjnext calls tjbackend server-side only** (RSC and route handlers). The backend is not exposed to browsers, except the admin API through the admin origin.                                                                                                       | Smaller attack surface and no CORS. The backend can be private to the Docker network.                                                    |
| AD7  | **The admin UI is same-origin with its API.** Caddy serves `admin.truejobs.tech` and proxies `/api/*` to the backend. Locally, the Vite dev server proxies `/api`. Session = httpOnly JWT cookie with `SameSite=Strict`, and mutations require `application/json`. | Simple, CSRF-resistant auth with no CORS.                                                                                                |
| AD8  | **OpenAPI is the contract.** The backend generates `tjbackend/openapi.json` from Zod route schemas. tjnext and tjadminui generate TypeScript types from it (`openapi-typescript`). tjcrawler mirrors the ingest contract with Pydantic models.                     | Typed end to end, so agents can implement apps independently.                                                                            |
| AD9  | **Polyrepo-style folders in one git repo.** `tjnext/`, `tjbackend/`, `tjadminui/`, `tjcrawler/` each have their own package manager, scripts, Dockerfile and CI workflow (path-filtered). There is no root JS workspace.                                           | Independent toolchains (Node and Python). Matches the existing `tjnext/`.                                                                |
| AD10 | **Deploy with Docker Compose and Caddy on a single host.** Provider-agnostic.                                                                                                                                                                                      | Cheapest viable setup for a micro SaaS. Can move to managed services later.                                                              |

## 3. Repository layout

```text
/                      README.md, AGENTS.md, CLAUDE.md, docker-compose.yml (local infra), .github/workflows/
/docs/                 architecture.md (this file), ingest-api.md, runbooks/
/tjbackend/            Fastify + Prisma API (Node 24, TypeScript, pnpm)
/tjadminui/            React + Vite admin SPA (Node 24, TypeScript, pnpm)
/tjnext/               Next.js public board (exists; Node 24, TypeScript, pnpm)
/tjcrawler/            Scrapy crawler (Python 3.12, uv)
/deploy/               compose.prod.yml, Caddyfile, backup scripts
```

## 4. Tech stack and conventions

- **Node apps**: Node 24 LTS, pnpm, TypeScript `strict`, ESM, ESLint, Vitest. Each app has the
  scripts `dev`, `build`, `lint`, `test` and `typecheck` where applicable.
- **tjbackend**: Fastify 5, `fastify-type-provider-zod` (Zod 4), `@fastify/swagger`, Prisma
  (latest stable) with PostgreSQL 16, pino logs (JSON in production), `@fastify/cookie`,
  `@fastify/jwt`, `@fastify/rate-limit`, argon2. Port **4000**.
- **tjadminui**: Vite, React 19, React Router 7 (library mode), TanStack Query 5, Tailwind CSS 4,
  react-hook-form and Zod, openapi-fetch. Dev port **5173**.
- **tjnext**: Next.js 16 App Router, React 19, Tailwind 4 (existing). Port **3000**.
- **tjcrawler**: Python 3.12, uv, Scrapy 2.x, Pydantic 2, httpx and tenacity (backend client),
  pytest, ruff.
- **Database naming**: Prisma models in PascalCase and fields in camelCase, mapped to snake_case
  tables and columns with `@@map` and `@map`. IDs are UUIDs (`@db.Uuid`). Timestamps use
  `timestamptz`.
- **API conventions** (all backend routes):
  - Versioned prefix `/v1`, with three surfaces: `/v1/public`, `/v1/admin`, `/v1/ingest`.
  - Error shape: `{ "error": { "code": "SNAKE_CASE_CODE", "message": "human text", "details"?: any } }`.
    Validation errors return 400 with `code: "VALIDATION_ERROR"`.
  - Offset pagination: `?page=1&pageSize=20` (max 100, or 50 for public) →
    `{ items, page, pageSize, total }`.
  - Enum values are UPPER_SNAKE in JSON. Dates are ISO-8601 UTC strings.
- **Environment**: every app ships a `.env.example`. Secrets are never committed. Config is parsed
  and validated at startup (Zod in Node, pydantic-settings in Python).
- **Testing**: backend tests run against a real Postgres (docker compose service, database
  `truejobs_test`). Spiders are tested offline against recorded fixtures. UI tests use Testing
  Library with MSW.

## 5. Data model (tjbackend/prisma/schema.prisma)

Enums:

- `CompanyStatus`: `ACTIVE | PAUSED | ARCHIVED`
  - PAUSED: crawling stops, but existing jobs stay public.
  - ARCHIVED: crawling stops and the jobs are hidden from public.
- `AtsType`: `GREENHOUSE | LEVER | ASHBY | WORKDAY | SMARTRECRUITERS | JSONLD`
- `CrawlRunStatus`: `RUNNING | SUCCEEDED | FAILED | TIMED_OUT`
- `JobStatus`: `ACTIVE | CLOSED`
- `WorkplaceType`: `REMOTE | HYBRID | ONSITE | UNKNOWN`
- `EmploymentType`: `FULL_TIME | PART_TIME | CONTRACT | INTERNSHIP | TEMPORARY | UNKNOWN`
- `Seniority`: `INTERN | JUNIOR | MID | SENIOR | STAFF | PRINCIPAL | MANAGER | DIRECTOR | UNKNOWN`
- `JobCategory`: `BACKEND | FRONTEND | FULLSTACK | MOBILE | DATA_ENGINEERING | ML_AI | DEVOPS_SRE | SECURITY | QA | EMBEDDED | ENGINEERING_MANAGEMENT | OTHER_ENGINEERING | NON_ENGINEERING`
- `Region`: `GLOBAL | US | EUROPE | INDIA | OTHER`. GLOBAL means remote with no country restriction.
- `SalaryPeriod`: `YEAR | MONTH | HOUR | UNKNOWN`
- `JobEventType`: `FIRST_SEEN | TITLE_CHANGED | DESCRIPTION_CHANGED | LOCATION_CHANGED | SALARY_CHANGED | CLOSED | REOPENED | REPOSTED`

Models (abbreviated; the work items give the full field lists):

- **AdminUser**: `id, email (unique, lowercase), name, passwordHash (argon2id), isActive, lastLoginAt, createdAt, updatedAt`.
- **Company**: `id, name, slug (unique, immutable after create), websiteUrl, logoUrl?, description?, hqLocation?, status, notes?, createdAt, updatedAt`.
- **CareerSource**: one company has many sources (usually one).
  - Fields: `id, companyId, atsType, identifier, config (Json), careersPageUrl?, isEnabled, crawlIntervalMinutes (default 360), nextCrawlAt, lastCrawlAt?, lastSuccessAt?, lastRunStatus?, lastError?, consecutiveFailures, createdAt, updatedAt`.
  - Unique on `(atsType, identifier)`.
- **CrawlRun**: `id, careerSourceId, status, workerId, crawlerVersion?, startedAt, leaseExpiresAt, finishedAt?, isCompleteSnapshot?, jobsReceived, jobsCreated, jobsUpdated, jobsReopened, jobsClosed, warning?, errorMessage?, stats (Json)?`.
- **Job**:
  - Identity: `id, slug (unique, public URL key), companyId, careerSourceId, externalId`.
  - Moderation and status: `status, isHidden, hiddenReason?, duplicateOfJobId?, repostOfJobId?`.
  - Content: `title, normalizedTitle, descriptionHtml (sanitized), descriptionText, applyUrl, sourceUrl?, department?`.
  - Location: `locationRaw, locations (Json), countryCodes[], regions Region[], workplaceType`.
  - Classification: `employmentType, seniority, category, techTags[] (canonical slugs)`.
  - Salary: `salaryMin?, salaryMax?, salaryCurrency?, salaryPeriod?, salaryRaw?`.
  - Lifecycle: `postedAt?, firstSeenAt, lastSeenAt (= last verified), closedAt?, lastSeenRunId?, consecutiveMisses`.
  - Bookkeeping: `contentHash, versionCount, normalizerVersion, rawPayload (Json), searchVector (tsvector, raw SQL), createdAt, updatedAt`.
  - Unique on `(careerSourceId, externalId)`.
- **JobVersion**: a snapshot each time `contentHash` changes. Fields: `jobId, versionNumber, contentHash, title, descriptionHtml, locationRaw, salary*, capturedAt, crawlRunId?`.
- **JobEvent**: the timeline. Fields: `jobId, type, occurredAt, crawlRunId?, data (Json: e.g. {from,to})`.

**Public visibility rule**, implemented once as a shared Prisma `where` builder. A job is public
only when all of these hold:

- `isHidden = false`
- `duplicateOfJobId IS NULL`
- `category != NON_ENGINEERING`
- the company's status is not ARCHIVED

## 6. Crawl and ingest flow (contract in docs/ingest-api.md)

1. The crawler worker calls `POST /v1/ingest/crawl-runs/claim {workerId, maxRuns}`. The backend
   leases due sources (`FOR UPDATE SKIP LOCKED`) and creates RUNNING runs with a 30-minute lease.
   It also sets `nextCrawlAt = now + interval` and returns the source config.
2. The worker runs the matching spider in a subprocess. The pipeline posts batches of at most 200
   jobs to `POST /v1/ingest/crawl-runs/:id/jobs`, and sends heartbeats to extend the lease.
3. The backend normalizes and upserts each job:
   - A new job gets `FIRST_SEEN`, or `REPOSTED` when it matches a recently closed job.
   - A job that was seen again gets `lastSeenAt` updated and its miss count reset.
   - A content change creates a `JobVersion` and the matching `*_CHANGED` events.
   - A closed job that reappears gets `REOPENED`.
4. The worker calls `POST /v1/ingest/crawl-runs/:id/complete {status, isCompleteSnapshot}`.
   - On success with a complete snapshot, the backend counts misses and closes jobs that reach
     the threshold, emitting `CLOSED`.
   - An empty-snapshot safeguard skips closures when 0 jobs arrive but the source had at least
     3 active jobs.
   - On failure, the backend applies exponential backoff, capped at 24h.
5. Expired leases are reaped as `TIMED_OUT` on the next claim.

## 7. Security

- **Admin access**: email and password. Users are created by CLI (`pnpm admin:create`) and there
  is no self-signup. Passwords use argon2id. Sessions are a 7-day httpOnly cookie, `Secure` in
  production, `SameSite=Strict`. Login is rate limited.
- **Crawler access**: a static bearer token from `CRAWLER_API_TOKENS`, which is comma separated so
  tokens can be rotated. Tokens are compared in constant time.
- **Public API**: read-only, rate limited per IP, and only reachable from tjnext over the internal
  network in production.
- **Content safety**: job description HTML is sanitized by the backend on ingest with an
  allowlist. Links get `rel="nofollow noopener noreferrer"`. tjnext renders only that sanitized
  HTML.
- **No SSRF**: the backend never fetches admin-supplied URLs. ATS detection works by parsing the
  URL only.
- **Crawler politeness**: a descriptive User-Agent (`truejobsbot/1.0 (+https://truejobs.tech/bot)`),
  AutoThrottle, at most 2 concurrent requests per domain, and `ROBOTSTXT_OBEY=True`.

## 8. Environments and ports

| Service   | Local                                         | Production                                         |
| --------- | --------------------------------------------- | -------------------------------------------------- |
| Postgres  | `localhost:5432` (docker compose)             | Compose volume, nightly `pg_dump`                  |
| tjbackend | `http://localhost:4000`                       | Internal only `http://tjbackend:4000`              |
| tjnext    | `http://localhost:3000`                       | `https://truejobs.tech`                            |
| tjadminui | `http://localhost:5173` (proxy `/api` → 4000) | `https://admin.truejobs.tech` (+ `/api` → backend) |
| tjcrawler | `uv run python -m tjcrawler.worker`           | Compose service, `CRAWLER_CONCURRENCY=4`           |

## 9. Modules and delivery order

| Module                              | App       | Depends on                   |
| ----------------------------------- | --------- | ---------------------------- |
| M1 Platform Foundation              | repo      | –                            |
| M2 Backend Core & Data Model        | tjbackend | M1                           |
| M3 Normalization & Classification   | tjbackend | M2                           |
| M4 Ingestion & Job Lifecycle Engine | tjbackend | M2, M3                       |
| M5 Admin API                        | tjbackend | M2 (crawl-run views need M4) |
| M6 Public Job API                   | tjbackend | M2, M3, M4                   |
| M7 Crawler Framework                | tjcrawler | M1, M4 (contract)            |
| M8 ATS Spiders                      | tjcrawler | M7                           |
| M9 Admin UI                         | tjadminui | M5                           |
| M10 Job Board                       | tjnext    | M6                           |
| M11 Deployment & Operations         | deploy    | all apps scaffolded          |

Critical path to the first real job on the board: M1 → M2 → M3 → M4 → M7 → M8 (Greenhouse) → M6 → M10.
Dependencies between individual work items are modeled as Plane "blocked by" relations;
`implement-ticket` skips blocked items.

Phase 1 is "done" when the team can add a company in tjadminui, the crawler ingests its jobs, and
those jobs appear on truejobs.tech with first-seen, last-verified and closed signals, all running
in production.
