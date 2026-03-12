# BidBlender Database Schema

Canonical schema for PostgreSQL (Supabase) and SQLite. Both databases use identical table and column names; type mappings are documented below.

## Type mappings (Postgres → SQLite)

| Postgres   | SQLite   | Notes                          |
|-----------|----------|--------------------------------|
| UUID      | TEXT     | Store as hex string            |
| JSONB     | TEXT     | JSON string, use json1 ext     |
| TIMESTAMPTZ | TEXT   | ISO 8601                       |
| VARCHAR   | TEXT     |                                |
| INTEGER   | INTEGER  |                                |
| BOOLEAN   | INTEGER  | 0/1                            |

## Tables

### `tenants`
Single-tenant for now; supports future multi-tenancy.

| Column     | Type         | Notes                    |
|------------|--------------|--------------------------|
| id         | UUID / TEXT  | PK                       |
| name       | TEXT         |                          |
| created_at | TIMESTAMPTZ  |                          |
| updated_at | TIMESTAMPTZ  |                          |

### `organisations`
Bidder and buyer organisations. Nested data in JSON columns for cross-DB compatibility.

| Column              | Type         | Notes                                      |
|---------------------|--------------|--------------------------------------------|
| id                  | UUID / TEXT  | PK                                         |
| tenant_id           | UUID / TEXT  | FK → tenants                               |
| type                | TEXT         | 'bidder' \| 'buyer'                        |
| name                | TEXT         |                                            |
| description         | TEXT         |                                            |
| parent_id           | UUID / TEXT  | nullable, for buyer hierarchy               |
| subsidiaries        | TEXT         | JSON array of strings                      |
| acquisition_history | TEXT         | JSON array of strings                      |
| board_complexity    | TEXT         | 'low' \| 'medium' \| 'high'               |
| scale               | TEXT         | 'small' \| 'medium' \| 'large' \| 'enterprise' |
| capabilities        | TEXT         | JSON array of {id, name, category}         |
| certifications      | TEXT         | JSON array of {id, name, issuer}           |
| case_studies        | TEXT         | JSON array of {id, title, client, outcome} |
| sectors             | TEXT         | JSON array of strings                       |
| strategic_preferences | TEXT       | JSON array of strings                       |
| target_markets      | TEXT         | JSON array of strings                       |
| partner_gaps        | TEXT         | JSON array of strings                       |
| created_at          | TIMESTAMPTZ  |                                            |
| updated_at          | TIMESTAMPTZ  |                                            |

### `people`
Personnel (bidder staff).

| Column         | Type         | Notes        |
|----------------|--------------|--------------|
| id             | UUID / TEXT  | PK           |
| tenant_id      | UUID / TEXT  | FK           |
| organisation_id| UUID / TEXT  | FK → organisations |
| name           | TEXT         |              |
| title          | TEXT         |              |
| created_at     | TIMESTAMPTZ  |              |
| updated_at     | TIMESTAMPTZ  |              |

### `opportunities`

| Column                 | Type         | Notes        |
|------------------------|--------------|--------------|
| id                     | UUID / TEXT  | PK           |
| tenant_id              | UUID / TEXT  | FK           |
| issuing_organisation_id | UUID / TEXT  | FK → organisations |
| title                  | TEXT         |              |
| category               | TEXT         |              |
| source_id              | TEXT         | nullable     |
| due_date               | DATE / TEXT  |              |
| summary                | TEXT         |              |
| status                 | TEXT         | new, reviewing, pursuing, monitoring, passed |
| created_at             | TIMESTAMPTZ  |              |
| updated_at             | TIMESTAMPTZ  |              |

### `opportunity_assessments`
Computed fit scores per opportunity.

| Column                   | Type         | Notes        |
|--------------------------|--------------|--------------|
| opportunity_id           | UUID / TEXT  | PK, FK       |
| technical_fit            | INTEGER      | 0–100        |
| network_strength         | INTEGER      | 0–100        |
| organisational_complexity | INTEGER    | 0–100        |
| recommendation           | TEXT         | sweet-spot, technical-edge, etc. |
| strategy_posture          | TEXT         | pursue-directly, etc. |
| created_at               | TIMESTAMPTZ  |              |
| updated_at               | TIMESTAMPTZ  |              |

### `relationship_signals`
Network/relationship data (e.g. from LinkedIn).

