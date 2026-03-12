# BidBlender Cost Estimation

Cost-per-user estimates based on the current stack (Supabase, Vercel, OpenAI) and usage assumptions. Use these to set pricing that targets ~70% gross margin (i.e. cost = 30% of revenue).

## Stack Components

| Service | Role | Pricing model |
|---------|------|---------------|
| **Supabase** | Auth, Postgres, storage | Free tier → Pro $25/mo base + usage |
| **Vercel** | Hosting, serverless (API routes) | Pro $20/mo + function invocations/duration |
| **OpenAI** | AI analysis (gpt-4o-mini default, gpt-4o for deep) | Per token |
| **Stripe** (when added) | Subscriptions | 2.9% + $0.30 per transaction |

## OpenAI Token Costs

Rates from [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing). Full model strategy in [OPENAI_PRICING.md](./OPENAI_PRICING.md).

| Model | Input / 1M | Output / 1M | Per-analysis (8k/1.5k) |
|-------|------------|-------------|------------------------|
| gpt-5-nano | $0.05 | $0.40 | ~$0.001 |
| gpt-4o-mini (default) | $0.15 | $0.60 | ~$0.002 |
| gpt-5-mini | $0.25 | $2.00 | ~$0.005 |
| gpt-4o (deep) | $2.50 | $10.00 | ~$0.035 |
| gpt-5.4 (demos) | $2.50 | $15.00 | ~$0.042 |

Typical analysis (chat-driven bid/no-bid):
- System prompt: ~800 tokens
- User prompt (context, org profile, opportunity): 3k–15k tokens
- Output (JSON): 800–2k tokens

**Per-analysis (gpt-4o-mini):**
- Light (no docs): ~4k in, 1k out → ~$0.0012
- Medium (with context): ~8k in, 1.5k out → ~$0.0024
- Heavy (with docs): ~20k in, 2k out → ~$0.0050

**Average: ~$0.0025 per analysis** (gpt-4o-mini). **gpt-5.4: ~$0.04** (best quality, use for demos).

## Usage Assumptions (per paid user/month)

| Activity | Conservative | Moderate | Heavy |
|----------|--------------|----------|-------|
| AI analyses (opportunities) | 10 | 20 | 40 |
| Chat messages (each triggers analysis) | 10 | 20 | 40 |
| DB reads/writes | Low | Medium | Medium |
| Storage (org profiles, assessments) | ~0.5 MB | ~1 MB | ~2 MB |

## Cost Per User Per Month

### OpenAI
- Conservative: 10 × $0.0025 = **$0.025**
- Moderate: 20 × $0.0025 = **$0.05**
- Heavy: 40 × $0.0025 = **$0.10**

(Deep analyses use gpt-4o at ~10× cost; assume 10% of analyses are deep → add ~$0.01–0.02)

### Supabase (Pro $25/mo)
- Amortized across users. At 100 users: **$0.25/user**. At 500 users: **$0.05/user**.
- Storage/egress within included quotas for typical usage.

### Vercel (Pro)
- 1M invocations included. ~20 API calls/user/month → 2k invocations per 100 users.
- Function duration: ~3–5 sec per analysis (mostly OpenAI wait). At 1GB: ~0.0015 GB-hr per call.
- 100 users × 20 calls × 0.0015 = 3 GB-hr → ~$0.54. **~$0.005/user** at 100 users.

### Stripe (when live)
- $20/month subscription: 2.9% + $0.30 ≈ **$0.88** per user per month.

### Total Cost Per User (Moderate usage, 100–500 users)

| Component | Cost |
|-----------|------|
| OpenAI | $0.05 – $0.12 |
| Supabase | $0.05 – $0.25 |
| Vercel | $0.01 – $0.05 |
| Stripe | $0.88 |
| **Total** | **~$1.00 – $1.30** |

At 1000+ users, Supabase/Vercel amortize further; OpenAI scales linearly with usage.

## 70% Margin Pricing

Target: cost = 30% of revenue → **price = cost ÷ 0.30**

| Cost/user | Minimum price (70% margin) |
|-----------|---------------------------|
| $1.00 | $3.33 → **$4–5/mo** |
| $1.50 | $5.00 → **$5–6/mo** |
| $2.00 | $6.67 → **$7–8/mo** |
| $2.50 | $8.33 → **$9–10/mo** |
| $3.00 | $10.00 → **$10–12/mo** |
| $5.00 | $16.67 → **$15–20/mo** |

**Note:** Stripe’s $0.30 per transaction is fixed; at low prices it hurts margin. A $5/mo plan leaves little room. **$15–20/mo** is a sweet spot: cost ~$2–3, Stripe ~$0.75, margin healthy.

## Recommended Floor

- **Starter tier:** $15–20/month per seat (or per-org)
- **Free tier:** Cap at ~10–15 analyses/month to keep OpenAI cost < $0.05/user
- **Heavy users:** Usage-based overage or higher tiers

## Model Strategy & Caps

See [OPENAI_PRICING.md](./OPENAI_PRICING.md) for:
- Token caps by tier (derived from rates)
- gpt-5.4 for demos (best performance, ~20× cost)
- Batch/Flex tiers for async work
- Prompt caching to reduce input cost

## Caveats

- LinkedIn API (if/when used for network intelligence) may add cost.
- Ad revenue on free tier offsets some infra cost.
- Enterprise/custom deployments change the model (self-hosted, different margins).
