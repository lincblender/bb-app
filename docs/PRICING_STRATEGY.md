# BidBlender Pricing Strategy

## Free Tier: Ad-Supported

The free tier has **generous constraints** (not unlimited) and is **ad-supported** as a self-bootstrapping mechanism. This allows us to serve users while they evaluate without requiring payment upfront.

**Site messaging:** "BidBlender runs on ads, so we can serve you while you evaluate. Upgrade to a paid plan and ads disappear."

**Rules:**
- Free tier: generous limits + inline ads
- Paid tier: no ads, higher limits, full features

## Target Market

- **Small consultancies** (1–10): Low entry price, clear ROI
- **Mid-sized** (10–50): Most likely early adopters—agile, capital to invest
- **Large** (50+): Volume discounts, enterprise features

## Funding Scenarios

| Scenario | Free tier approach |
|---------|-------------------|
| **Bootstrapped** | Ad-supported + generous limits. Revenue from ads + upgrades. |
| **Funded** | Can relax limits or reduce ad density; trade short-term revenue for growth. |

## Cost and Pricing

- [COST_ESTIMATION.md](./COST_ESTIMATION.md) — per-user cost breakdown and 70% margin guidance
- [OPENAI_PRICING.md](./OPENAI_PRICING.md) — OpenAI rates, model strategy, gpt-5.4 for demos, token caps
- [PRICING_TABLES.md](./PRICING_TABLES.md) — subscription tiers, annual discounts, add-ons, professional services (investor use)

## Implementation

- **Stripe** for subscription billing
- **Ad placement** in free-tier console (sidebar, between sections)
- **Paid plans** remove ads entirely via feature flag / plan check
