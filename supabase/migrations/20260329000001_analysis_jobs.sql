-- Analysis job log.
--
-- Records every AI analysis call: paradigm, model, token usage, cost, latency,
-- and final status. Used for:
--   1. Per-tenant rate limiting (count jobs in sliding window)
--   2. Token usage tracking per tenant (billing tier enforcement)
--   3. Cost observability and model performance monitoring

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id           TEXT NOT NULL,
  analysis_type    TEXT,
  paradigm         TEXT,
  model_id         TEXT,
  model_profile    TEXT,
  input_tokens     INTEGER NOT NULL DEFAULT 0,
  output_tokens    INTEGER NOT NULL DEFAULT 0,
  total_tokens     INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'success'
                     CHECK (status IN ('success', 'partial', 'failed')),
  error_code       TEXT,
  latency_ms       INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rate-limit queries: jobs per tenant per time window
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_tenant_time
  ON analysis_jobs(tenant_id, created_at DESC);

-- Cost aggregation per tenant
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_tenant_cost
  ON analysis_jobs(tenant_id);

ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_analysis_jobs_select" ON analysis_jobs
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()::text
    )
  );

-- Inserts are performed server-side only (service role), no user-facing insert policy.
