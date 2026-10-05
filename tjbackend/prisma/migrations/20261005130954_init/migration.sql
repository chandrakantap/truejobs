CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "company_status" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ats_type" AS ENUM ('GREENHOUSE', 'LEVER', 'ASHBY', 'WORKDAY', 'SMARTRECRUITERS', 'JSONLD');

-- CreateEnum
CREATE TYPE "crawl_run_status" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "website_url" TEXT NOT NULL,
    "logo_url" TEXT,
    "description" TEXT,
    "hq_location" TEXT,
    "status" "company_status" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_sources" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "ats_type" "ats_type" NOT NULL,
    "identifier" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "careers_page_url" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "crawl_interval_minutes" INTEGER NOT NULL DEFAULT 360,
    "next_crawl_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_crawl_at" TIMESTAMPTZ(3),
    "last_success_at" TIMESTAMPTZ(3),
    "last_run_status" "crawl_run_status",
    "last_error" TEXT,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "career_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_runs" (
    "id" UUID NOT NULL,
    "career_source_id" UUID NOT NULL,
    "status" "crawl_run_status" NOT NULL,
    "worker_id" TEXT NOT NULL,
    "crawler_version" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "finished_at" TIMESTAMPTZ(3),
    "is_complete_snapshot" BOOLEAN,
    "jobs_received" INTEGER NOT NULL DEFAULT 0,
    "jobs_created" INTEGER NOT NULL DEFAULT 0,
    "jobs_updated" INTEGER NOT NULL DEFAULT 0,
    "jobs_reopened" INTEGER NOT NULL DEFAULT 0,
    "jobs_closed" INTEGER NOT NULL DEFAULT 0,
    "warning" TEXT,
    "error_message" TEXT,
    "stats" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "crawl_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");

-- CreateIndex
CREATE INDEX "career_sources_is_enabled_next_crawl_at_idx" ON "career_sources"("is_enabled", "next_crawl_at");

-- CreateIndex
CREATE INDEX "career_sources_company_id_idx" ON "career_sources"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "career_sources_ats_type_identifier_key" ON "career_sources"("ats_type", "identifier");

-- CreateIndex
CREATE INDEX "crawl_runs_career_source_id_started_at_idx" ON "crawl_runs"("career_source_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "crawl_runs_status_lease_expires_at_idx" ON "crawl_runs"("status", "lease_expires_at");

-- AddForeignKey
ALTER TABLE "career_sources" ADD CONSTRAINT "career_sources_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_career_source_id_fkey" FOREIGN KEY ("career_source_id") REFERENCES "career_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigram index for fuzzy company name search (not expressible in Prisma schema)
CREATE INDEX "company_name_trgm" ON "companies" USING gin ("name" gin_trgm_ops);
