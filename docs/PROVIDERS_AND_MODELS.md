# Understanding LLM Providers & Models in KForge

_Last updated: 29/01/2026

This document explains how KForge thinks about AI providers, models, and cost.
It is intentionally high-level and provider-agnostic.

Provider policies, pricing, and available models change frequently.
This document is a living reference and may be updated over time.

---

## 1. Providers vs Models (important distinction)

In KForge, **providers and models are separate concepts**.

- **Provider**: where the AI runs (cloud service, gateway, or local runtime)
- **Model**: the exact identifier that provider expects (case-sensitive)

KForge does not hardcode pricing, limits, or guarantees.
You are always in control of which models you add and use.

---

## 2. Types of providers

### Cloud-native providers

These companies:
- build their own AI models
- run them on their own infrastructure
- enforce pricing and limits directly

Examples include OpenAI, Anthropic, and Google.

What this means:
- API key required
- Billing usually required
- Most stable and predictable behavior

---

### OpenAI-compatible gateways

These are independent companies that:
- use the same API format popularized by OpenAI
- run their own models or route requests to other providers

Examples include OpenRouter, DeepSeek, Groq, and Hugging Face.

Important:
“OpenAI-compatible” means **same API shape**, not same models or pricing.

Trade-offs:
- Often cheaper or temporarily free
- May change models or limits without notice
- Good for experimentation and flexibility

---

### Local runtimes

These run entirely on your own machine.

Examples include Ollama and LM Studio.

What this means:
- No API key
- No per-token billing
- Cost depends on your hardware
- Performance varies by system

---

## 3. About models and pricing

There is no permanently “free” model.

Most providers charge per token:
- input tokens (what you send)
- output tokens (what the model replies)

Different models have different prices.
Providers may change pricing at any time.

For this reason, KForge treats cost information as **advisory only**.

---

## 4. Model labels in KForge

KForge may display labels such as:

- Free
- Paid
- Unknown

These labels describe **expected billing behavior**, not guarantees.

KForge never:
- appends labels to model IDs
- enforces pricing
- blocks usage based on cost

---

## 5. Choosing a model (practical advice)

Instead of asking “what is the best model?”, consider:

- Am I experimenting or building something serious?
- Do I care more about speed or accuracy?
- Is this a throwaway test or important logic?

You can switch models at any time.
There is no single correct choice.

---

## 6. Why this document lives outside the app

Provider models, pricing, and policies change constantly.

Embedding this information directly in the app would:
- become outdated
- mislead users
- require frequent rebuilds

By linking to this document instead, KForge stays:
- honest
- lightweight
- future-proof

---

## 7. Core principle

KForge does not sell models.
KForge does not guarantee cost.
KForge gives you control.
