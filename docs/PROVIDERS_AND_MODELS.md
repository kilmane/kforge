# Understanding LLM Providers & Models in KForge

_Last updated: 01/02/2026_

This document explains how KForge thinks about AI providers, models, presets, and cost.
It is intentionally high-level and provider-agnostic.

Provider policies, pricing, and available models change frequently.
This document is a living reference and may be updated over time.

---

## 1. Providers vs Models (important distinction)

In KForge, **providers and models are separate concepts**.

- **Provider**: where the AI runs (cloud service, gateway, or local runtime)
- **Model**: the exact identifier that provider expects (case-sensitive)

KForge does not hardcode pricing, limits, or guarantees.
You are always in control of which providers and models you configure.

---

## 2. Types of providers

### Cloud-native providers

These companies:
- build their own AI models
- run them on their own infrastructure
- enforce pricing and limits directly

Examples include OpenAI, Anthropic (Claude), Google (Gemini), and Mistral.

What this means:
- API key required
- Billing usually required
- Most stable and predictable behavior
- Model names and capabilities may still evolve

---

### OpenAI-compatible gateways

These are independent services that:
- expose APIs compatible with the OpenAI format
- host their own models or route requests to multiple providers

Examples include OpenRouter, DeepSeek, and Groq.

Important:
“OpenAI-compatible” means **same API shape**, not same models, pricing, or guarantees.

Trade-offs:
- Often cheaper or temporarily free
- Free tiers may rotate or disappear
- Models may change without notice
- Excellent for experimentation and flexibility

---

### Custom (bring-your-own endpoint)

The **Custom provider** allows you to connect:
- self-hosted models
- enterprise gateways
- proxies or internal services

Characteristics:
- Maximum control
- No discovery or marketplace
- KForge does not validate or manage pricing

This option is intended for advanced users who already know what they are connecting to.

---

### Local runtimes

These run entirely on your own machine.

Examples include Ollama and LM Studio.

What this means:
- No API key
- No per-token billing
- Cost is hardware, electricity, and time
- Performance varies by system

Local models are ideal for:
- offline use
- privacy-sensitive workloads
- experimentation without cloud cost

---

## 3. About models and cost

There is no permanently “free” model.

Most cloud providers charge per token:
- input tokens (what you send)
- output tokens (what the model replies)

Even models labeled as “free” may:
- have rate limits
- expire
- require paid tiers later

For this reason, KForge treats all cost information as **advisory only**.

---

## 4. Model labels and usage modes in KForge

KForge may display model labels using **color and usage mode**.

These labels are **guidance**, not enforcement.

### Cost (color labels)

- 🔵 Free — no billing required
- 🟢 Paid (low cost)
- 🟡 Paid (standard)
- 🔴 Paid (expensive)
- ⚪ Unknown — provider-dependent or unclear

### Usage modes

- **Sandbox** — testing, quick iterations, throwaway work
- **Main** — day-to-day default usage
- **Heavy** — high capability; use sparingly

A model’s color indicates **expected cost**.
Its usage mode indicates **when it should be used**.

KForge never:
- modifies model IDs
- enforces pricing
- blocks usage based on cost

---

## 5. About presets

Presets are **curated default models** provided by KForge.

They exist to:
- reduce decision fatigue
- provide safe starting points
- demonstrate recommended usage patterns

Presets:
- are not exhaustive
- may overlap across providers
- can change over time

The current snapshot of presets is documented in:
- **Presets Inventory**

Presets are defined in the app today but are expected to move to remote configuration in the future.

---

## 6. Duplicate models across providers (intentional)

You may see the same model name appear under multiple providers.

This is intentional.

Examples:
- the same model via a marketplace vs a direct provider
- the same model via a custom endpoint vs a hosted service

These options differ in:
- pricing
- availability
- routing
- privacy and control

The capability may be similar, but the tradeoffs are not.

---

## 7. Volatility and expectations

Some models are inherently volatile:
- preview releases
- rotating free tiers
- marketplace-provided “free” models

This is normal.

KForge is designed so that:
- models may appear or disappear
- users can adapt quickly
- documentation sets expectations clearly

Volatility is not a bug — it is part of the ecosystem.

---

## 8. Choosing a model (practical advice)

Instead of asking “what is the best model?”, consider:

- Am I experimenting or building something serious?
- Do I care more about speed or reasoning?
- Is this a temporary task or important logic?

You can switch models at any time.
There is no single correct choice.

---

## 9. Why this document lives outside the app

Provider models, pricing, and policies change constantly.

Embedding this information directly in the app would:
- become outdated
- mislead users
- require frequent rebuilds

By linking to documentation instead, KForge stays:
- honest
- lightweight
- future-proof

---

## 10. Core principle

KForge does not sell models.  
KForge does not guarantee cost.  
KForge gives you control.
