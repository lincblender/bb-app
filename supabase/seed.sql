-- Seed data for hello@bidblender.com.au (tenant: hello-bidblender)
-- Run after migrations: supabase db execute < supabase/seed.sql
-- Or paste into Supabase SQL Editor

-- Tenant
INSERT INTO tenants (id, name) VALUES ('hello-bidblender', 'BidBlender Demo')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Bidder organisation
INSERT INTO organisations (id, tenant_id, type, name, description, capabilities, certifications, case_studies, sectors, strategic_preferences, target_markets, partner_gaps)
VALUES (
  'bidder-1',
  'hello-bidblender',
  'bidder',
  'TechServe Solutions',
  'Australian IT services provider specialising in government and enterprise digital transformation, cloud migration, and cybersecurity.',
  '[{"id":"c1","name":"Cloud Migration","category":"Infrastructure"},{"id":"c2","name":"Cybersecurity","category":"Security"},{"id":"c3","name":"Digital Transformation","category":"Consulting"},{"id":"c4","name":"Data Analytics","category":"Data"},{"id":"c5","name":"Managed Services","category":"Infrastructure"}]',
  '[{"id":"cert1","name":"ISO 27001","issuer":"ISO"},{"id":"cert2","name":"FedRAMP Equivalent","issuer":"IRAP"}]',
  '[{"id":"cs1","title":"State Govt Cloud Migration","client":"State Government Dept","outcome":"Migrated 50+ applications to cloud within 18 months."},{"id":"cs2","title":"Healthcare Data Platform","client":"Regional Health Service","outcome":"Delivered analytics platform serving 12 hospitals."}]',
  '["Government","Healthcare","Finance","Education"]',
  '["Government","Healthcare"]',
  '["Federal","State","Local Government"]',
  '["Specialist ERP","Legacy Mainframe"]'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Buyer organisations
INSERT INTO organisations (id, tenant_id, type, name, description) VALUES
  ('buyer-1', 'hello-bidblender', 'buyer', 'Department of Digital Services', 'Federal department responsible for whole-of-government IT.'),
  ('buyer-2', 'hello-bidblender', 'buyer', 'State Health Authority', 'State-level health service procurement.'),
  ('buyer-3', 'hello-bidblender', 'buyer', 'City Council Metro', 'Metropolitan local government.'),
  ('buyer-4', 'hello-bidblender', 'buyer', 'National Infrastructure Corp', 'Large statutory corporation with complex ownership.'),
  ('buyer-5', 'hello-bidblender', 'buyer', 'Regional University', 'Regional university IT procurement.'),
  ('buyer-6', 'hello-bidblender', 'buyer', 'Defence Digital', 'Defence sector digital transformation.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

UPDATE organisations SET subsidiaries = '["NIC Subsidiary A","NIC Subsidiary B"]', acquisition_history = '["Acquired Regional Corp 2022"]', board_complexity = 'high', scale = 'enterprise' WHERE id = 'buyer-4';

-- People
INSERT INTO people (id, tenant_id, organisation_id, name, title) VALUES
  ('p1', 'hello-bidblender', 'bidder-1', 'Sarah Chen', 'Director, Government'),
  ('p2', 'hello-bidblender', 'bidder-1', 'James Wilson', 'Account Manager'),
  ('p3', 'hello-bidblender', 'bidder-1', 'Emma Roberts', 'Solutions Architect'),
  ('p4', 'hello-bidblender', 'bidder-1', 'Michael Park', 'BD Manager'),
  ('p5', 'hello-bidblender', 'bidder-1', 'Lisa Nguyen', 'Director, Healthcare'),
  ('p6', 'hello-bidblender', 'bidder-1', 'David Brown', 'Senior Consultant'),
  ('p7', 'hello-bidblender', 'bidder-1', 'Anna Kumar', 'Account Director'),
  ('p8', 'hello-bidblender', 'bidder-1', 'Tom Foster', 'Technical Lead')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title;

-- Opportunities (run in one batch - truncated for brevity, full seed in scripts/seed-db.ts)
INSERT INTO opportunities (id, tenant_id, issuing_organisation_id, title, category, source_id, due_date, summary, status) VALUES
  ('opp-1', 'hello-bidblender', 'buyer-1', 'Whole-of-Government Cloud Framework', 'Cloud Services', 'tb-tenderlink', '2025-04-15', 'Panel arrangement for cloud migration and managed services.', 'pursuing'),
  ('opp-2', 'hello-bidblender', 'buyer-2', 'Healthcare Data Analytics Platform', 'Data & Analytics', 'tb-tenderlink', '2025-05-20', 'Analytics platform for regional health data.', 'reviewing'),
  ('opp-3', 'hello-bidblender', 'buyer-3', 'Local Council IT Refresh', 'Infrastructure', 'tb-austender', '2025-03-28', 'Hardware and software refresh for council offices.', 'reviewing'),
  ('opp-4', 'hello-bidblender', 'buyer-4', 'NIC Digital Transformation Program', 'Digital Transformation', 'tb-tenderlink', '2025-06-10', 'Multi-year digital transformation for national infrastructure.', 'reviewing'),
  ('opp-5', 'hello-bidblender', 'buyer-5', 'University Student Portal', 'Software', 'tb-tenders-nsw', '2025-04-30', 'Student-facing portal and LMS integration.', 'monitoring'),
  ('opp-6', 'hello-bidblender', 'buyer-6', 'Defence Cyber Uplift', 'Cybersecurity', 'tb-austender', '2025-05-15', 'Cybersecurity assessment and uplift program.', 'reviewing'),
  ('opp-7', 'hello-bidblender', 'buyer-1', 'Federal Data Centre Consolidation', 'Infrastructure', 'tb-austender', '2025-07-01', 'Consolidation of federal data centres.', 'new'),
  ('opp-8', 'hello-bidblender', 'buyer-2', 'State Health EMR Integration', 'Healthcare IT', 'tb-tenderlink', '2025-06-25', 'EMR integration across state health services.', 'new'),
  ('opp-9', 'hello-bidblender', 'buyer-3', 'Regional Council ERP Implementation', 'ERP', 'tb-vic-tenders', '2025-05-05', 'ERP system implementation for regional councils.', 'passed'),
  ('opp-10', 'hello-bidblender', 'buyer-4', 'NIC Subsidiary IT Support', 'Managed Services', 'tb-tenderlink', '2025-08-15', 'Ongoing IT support for NIC subsidiary.', 'new')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

INSERT INTO opportunity_assessments (opportunity_id, technical_fit, network_strength, organisational_complexity, recommendation, strategy_posture) VALUES
  ('opp-1', 92, 88, 65, 'sweet-spot', 'pursue-directly'),
  ('opp-2', 85, 72, 45, 'sweet-spot', 'pursue-directly'),
  ('opp-3', 78, 25, 30, 'technical-edge', 'technically-strong-needs-access'),
  ('opp-4', 70, 90, 85, 'relationship-edge', 'relationship-led-play'),
  ('opp-5', 55, 10, 35, 'low-priority', 'monitor-only'),
  ('opp-6', 88, 15, 70, 'technical-edge', 'technically-strong-needs-access'),
  ('opp-7', 82, 75, 60, 'sweet-spot', 'pursue-directly'),
  ('opp-8', 65, 80, 50, 'relationship-edge', 'network-strong-capability-gap'),
  ('opp-9', 35, 40, 40, 'low-priority', 'monitor-only'),
  ('opp-10', 90, 85, 80, 'sweet-spot', 'pursue-with-partner')
ON CONFLICT (opportunity_id) DO UPDATE SET technical_fit = EXCLUDED.technical_fit;

-- Relationship signals
INSERT INTO relationship_signals (id, tenant_id, bidder_person_id, buyer_organisation_id, connection_count, seniority_level, shared_employers, adjacency_to_decision_makers, department_concentration) VALUES
  ('rs1', 'hello-bidblender', 'p1', 'buyer-1', 12, 'executive', 2, 'direct', '["Procurement","IT"]'),
  ('rs2', 'hello-bidblender', 'p2', 'buyer-2', 8, 'senior', 1, 'direct', '["Health IT"]'),
  ('rs3', 'hello-bidblender', 'p3', 'buyer-3', 2, 'mid', 0, 'indirect', '["IT"]'),
  ('rs4', 'hello-bidblender', 'p4', 'buyer-4', 15, 'executive', 3, 'direct', '["Procurement","Finance","IT"]'),
  ('rs5', 'hello-bidblender', 'p5', 'buyer-5', 1, 'junior', 0, 'none', '[]'),
  ('rs6', 'hello-bidblender', 'p6', 'buyer-6', 0, 'mid', 0, 'none', '[]')
ON CONFLICT (id) DO NOTHING;

-- Complexity signals
INSERT INTO complexity_signals (id, tenant_id, organisation_id, ownership_layers, subsidiary_count, acquisition_count, board_influence, procurement_complexity) VALUES
  ('cs1', 'hello-bidblender', 'buyer-1', 1, 0, 0, 'medium', 'high'),
  ('cs2', 'hello-bidblender', 'buyer-4', 3, 2, 1, 'high', 'high')
ON CONFLICT (id) DO NOTHING;

-- Connector sources
INSERT INTO connector_sources (id, tenant_id, type, name, status, source_type, contribution) VALUES
  ('conn-1', 'hello-bidblender', 'public_tender', 'Public Tender Sources', 'live', 'tender', 'Opportunity discovery, due dates, categories.'),
  ('conn-2', 'hello-bidblender', 'public_web', 'Public Web Enrichment', 'live', 'enrichment', 'Company descriptions, firmographics.'),
  ('conn-3', 'hello-bidblender', 'crm', 'CRM Import', 'manual', 'crm', 'Account context, contact history.'),
  ('conn-4', 'hello-bidblender', 'linkedin', 'LinkedIn Authorised Network Graph', 'mock', 'network', 'Relationship density, connection proximity, seniority. Primary network intelligence source.'),
  ('conn-5', 'hello-bidblender', 'sales_nav', 'Sales Navigator Authorised Access', 'mock', 'network', 'Decision-maker identification, account mapping.'),
  ('conn-6', 'hello-bidblender', 'complexity', 'Ownership / Complexity Data', 'mock', 'firmographics', 'Parent companies, subsidiaries, acquisitions, board structure.'),
  ('conn-7', 'hello-bidblender', 'apollo', 'Apollo / ZoomInfo Enrichment', 'mock', 'enrichment', 'Personnel lists, titles, company descriptions.')
ON CONFLICT (id) DO NOTHING;

-- Tender boards
INSERT INTO tender_boards (id, tenant_id, name, description, region) VALUES
  ('tb-tenderlink', 'hello-bidblender', 'TenderLink', 'TenderLink portal', 'Australia'),
  ('tb-austender', 'hello-bidblender', 'AusTender', 'Australian Government tenders', 'Federal'),
  ('tb-tenders-nsw', 'hello-bidblender', 'Tenders NSW', 'NSW Government tenders', 'NSW'),
  ('tb-vic-tenders', 'hello-bidblender', 'Victorian Tenders', 'VIC Government tenders', 'VIC')
ON CONFLICT (id) DO NOTHING;

-- Intelligence events (use NOW() - interval for timestamps)
INSERT INTO intelligence_events (id, tenant_id, type, timestamp, description, opportunity_id, organisation_id) VALUES
  ('ie1', 'hello-bidblender', 'opportunity_scanned', NOW() - INTERVAL '2 hours', 'New opportunity: Federal Data Centre Consolidation', 'opp-7', NULL),
  ('ie2', 'hello-bidblender', 'score_updated', NOW() - INTERVAL '5 hours', 'Technical fit score updated for Whole-of-Government Cloud Framework', 'opp-1', NULL),
  ('ie3', 'hello-bidblender', 'relationship_detected', NOW() - INTERVAL '8 hours', 'New connection detected: James Wilson to State Health Authority', NULL, 'buyer-2'),
  ('ie4', 'hello-bidblender', 'complexity_updated', NOW() - INTERVAL '24 hours', 'Organisational complexity refreshed for National Infrastructure Corp', NULL, 'buyer-4'),
  ('ie5', 'hello-bidblender', 'opportunity_scanned', NOW() - INTERVAL '36 hours', 'New opportunity: NIC Subsidiary IT Support', 'opp-10', NULL)
ON CONFLICT (id) DO NOTHING;
