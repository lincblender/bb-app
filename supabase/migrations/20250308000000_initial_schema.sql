-- BidBlender initial schema (PostgreSQL / Supabase)
-- Mirrors docs/SCHEMA.md and lib/db/migrations/001_initial_schema.sql
-- Uses TEXT for IDs (matches SQLite, allows seed IDs like "bidder-1")
-- Uses gen_random_uuid() for default IDs (native in PostgreSQL 13+, no extension needed)

-- Tenants (multi-tenancy support)
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organisations (bidder + buyer)
CREATE TABLE organisations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bidder', 'buyer')),
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT REFERENCES organisations(id) ON DELETE SET NULL,
  subsidiaries JSONB DEFAULT '[]',
  acquisition_history JSONB DEFAULT '[]',
  board_complexity TEXT CHECK (board_complexity IN ('low', 'medium', 'high')),
  scale TEXT CHECK (scale IN ('small', 'medium', 'large', 'enterprise')),
  capabilities JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  case_studies JSONB DEFAULT '[]',
  sectors JSONB DEFAULT '[]',
  strategic_preferences JSONB DEFAULT '[]',
  target_markets JSONB DEFAULT '[]',
  partner_gaps JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organisations_tenant ON organisations(tenant_id);
CREATE INDEX idx_organisations_type ON organisations(type);
CREATE INDEX idx_organisations_parent ON organisations(parent_id);

-- People (personnel)
CREATE TABLE people (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_people_tenant ON people(tenant_id);
CREATE INDEX idx_people_organisation ON people(organisation_id);

-- Opportunities
CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  issuing_organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  source_id TEXT,
  due_date DATE,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'pursuing', 'monitoring', 'passed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opportunities_tenant ON opportunities(tenant_id);
CREATE INDEX idx_opportunities_issuer ON opportunities(issuing_organisation_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_due_date ON opportunities(due_date);

-- Opportunity assessments (computed fit scores)
CREATE TABLE opportunity_assessments (
  opportunity_id TEXT PRIMARY KEY REFERENCES opportunities(id) ON DELETE CASCADE,
  technical_fit INTEGER CHECK (technical_fit >= 0 AND technical_fit <= 100),
  network_strength INTEGER CHECK (network_strength >= 0 AND network_strength <= 100),
  organisational_complexity INTEGER CHECK (organisational_complexity >= 0 AND organisational_complexity <= 100),
  recommendation TEXT CHECK (recommendation IN ('sweet-spot', 'technical-edge', 'relationship-edge', 'low-priority')),
  strategy_posture TEXT CHECK (strategy_posture IN ('pursue-directly', 'pursue-with-partner', 'relationship-led-play', 'technically-strong-needs-access', 'network-strong-capability-gap', 'monitor-only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relationship signals (network intelligence)
CREATE TABLE relationship_signals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bidder_person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  buyer_organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  connection_count INTEGER NOT NULL DEFAULT 0,
  seniority_level TEXT CHECK (seniority_level IN ('junior', 'mid', 'senior', 'executive')),
  shared_employers INTEGER NOT NULL DEFAULT 0,
  adjacency_to_decision_makers TEXT CHECK (adjacency_to_decision_makers IN ('none', 'indirect', 'direct')),
  department_concentration JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_relationship_signals_tenant ON relationship_signals(tenant_id);
CREATE INDEX idx_relationship_signals_buyer ON relationship_signals(buyer_organisation_id);

-- Complexity signals
CREATE TABLE complexity_signals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  ownership_layers INTEGER NOT NULL DEFAULT 0,
  subsidiary_count INTEGER NOT NULL DEFAULT 0,
  acquisition_count INTEGER NOT NULL DEFAULT 0,
  board_influence TEXT CHECK (board_influence IN ('low', 'medium', 'high')),
  procurement_complexity TEXT CHECK (procurement_complexity IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complexity_signals_tenant ON complexity_signals(tenant_id);
CREATE INDEX idx_complexity_signals_organisation ON complexity_signals(organisation_id);

-- Connector sources (LinkedIn, AusTender, etc.)
CREATE TABLE connector_sources (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('live', 'mock', 'manual', 'disconnected')),
  source_type TEXT NOT NULL,
  contribution TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_connector_sources_tenant ON connector_sources(tenant_id);

-- Tender boards
CREATE TABLE tender_boards (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tender_boards_tenant ON tender_boards(tenant_id);

-- Intelligence events (activity feed)
CREATE TABLE intelligence_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE SET NULL,
  organisation_id TEXT REFERENCES organisations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_intelligence_events_tenant ON intelligence_events(tenant_id);
CREATE INDEX idx_intelligence_events_timestamp ON intelligence_events(timestamp DESC);

-- User settings
CREATE TABLE user_settings (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  enabled_tender_boards JSONB DEFAULT '[]',
  enabled_network_sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chats (for full persistence)
CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chats_tenant ON chats(tenant_id);

-- Chat messages
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  blocks JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id);
