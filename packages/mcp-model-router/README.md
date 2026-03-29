# BidBlender MCP Model Router

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that evaluates available OpenAI models and recommends the best fit for any given BidBlender analysis task.

## Why?

BidBlender dispatches many different types of AI jobs — from cheap metadata extraction to deep strategic bid/no-bid decisions. Using the same model for everything either wastes money or produces poor results. This MCP server gives any connected agent (Cursor, Claude Desktop, your own code) the ability to ask:

> "What model should I use for a STRATEGIC_BID_INTELLIGENCE analysis with a 50k token document on a moderate budget?"

…and get a scored, reasoned recommendation instantly.

## Tools

| Tool | Description |
|------|-------------|
| `list_models` | Returns all registered models with capabilities, pricing, and paradigm tags. Optionally filter by tier or model ID. |
| `recommend_model` | Scores every model against a task description and constraints (complexity, budget, reasoning needs, token count) and returns a ranked recommendation with reasoning. |
| `get_paradigm_model_map` | Returns a full matrix of recommended models for every BidBlender paradigm at each budget level (cheap/moderate/unlimited). |

## Model Registry

The registry currently includes:

| Model | Tier | Reasoning | Context | Input $/M | Output $/M |
|-------|------|-----------|---------|-----------|------------|
| gpt-4.1-nano | nano | ❌ | 1M | $0.10 | $0.40 |
| gpt-4o-mini | economy | ❌ | 128k | $0.15 | $0.60 |
| gpt-4.1-mini | economy | ❌ | 1M | $0.40 | $1.60 |
| gpt-4o | balanced | ❌ | 128k | $2.50 | $10.00 |
| gpt-4.1 | balanced | ❌ | 1M | $2.00 | $8.00 |
| o3-mini | deep | ✅ | 200k | $1.10 | $4.40 |
| o4-mini | deep | ✅ | 200k | $1.10 | $4.40 |
| o3 | reasoning | ✅ | 200k | $2.00 | $8.00 |

## Setup

### As a Cursor MCP server

The server is pre-configured in `.cursor/mcp.json`. Just restart Cursor.

### Manual run

```bash
cd packages/mcp-model-router
npm install
npx tsx src/index.ts
```

## Architecture

```
src/
  index.ts      # MCP server entry point (stdio transport)
  registry.ts   # Curated model catalogue with capabilities & pricing
  recommend.ts  # Scoring engine that ranks models against task requirements
```

The scoring engine weights these factors:
1. **Paradigm/analysis type match** — does the model's `bestFor` list include the requested paradigm?
2. **Complexity alignment** — low-complexity tasks prefer cheap models; high-complexity prefers reasoning models
3. **Capability requirements** — reasoning, vision, structured output, context window
4. **Budget constraint** — cheap/moderate/unlimited affects cost weighting
5. **Quality baseline** — tier quality score as tie-breaker
