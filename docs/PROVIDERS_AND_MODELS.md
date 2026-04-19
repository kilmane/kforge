# Understanding LLM Providers & Models in KForge

_Last updated: 19/04/2026_

This document explains how KForge thinks about AI providers, models, presets, and cost.
It is intentionally high-level and provider-agnostic.

Provider policies, pricing, and available models change frequently.
This document is a living reference and may be updated over time.

---

## 1. Providers vs Models (important distinction)

In KForge, **providers and models are separate concepts**.

- **Provider**: where the AI runs
- **Model**: the exact identifier that provider expects

KForge does not hardcode pricing, limits, or guarantees.
You are always in control of which providers and models you configure.

---

## 2. Types of providers

### Cloud-native providers

These companies:
- build their own AI models
- run them on their own infrastructure
- enforce pricing and limits directly

Examples include OpenAI, Anthropic (Claude), Google (Gemini), Mistral, and DeepSeek.

What this means:
- API key usually required
- billing or account limits usually apply
- generally the most predictable direct route
- model names and capabilities may still evolve

---

### OpenAI-compatible hosts and gateways

These services:
- expose APIs compatible with the OpenAI format
- may host their own models or route requests to multiple providers

Examples include OpenRouter, Groq, and many enterprise or private gateways.

Important:
“OpenAI-compatible” means **similar API shape**, not same models, pricing, or guarantees.

Trade-offs:
- often flexible
- sometimes cheaper
- sometimes temporarily free
- free routes may rotate or disappear
- excellent for experimentation and routing flexibility

---

### Custom (bring-your-own endpoint)

The **Custom provider** allows you to connect:
- self-hosted models
- enterprise gateways
- proxies or internal services
- third-party OpenAI-compatible APIs not baked into KForge

Characteristics:
- maximum control
- no automatic discovery
- KForge does not validate pricing or quotas for you

This option is intended for users who already know what they are connecting to.

---

### Local runtimes

These run entirely on your own machine.

Examples include Ollama and LM Studio.

What this means:
- no API key
- no per-token cloud billing
- cost is hardware, electricity, and time
- performance varies by system

Local models are ideal for:
- offline use
- privacy-sensitive workloads
- experimentation without cloud billing

---

## 3. About models and cost

There is no universally and permanently free model.

Some providers offer:
- free tiers
- trial credits
- rotating free routes
- promotional access

But these can change, disappear, or become rate-limited.

For this reason, KForge treats all cost information as **advisory only**.

---

## 4. Model labels and usage modes in KForge

KForge may display model labels using **color and usage mode**.

These labels are **guidance**, not enforcement.

### Cost (color labels)

- 🔵 Free — no billing required on that route / tier
- 🟢 Paid (low cost)
- 🟡 Paid (standard)
- 🔴 Paid (expensive)
- ⚪ Unknown — provider-dependent or unclear

### Usage modes

- **Sandbox** — testing, quick iterations, throwaway work
- **Main** — day-to-day default usage
- **Heavy** — high capability; use sparingly

A model’s color indicates **expected cost guidance**.
Its usage mode indicates **when it is intended to be used**.

KForge never:
- modifies model IDs
- enforces pricing
- blocks usage based on cost

---

## 5. About presets

Presets are **curated default model suggestions** provided by KForge.

They exist to:
- reduce decision fatigue
- provide sensible starting points
- demonstrate recommended usage patterns

Presets:
- are not exhaustive
- may overlap across providers
- may change over time

The current readable snapshot is documented in:
- **Presets Inventory**

Plain English mechanism:
- today, KForge may still use built-in compiled presets inside the app
- the readable markdown docs are maintenance references
- a future remote `presets.json` system is intended to let preset suggestions update without rebuilding the app
- until that mechanism is confirmed live in code, do not assume the markdown snapshot is the runtime source

---

## 6. Duplicate models across providers (intentional)

You may see the same model name appear under multiple providers.

This is intentional.

Examples:
- the same model through a direct provider vs a gateway
- the same model through a marketplace vs a dedicated host
- the same model through a custom endpoint vs a built-in provider

These options may differ in:
- pricing
- availability
- routing
- privacy and control

The capability may be similar, but the tradeoffs are not.

---

## 7. Volatility and expectations

Some models are inherently volatile:
- preview releases
- rotating free routes
- marketplace-provided free models
- aliases that move to newer snapshots

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
- Do I want the direct provider or a flexible gateway route?

You can switch models at any time.
There is no single correct choice.

---

## 9. Why this document lives outside the app

Provider models, pricing, and policies change constantly.

Embedding this information directly in the app would:
- become outdated quickly
- mislead users
- require frequent rebuilds

By keeping guidance in docs, KForge stays:
- honest
- lightweight
- easier to maintain

---

## 10. Core principle

KForge does not sell models.  
KForge does not guarantee cost.  
KForge gives you control.