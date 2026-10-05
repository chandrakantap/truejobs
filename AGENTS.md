# AGENTS.md

## Product

truejobs.tech is a job intelligence board for software engineers. Jobs come only from company
career sites and public ATS boards (Greenhouse, Lever, Ashby, Workday, SmartRecruiters), curated by
the truejobs team. Each job keeps its history (first seen, last verified, closed, reposted, content
changes) so users can judge freshness and reliability before applying.

## Read first

- [docs/architecture.md](docs/architecture.md): Phase 1 architecture and decisions.
- [docs/ingest-api.md](docs/ingest-api.md): crawler-to-backend ingest API contract.

## Apps

One folder per app in this single git repo.

| Folder | Stack | Status | Dev | Lint | Test | Build | Port |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tjnext` | Next.js 16, React 19, Tailwind 4, pnpm | exists | `pnpm dev` | `pnpm lint` | none yet | `pnpm build` | 3000 |
| `tjbackend` | Fastify 5 + TypeScript | planned | planned | planned | planned | planned | 4000 |
| `tjadminui` | Vite + React 19 + TypeScript | planned | planned | planned | planned | planned | 5173 |
| `tjcrawler` | Python 3.12 + uv + Scrapy | planned | planned | planned | planned | planned | n/a |

Run commands from inside the app folder, e.g. `cd tjnext && pnpm lint && pnpm build`.
Node version: see `.nvmrc` (24).

## Conventions

- One ticket per branch, named `<ticket-id>-<slug>` (e.g. `tj-12-job-search-filters`).
- The PR title references the ticket identifier.
- Never commit to `main`; always go through a pull request.
- Never commit `.env` files or secrets; commit only `.env.example`.
- The backend owns the DB schema; other apps never connect to Postgres.
- Keep `tjbackend/openapi.json` and `docs/ingest-api.md` in sync.
- Follow `.editorconfig` (UTF-8, LF, 2 spaces; 4 for Python).
