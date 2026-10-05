-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "workplace_type" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "employment_type" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "seniority" AS ENUM ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'STAFF', 'PRINCIPAL', 'MANAGER', 'DIRECTOR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "job_category" AS ENUM ('BACKEND', 'FRONTEND', 'FULLSTACK', 'MOBILE', 'DATA_ENGINEERING', 'ML_AI', 'DEVOPS_SRE', 'SECURITY', 'QA', 'EMBEDDED', 'ENGINEERING_MANAGEMENT', 'OTHER_ENGINEERING', 'NON_ENGINEERING');

-- CreateEnum
CREATE TYPE "region" AS ENUM ('GLOBAL', 'US', 'EUROPE', 'INDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "salary_period" AS ENUM ('YEAR', 'MONTH', 'HOUR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "job_event_type" AS ENUM ('FIRST_SEEN', 'TITLE_CHANGED', 'DESCRIPTION_CHANGED', 'LOCATION_CHANGED', 'SALARY_CHANGED', 'CLOSED', 'REOPENED', 'REPOSTED');

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "career_source_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "status" "job_status" NOT NULL DEFAULT 'ACTIVE',
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "hidden_reason" TEXT,
    "duplicate_of_job_id" UUID,
    "repost_of_job_id" UUID,
    "title" TEXT NOT NULL,
    "normalized_title" TEXT NOT NULL,
    "description_html" TEXT NOT NULL,
    "description_text" TEXT NOT NULL,
    "apply_url" TEXT NOT NULL,
    "source_url" TEXT,
    "department" TEXT,
    "location_raw" TEXT NOT NULL,
    "locations" JSONB NOT NULL DEFAULT '[]',
    "country_codes" TEXT[],
    "regions" "region"[],
    "workplace_type" "workplace_type" NOT NULL DEFAULT 'UNKNOWN',
    "employment_type" "employment_type" NOT NULL DEFAULT 'UNKNOWN',
    "seniority" "seniority" NOT NULL DEFAULT 'UNKNOWN',
    "category" "job_category" NOT NULL,
    "tech_tags" TEXT[],
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" CHAR(3),
    "salary_period" "salary_period",
    "salary_raw" TEXT,
    "posted_at" TIMESTAMPTZ(3),
    "first_seen_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL,
    "closed_at" TIMESTAMPTZ(3),
    "last_seen_run_id" UUID,
    "consecutive_misses" INTEGER NOT NULL DEFAULT 0,
    "content_hash" TEXT NOT NULL,
    "version_count" INTEGER NOT NULL DEFAULT 1,
    "normalizer_version" INTEGER NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "search_vector" tsvector,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_versions" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description_html" TEXT NOT NULL,
    "location_raw" TEXT NOT NULL,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" TEXT,
    "salary_period" "salary_period",
    "salary_raw" TEXT,
    "captured_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "crawl_run_id" UUID,

    CONSTRAINT "job_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_events" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "type" "job_event_type" NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "crawl_run_id" UUID,
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "job_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_slug_key" ON "jobs"("slug");

-- CreateIndex
CREATE INDEX "jobs_status_first_seen_at_idx" ON "jobs"("status", "first_seen_at" DESC);

-- CreateIndex
CREATE INDEX "jobs_company_id_status_idx" ON "jobs"("company_id", "status");

-- CreateIndex
CREATE INDEX "jobs_career_source_id_status_idx" ON "jobs"("career_source_id", "status");

-- CreateIndex
CREATE INDEX "jobs_category_idx" ON "jobs"("category");

-- CreateIndex
CREATE INDEX "jobs_seniority_idx" ON "jobs"("seniority");

-- CreateIndex
CREATE INDEX "jobs_duplicate_of_job_id_idx" ON "jobs"("duplicate_of_job_id");

-- CreateIndex
CREATE INDEX "jobs_repost_of_job_id_idx" ON "jobs"("repost_of_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_career_source_id_external_id_key" ON "jobs"("career_source_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_versions_job_id_version_number_key" ON "job_versions"("job_id", "version_number");

-- CreateIndex
CREATE INDEX "job_events_job_id_occurred_at_idx" ON "job_events"("job_id", "occurred_at");

-- CreateIndex
CREATE INDEX "job_events_type_occurred_at_idx" ON "job_events"("type", "occurred_at");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_career_source_id_fkey" FOREIGN KEY ("career_source_id") REFERENCES "career_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_duplicate_of_job_id_fkey" FOREIGN KEY ("duplicate_of_job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_repost_of_job_id_fkey" FOREIGN KEY ("repost_of_job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_versions" ADD CONSTRAINT "job_versions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_versions" ADD CONSTRAINT "job_versions_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- GIN indexes (not expressible in the Prisma schema)
CREATE INDEX "jobs_tech_tags_gin" ON "jobs" USING gin ("tech_tags");
CREATE INDEX "jobs_regions_gin" ON "jobs" USING gin ("regions");
CREATE INDEX "jobs_search_vector_gin" ON "jobs" USING gin ("search_vector");
CREATE INDEX "jobs_title_trgm" ON "jobs" USING gin ("title" gin_trgm_ops);

-- Keep search_vector in sync. A trigger is used because array_to_string is not immutable,
-- so a generated column is not possible.
CREATE FUNCTION jobs_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tech_tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', left(coalesce(NEW.description_text, ''), 20000)), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, tech_tags, description_text ON "jobs"
  FOR EACH ROW EXECUTE FUNCTION jobs_search_vector_update();