| Column                     | Type         | Notes        |
|----------------------------|--------------|--------------|
| id                         | UUID / TEXT  | PK           |
| tenant_id                  | UUID / TEXT  | FK           |
| bidder_person_id           | UUID / TEXT  | FK → people  |
| buyer_organisation_id      | UUID / TEXT  | FK → organisations |
| connection_count           | INTEGER      |              |
| seniority_level            | TEXT         | junior, mid, senior, executive |
| shared_employers           | INTEGER      |              |
| adjacency_to_decision_makers | TEXT       | none, indirect, direct |
| department_concentration   | TEXT         | JSON array   |
| created_at                 | TIMESTAMPTZ  |              |
| updated_at                 | TIMESTAMPTZ  |              |

### `complexity_signals`
Organisational complexity (buyers).

| Column                 | Type         | Notes        |
|------------------------|--------------|--------------|
| id                     | UUID / TEXT  | PK           |
| tenant_id              | UUID / TEXT  | FK           |
| organisation_id        | UUID / TEXT  | FK           |
| ownership_layers       | INTEGER      |              |
| subsidiary_count       | INTEGER      |              |
| acquisition_count      | INTEGER      |              |
| board_influence        | TEXT         | low, medium, high |
| procurement_complexity | TEXT         | low, medium, high |
| created_at             | TIMESTAMPTZ  |              |
| updated_at             | TIMESTAMPTZ  |              |

### `connector_sources`
Configured intelligence sources (LinkedIn, AusTender, etc.).

| Column      | Type         | Notes                                      |
|-------------|--------------|--------------------------------------------|
| id          | UUID / TEXT  | PK                                         |
| tenant_id   | UUID / TEXT  | FK                                         |
| type        | TEXT         | linkedin, sales_nav, apollo, austender, tenderlink, illion, crunchbase |
| name        | TEXT         | Display name                               |
| status      | TEXT         | live, mock, manual, disconnected           |
| source_type | TEXT         | tender, network, enrichment, crm, firmographics |
| contribution| TEXT         | Description                                |
| config      | TEXT         | JSON (encrypted credentials in production) |
| created_at  | TIMESTAMPTZ  |                                            |
| updated_at  | TIMESTAMPTZ  |                                            |

### `tender_boards`
Tender board / portal configs.

| Column     | Type         | Notes        |
|------------|--------------|--------------|
| id         | UUID / TEXT  | PK           |
| tenant_id  | UUID / TEXT  | FK           |
| name       | TEXT         |              |
| description| TEXT         |              |
| region     | TEXT         | nullable     |
| created_at | TIMESTAMPTZ  |              |
| updated_at | TIMESTAMPTZ  |              |

### `intelligence_events`
Activity feed events.

| Column           | Type         | Notes        |
|------------------|--------------|--------------|
| id               | UUID / TEXT  | PK           |
| tenant_id        | UUID / TEXT  | FK           |
| type             | TEXT         | opportunity_scanned, score_updated, etc. |
| timestamp        | TIMESTAMPTZ  |              |
| description      | TEXT         |              |
| opportunity_id   | UUID / TEXT  | nullable, FK |
| organisation_id  | UUID / TEXT  | nullable, FK |
| created_at       | TIMESTAMPTZ  |              |

### `user_settings`
Per-tenant settings (replaces localStorage).

| Column                 | Type         | Notes        |
|------------------------|--------------|--------------|
| tenant_id              | UUID / TEXT  | PK, FK       |
| enabled_tender_boards  | TEXT         | JSON array of IDs |
| enabled_network_sources| TEXT         | JSON array of IDs |
| created_at             | TIMESTAMPTZ  |              |
| updated_at             | TIMESTAMPTZ  |              |

### `chats` (optional – for full persistence)
| Column   | Type         | Notes        |
|----------|--------------|--------------|
| id       | UUID / TEXT  | PK           |
| tenant_id| UUID / TEXT  | FK           |
| title    | TEXT         |              |
| tags     | TEXT         | JSON array   |
| created_at | TIMESTAMPTZ |            |
| updated_at | TIMESTAMPTZ |            |

### `chat_messages` (optional)
| Column   | Type         | Notes        |
|----------|--------------|--------------|
| id       | UUID / TEXT  | PK           |
| chat_id  | UUID / TEXT  | FK           |
| role     | TEXT         | user, assistant |
| content  | TEXT         |              |
| blocks   | TEXT         | JSON         |
| created_at | TIMESTAMPTZ |            |

---

*Last updated: 08/Mar/2025*
