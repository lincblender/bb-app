-- BidBlender initial schema (SQLite)
-- Mirrors docs/SCHEMA.md and supabase/migrations/20250308000000_initial_schema.sql

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Organisations (bidder + buyer)
CREATE TABLE IF NOT EXISTS organisations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bidder', 'buyer')),
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT REFERENCES organisations(id) ON DELETE SET NULL,
  subsidiaries TEXT DEFAULT '[]',
  acquisition_history TEXT DEFAULT '[]',
  board_complexity TEXT CHECK (board_complexity IN ('low', 'medium', 'high')),
  scale TEXT CHECK (scale IN ('small', 'medium', 'large', 'enterprise')),
  website_url TEXT,
  linkedin_url TEXT,
  logo_url TEXT,
  location TEXT,
  social_profiles TEXT DEFAULT '[]',
  capabilities TEXT DEFAULT '[]',
  certifications TEXT DEFAULT '[]',
  individual_qualifications TEXT DEFAULT '[]',
  case_studies TEXT DEFAULT '[]',
  sectors TEXT DEFAULT '[]',
  strategic_preferences TEXT DEFAULT '[]',
  target_markets TEXT DEFAULT '[]',
  partner_gaps TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_organisations_tenant ON organisations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organisations_type ON organisations(type);
CREATE INDEX IF NOT EXISTS idx_organisations_parent ON organisations(parent_id);

-- People
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_people_tenant ON people(tenant_id);
CREATE INDEX IF NOT EXISTS idx_people_organisation ON people(organisation_id);

-- Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  issuing_organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  source_id TEXT,
  due_date TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'pursuing', 'monitoring', 'passed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_opportunities_tenant ON opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_issuer ON opportunities(issuing_organisation_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_due_date ON opportunities(due_date);

-- Opportunity assessments
CREATE TABLE IF NOT EXISTS opportunity_assessments (
  opportunity_id TEXT PRIMARY KEY REFERENCES opportunities(id) ON DELETE CASCADE,
  technical_fit INTEGER CHECK (technical_fit >= 0 AND technical_fit <= 100),
  network_strength INTEGER CHECK (network_strength >= 0 AND network_strength <= 100),
  organisational_complexity INTEGER CHECK (organisational_complexity >= 0 AND organisational_complexity <= 100),
  recommendation TEXT CHECK (recommendation IN ('sweet-spot', 'technical-edge', 'relationship-edge', 'low-priority')),
  strategy_posture TEXT CHECK (strategy_posture IN ('pursue-directly', 'pursue-with-partner', 'relationship-led-play', 'technically-strong-needs-access', 'network-strong-capability-gap', 'monitor-only')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Relationship signals
CREATE TABLE IF NOT EXISTS relationship_signals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bidder_person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  buyer_organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  connection_count INTEGER NOT NULL DEFAULT 0,
  seniority_level TEXT CHECK (seniority_level IN ('junior', 'mid', 'senior', 'executive')),
  shared_employers INTEGER NOT NULL DEFAULT 0,
  adjacency_to_decision_makers TEXT CHECK (adjacency_to_decision_makers IN ('none', 'indirect', 'direct')),
  department_concentration TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_relationship_signals_tenant ON relationship_signals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_relationship_signals_buyer ON relationship_signals(buyer_organisation_id);

-- Complexity signals
CREATE TABLE IF NOT EXISTS complexity_signals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  ownership_layers INTEGER NOT NULL DEFAULT 0,
  subsidiary_count INTEGER NOT NULL DEFAULT 0,
  acquisition_count INTEGER NOT NULL DEFAULT 0,
  board_influence TEXT CHECK (board_influence IN ('low', 'medium', 'high')),
  procurement_complexity TEXT CHECK (procurement_complexity IN ('low', 'medium', 'high')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_complexity_signals_tenant ON complexity_signals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_complexity_signals_organisation ON complexity_signals(organisation_id);

-- Connector sources
CREATE TABLE IF NOT EXISTS connector_sources (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('live', 'mock', 'manual', 'disconnected')),
  source_type TEXT NOT NULL,
  contribution TEXT,
  config TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_connector_sources_tenant ON connector_sources(tenant_id);

-- Tender boards
CREATE TABLE IF NOT EXISTS tender_boards (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  region TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tender_boards_tenant ON tender_boards(tenant_id);

-- Intelligence events
CREATE TABLE IF NOT EXISTS intelligence_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  description TEXT,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE SET NULL,
  organisation_id TEXT REFERENCES organisations(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_intelligence_events_tenant ON intelligence_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_events_timestamp ON intelligence_events(timestamp DESC);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  enabled_tender_boards TEXT DEFAULT '[]',
  enabled_network_sources TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Chats
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chats_tenant ON chats(tenant_id);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  blocks TEXT DEFAULT '[]',
  attachments TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);
