-- Enrich people records with LinkedIn-sourced identity fields.
-- These are populated when a user connects LinkedIn and runs a profile sync.

ALTER TABLE people
  ADD COLUMN IF NOT EXISTS linkedin_url   TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url     TEXT,
  ADD COLUMN IF NOT EXISTS headline       TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_id    TEXT,
  ADD COLUMN IF NOT EXISTS email          TEXT;

-- Unique index on linkedin_id per tenant so we can upsert cleanly.
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_linkedin_id
  ON people(tenant_id, linkedin_id)
  WHERE linkedin_id IS NOT NULL;
