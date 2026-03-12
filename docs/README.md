# bb-app docs

Documentation for the **BidBlender app** (bidblender.io).

## Doc index

| Doc | Purpose |
|-----|---------|
| [DOMAIN_PLAN.md](./DOMAIN_PLAN.md) | Domain architecture: .io = app, .com = marketing |
| [SPLIT_MIGRATION_CHECKLIST.md](./SPLIT_MIGRATION_CHECKLIST.md) | Migration checklist |
| [APP_BREAKAWAY.md](./APP_BREAKAWAY.md) | App vs marketing split, path simplification |
| [AUTH_SETUP.md](./AUTH_SETUP.md) | Supabase auth, OAuth |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production URLs, env vars |
| [SCHEMA.md](./SCHEMA.md) | Database schema |
| [SYNC_PLAN.md](./SYNC_PLAN.md) | Supabase ↔ SQLite sync |
| [ROADMAP.md](./ROADMAP.md) | Development roadmap |
| [MCP_SETUP.md](./MCP_SETUP.md) | MCP connectors |
| [HUBSPOT_MCP.md](./HUBSPOT_MCP.md) | HubSpot integration |
| [LINKEDIN_OAUTH_SETUP.md](./LINKEDIN_OAUTH_SETUP.md) | LinkedIn OIDC |
| [LINKEDIN_COMPANY_ADMIN_SETUP.md](./LINKEDIN_COMPANY_ADMIN_SETUP.md) | LinkedIn company admin |
| [AI.md](./AI.md) | AI/chat integration |
| [COST_ESTIMATION.md](./COST_ESTIMATION.md) | Cost modelling |
| [OPENAI_PRICING.md](./OPENAI_PRICING.md) | OpenAI pricing |
| [THEME.md](./THEME.md) | Design tokens |
| [INTERNAL_LINKING_ARCHITECTURE.md](./INTERNAL_LINKING_ARCHITECTURE.md) | Link injection pattern |
| [MULTI_APP_STRATEGY.md](./MULTI_APP_STRATEGY.md) | Multi-surface (web, mobile, extension) |
| [RN_BUILD.md](./RN_BUILD.md) | React Native |
| [GCH_EXT_BUILD.md](./GCH_EXT_BUILD.md) | Chrome extension |
| [SHELL_REFACTOR.md](./SHELL_REFACTOR.md) | Shell abstractions |
| [FUTURE_VARIANT_BUILD.md](./FUTURE_VARIANT_BUILD.md) | Watch, widgets, App Clip |
| [Data_Handling_strategy_proposal.md](./Data_Handling_strategy_proposal.md) | Data handling |
| [LI_learning_*.md](./LI_learning_API_concept.md) | LinkedIn learning API |
| [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) | Demo flow |
| [GOLDEN_PATH_VIDEO_READINESS.md](./GOLDEN_PATH_VIDEO_READINESS.md) | Video readiness |
| [VIDEO_AUTOMATION_PLAN.md](./VIDEO_AUTOMATION_PLAN.md) | Video automation |
| [PRICING_STRATEGY.md](./PRICING_STRATEGY.md) | Pricing (shared with marketing) |
| [PRICING_TABLES.md](./PRICING_TABLES.md) | Pricing tables |

## Doc strategy

Docs are **split by context**. This repo holds app, auth, connectors, schema, and deployment docs. Marketing docs live in **bb-web**.
