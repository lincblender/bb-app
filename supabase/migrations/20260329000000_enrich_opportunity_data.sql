-- Enrich opportunities with deeper source data fields.
-- These columns support three gathering levels:
--   feed       → what the RSS/Atom item gives us (title, link, summary, pubDate)
--   opportunity → front matter from the notice page (close date, value, contact, addenda list)
--   detail      → all documents pulled and stored

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS notice_id TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS value_min BIGINT,
  ADD COLUMN IF NOT EXISTS value_max BIGINT,
  ADD COLUMN IF NOT EXISTS procurement_type TEXT,
  ADD COLUMN IF NOT EXISTS feed_id TEXT,
  ADD COLUMN IF NOT EXISTS detail_level TEXT NOT NULL DEFAULT 'feed'
    CHECK (detail_level IN ('feed', 'opportunity', 'detail')),
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS raw_metadata JSONB DEFAULT '{}';

-- Index the feed_id for fast per-feed queries.
CREATE INDEX IF NOT EXISTS idx_opportunities_feed ON opportunities(feed_id);

-- Enrich buyer organisations with government-specific identity fields.
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS abn TEXT,
  ADD COLUMN IF NOT EXISTS agency_type TEXT;

-- ---------------------------------------------------------------------------
-- Opportunity addenda
-- Tracks individual amendments/clarifications published against a notice.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunity_addenda (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id  TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  addendum_number INTEGER,
  title           TEXT,
  description     TEXT,
  source_url      TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addenda_opportunity ON opportunity_addenda(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_addenda_tenant      ON opportunity_addenda(tenant_id);

ALTER TABLE opportunity_addenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_addenda_select" ON opportunity_addenda
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "tenant_addenda_insert" ON opportunity_addenda
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "tenant_addenda_update" ON opportunity_addenda
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "tenant_addenda_delete" ON opportunity_addenda
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- Opportunity documents
-- Tracks document listings discovered on notice pages.
-- content is populated at the "detail" gathering level (document pulled in full).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunity_documents (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id  TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  source_url      TEXT,
  file_type       TEXT,
  storage_path    TEXT,
  content         TEXT,
  size_bytes      INTEGER,
  fetched_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_opportunity ON opportunity_documents(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant      ON opportunity_documents(tenant_id);

ALTER TABLE opportunity_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_documents_select" ON opportunity_documents
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "tenant_documents_insert" ON opportunity_documents
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "tenant_documents_update" ON opportunity_documents
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "tenant_documents_delete" ON opportunity_documents
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()::text
    )
  );
