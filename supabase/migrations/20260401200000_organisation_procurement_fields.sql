-- Government procurement classification fields on bidder organisations.
-- Populated by the AI "Build from website" inference flow.

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS unspsc_codes        JSONB    NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS anzsic_code         TEXT,
  ADD COLUMN IF NOT EXISTS government_panels   JSONB    NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS operating_regions   JSONB    NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tender_keywords     JSONB    NOT NULL DEFAULT '[]';

COMMENT ON COLUMN organisations.unspsc_codes IS
  'Array of {code, description} objects — United Nations Standard Products and Services Code.';
COMMENT ON COLUMN organisations.anzsic_code IS
  'Single ANZSIC 2006 code in "XXXX — Description" format, e.g. "6209 — Other Computer Services".';
COMMENT ON COLUMN organisations.government_panels IS
  'Array of {name, jurisdiction, status} objects — known or likely government panel memberships.';
COMMENT ON COLUMN organisations.operating_regions IS
  'Array of jurisdiction strings, e.g. ["ACT", "NSW", "National"].';
COMMENT ON COLUMN organisations.tender_keywords IS
  'Array of precise keyword phrases likely to appear in relevant government tender specifications.';
