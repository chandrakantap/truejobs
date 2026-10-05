-- Runs once, on an empty data volume (docker compose down -v to re-run).
-- Local dev only: creates the integration-test database and enables pg_trgm in both.
CREATE DATABASE truejobs_test;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

\connect truejobs_test
CREATE EXTENSION IF NOT EXISTS pg_trgm;
