# OpenAI API Pricing & Model Strategy

Rates derived from [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing). Use for cost estimation, tier caps, and model selection.

---

## 1. Model Pricing (Standard Tier)

*Standard tier = real-time, low latency. Use for chat-driven analysis.*

| Model | Input / 1M | Cached / 1M | Output / 1M | Use case |
|-------|------------|-------------|-------------|----------|
| **gpt-5-nano** | $0.05 | $0.005 | $0.40 | Ultra-low cost, simple extraction |
| **gpt-4o-mini** | $0.15 | $0.075 | $0.60 | Default production (current) |
| **gpt-5-mini** | $0.25 | $0.025 | $2.00 | Better quality, moderate cost |
| **gpt-4o** | $2.50 | $1.25 | $10.00 | Deep analysis, complex reasoning |
| **gpt-5.4** (<272K) | $2.50 | $0.25 | $15.00 | **Best quality, demos, low error** |

*Cached input = prompt caching; useful when system prompt is reused.*

---

## 2. Batch Tier (Async / Non-Real-Time)

*50% cheaper. Use for background jobs, overnight processing, non-interactive analyses.*

| Model | Input / 1M | Cached / 1M | Output / 1M |
|-------|------------|-------------|-------------|
| gpt-5-nano | $0.025 | $0.0025 | $0.20 |
| gpt-4o-mini | $0.075 | — | $0.30 |
| gpt-5-mini | $0.125 | $0.0125 | $1.00 |
| gpt-5.4 | $1.25 | $0.13 | $7.50 |

---

## 3. Per-Analysis Cost (8k input, 1.5k output)

| Model | Cost/analysis | Relative |
|-------|---------------|----------|
| gpt-5-nano | ~$0.001 | 0.5× |
| gpt-4o-mini | ~$0.002 | 1× (baseline) |
| gpt-5-mini | ~$0.005 | 2.5× |
| gpt-4o | ~$0.035 | 17× |
| gpt-5.4 | ~$0.042 | 20× |

*Heavy analysis (20k in, 2k out): gpt-4o-mini ~$0.005, gpt-5.4 ~$0.08.*

---

## 4. Model Selection Strategy

| Tier | Default model | Deep model | Demo / showcase |
|------|---------------|------------|-----------------|
| **Free** | gpt-4o-mini | — | gpt-5.4 (capped) |
| **Starter** | gpt-4o-mini | gpt-4o | gpt-5.4 (capped) |
| **Team** | gpt-5-mini | gpt-4o | gpt-5.4 |
| **Enterprise** | gpt-5-mini or gpt-5.4 | gpt-5.4 | gpt-5.4 |

**gpt-5.4 for demos:** Best performance, lowest error rates, strongest value in investor/customer demonstrations. Use sparingly for:
- Live demos (e.g. 5–10 analyses per demo)
- Book-a-demo flows
- Pilot/POC evaluations
- High-stakes strategic decisions (Enterprise)

**Cost trade-off:** gpt-5.4 is ~20× gpt-4o-mini. A demo with 10 analyses × gpt-5.4 ≈ $0.42 vs $0.02 for gpt-4o-mini. Acceptable for conversion value.

---

## 5. Token Caps by Tier (Derived from Rates)

Target: keep OpenAI cost within 70% margin. Use gpt-4o-mini as baseline unless otherwise noted.

| Tier | Analyses/mo | Model mix | Est. OpenAI cost |
|------|-------------|-----------|------------------|
| **Free** | 15 | 100% gpt-4o-mini | ~$0.03 |
| **Free (demo mode)** | 5 gpt-5.4 + 10 gpt-4o-mini | Demo allocation | ~$0.25 |
| **Starter** | 25 | 90% mini, 10% deep | ~$0.08 |
| **Team** | 75 | 80% gpt-5-mini, 20% deep | ~$0.35 |
| **Enterprise** | Custom | Negotiated | — |

**Add-on: Deep analysis pack** — +50 gpt-4o analyses/mo ≈ $1.75 cost → price $29/mo (margin ~94%).

---

## 6. Prompt Caching

When system prompt is reused across requests, use cached input pricing:

- **gpt-4o-mini:** $0.075/1M cached (50% cheaper than input)
- **gpt-5.4:** $0.25/1M cached (50% cheaper)
- **gpt-5-mini:** $0.025/1M cached

*Implementation:* Ensure system prompt is stable; OpenAI caches when prompt prefix is repeated. Our `SYSTEM_PROMPT_TEMPLATE` + `buildExpectedEnvelope` is a good candidate.

---

## 7. Flex Tier (Lower Latency Requirement)

For analyses that can tolerate higher latency (e.g. 30–60 sec):

- **gpt-5.4 Flex:** $1.25 in, $0.13 cached, $7.50 out (50% cheaper than Standard)
- **gpt-5-mini Flex:** $0.125 in, $0.0125 cached, $1.00 out

Use for: overnight batch, "analyse later" queue, non-critical workflows.

---

## 8. Implementation Notes

1. **Environment variables:** `OPENAI_MODEL_DEFAULT`, `OPENAI_MODEL_DEEP`, `OPENAI_MODEL_DEMO`
2. **Model routing:** Check plan tier + `model_profile` (economy | balanced | deep) + `is_demo` flag
3. **estimateCost():** Update `lib/ai/run-analysis.ts` with full model lookup table (see below)
4. **Usage tracking:** Log `input_tokens`, `output_tokens`, `model_id` per analysis for billing/quotas

---

## 9. Cost Lookup for estimateCost()

```ts
// Per 1M tokens: [input, output]
const MODEL_RATES: Record<string, [number, number]> = {
  "gpt-5-nano": [0.05, 0.40],
  "gpt-4o-mini": [0.15, 0.60],
  "gpt-5-mini": [0.25, 2.00],
  "gpt-4o": [2.50, 10.00],
  "gpt-5.4": [2.50, 15.00],
};
// Fallback: mini rates for unknown
```

---

## 10. References

- [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing)
- [Prompt caching](https://platform.openai.com/docs/guides/prompt-caching)
- [Batch API](https://platform.openai.com/docs/guides/batch)
- [Flex processing](https://platform.openai.com/docs/guides/cost-optimization#flex-processing)
