# Ingest API contract (tjcrawler → tjbackend)

Version: `v1`. Implemented by **tjbackend** (`/v1/ingest/*`) and consumed by **tjcrawler**.
The generated `tjbackend/openapi.json` must match this document. If you change one, change the
other in the same PR.

## Authentication

Every request sends `Authorization: Bearer <token>`. The token must be one of the
comma-separated values in the backend's `CRAWLER_API_TOKENS` env var, compared in constant time.
A missing or invalid token returns `401 {"error":{"code":"UNAUTHORIZED",...}}`.

## Endpoints

### POST /v1/ingest/crawl-runs/claim

Leases due career sources for crawling.

Request:

```json
{ "workerId": "crawler-1", "maxRuns": 4, "atsTypes": ["GREENHOUSE", "LEVER"] }
```

- `workerId`: string, 1–100 chars, required.
- `maxRuns`: integer, 1–20, default 1.
- `atsTypes`: optional filter.

Response `200`:

```json
{
  "runs": [
    {
      "runId": "uuid",
      "leaseExpiresAt": "2026-10-05T10:30:00.000Z",
      "source": {
        "id": "uuid",
        "atsType": "GREENHOUSE",
        "identifier": "stripe",
        "config": {},
        "careersPageUrl": "https://stripe.com/jobs",
        "company": { "id": "uuid", "name": "Stripe", "slug": "stripe", "websiteUrl": "https://stripe.com" }
      }
    }
  ]
}
```

`runs` is empty when nothing is due. A source is due when all of these hold:

- `isEnabled = true`
- the company status is `ACTIVE`
- `nextCrawlAt <= now()`
- it has no `RUNNING` run with an unexpired lease

When a source is claimed, the backend:

- creates a `CrawlRun(status=RUNNING, leaseExpiresAt=now+CRAWL_LEASE_MINUTES)`
- sets `source.lastCrawlAt=now`
- sets `source.nextCrawlAt = now + crawlIntervalMinutes`

Before claiming, the backend marks every RUNNING run whose lease has expired as `TIMED_OUT`. The
source then counts a failure, exactly as with `complete(FAILED)`.

### POST /v1/ingest/crawl-runs/:runId/heartbeat

Extends the lease. Body: `{}`. Response `200 {"leaseExpiresAt": "..."}`.
Returns `404` if the run is unknown and `409 RUN_NOT_RUNNING` if the run is not RUNNING.

### POST /v1/ingest/crawl-runs/:runId/jobs

Sends a batch of jobs seen in this run. It may be called many times per run.

Request: `{ "jobs": JobPayload[] }` with 1–200 items. The body is at most 5 MB.

Response `200`:

```json
{ "received": 120, "created": 3, "updated": 2, "reopened": 0, "unchanged": 115,
  "rejected": [ { "index": 7, "externalId": "123", "reason": "applyUrl: Invalid url" } ] }
```

- Items that fail validation are **rejected individually** and do not fail the batch.
- The endpoint is idempotent: re-sending a batch is safe.
- If the same `externalId` appears twice in one batch, the last occurrence wins.
- Returns `409 RUN_NOT_RUNNING` if the run is not RUNNING.

### POST /v1/ingest/crawl-runs/:runId/complete

Finishes the run.

Request:

```json
{ "status": "SUCCEEDED", "isCompleteSnapshot": true, "errorMessage": null,
  "crawlerVersion": "0.1.0", "stats": { "pages": 3, "durationMs": 5321 } }
```

- `status`: `SUCCEEDED` or `FAILED`.
- `isCompleteSnapshot`: must be `true` only if the spider saw **every** job currently listed on
  the source. Pagination must have finished and no list page may have failed.
- `errorMessage`: at most 4000 chars.
- `stats`: a free-form object, at most 16 KB.

Response `200`: the run summary, with `status`, all counters, `warning` and `finishedAt`.
Returns `409 RUN_NOT_RUNNING` if the run is already finished.

**When the request has `SUCCEEDED` and `isCompleteSnapshot=true`:**

- **Empty-snapshot safeguard**: if the run received 0 jobs and the source has at least 3 ACTIVE
  jobs, the backend closes nothing and sets `warning="EMPTY_SNAPSHOT_SKIPPED_CLOSURE"`.
- Otherwise, every ACTIVE job of the source with `lastSeenRunId != runId` gets
  `consecutiveMisses += 1`. When that reaches `JOB_CLOSE_MISS_THRESHOLD` (default 2), the job
  gets `status=CLOSED`, `closedAt=now` and a `CLOSED` event.

**When the request has `SUCCEEDED` and `isCompleteSnapshot=false`:** no jobs are closed.

**On any `SUCCEEDED`:** the source gets `consecutiveFailures=0`, `lastSuccessAt=now` and
`lastRunStatus=SUCCEEDED`.

**On `FAILED`:**

- The source gets `consecutiveFailures += 1`, `lastRunStatus=FAILED` and
  `lastError=errorMessage`.
- `nextCrawlAt = now + min(crawlIntervalMinutes * 2^min(consecutiveFailures,5), 1440) minutes`.
- No jobs are closed.

## JobPayload

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| `externalId` | string 1–255 | yes | Stable ATS job id, unique within the source. |
| `title` | string 1–300 | yes | |
| `applyUrl` | http(s) URL | yes | Direct application URL on the ATS or company site. |
| `sourceUrl` | http(s) URL | no | Public job page URL, if different from `applyUrl`. |
| `descriptionHtml` | string ≤ 200 KB | yes (may be `""`) | Raw HTML. The backend sanitizes it. HTML-entity-escaped HTML is accepted and unescaped. |
| `locations` | string[] ≤ 50 | yes (may be `[]`) | Raw location strings as shown on the ATS. |
| `workplaceTypeHint` | `REMOTE \| HYBRID \| ONSITE` | no | Only when the ATS states it explicitly. |
| `employmentTypeHint` | string ≤ 100 | no | Raw ATS value, e.g. "Full-time", "FULL_TIME", "Contract". |
| `department` | string ≤ 200 | no | Raw department or team. |
| `postedAt` | ISO-8601 datetime | no | The date the ATS says the job was published. Omit if unknown or only relative ("30+ days ago"). |
| `salary` | object | no | `{ min?: number, max?: number, currency?: ISO-4217, period?: YEAR\|MONTH\|HOUR, raw?: string ≤ 300 }` |
| `raw` | object ≤ 256 KB | yes | The original ATS record, stored for re-normalization. |

The crawler (Pydantic) uses snake_case attributes and serializes to camelCase
(`model_dump(by_alias=True, exclude_none=True, mode="json")`).

## Errors

All errors use the shape `{ "error": { "code", "message", "details"? } }`. The crawler client
handles them as follows:

- `5xx` and network errors: retry with exponential backoff, up to 5 attempts.
- `409`: stop the run. The lease is lost.
- `400` on a whole request: a bug. Log it and fail the run.
- `401`: abort the worker.
