# Custom Provider (OpenAI-compatible Endpoints)

_Last updated: 19/04/2026_

---

## What is the Custom provider?

The **Custom provider** lets you connect **any OpenAI-compatible API endpoint** to KForge.

If your provider supports:

- `POST /v1/chat/completions`
- `Authorization: Bearer <API_KEY>`

then it should work with Custom.

This makes KForge **future-proof and vendor-agnostic**:

- you are not locked into specific providers
- you can use new providers immediately
- KForge keeps working even if providers change, rotate, or disappear

Custom is designed for:
- advanced users
- enterprise setups
- self-hosted gateways
- anyone who wants full control

---

## What Custom is NOT

Custom does **not**:

- fetch models automatically
- know pricing, quotas, or rate limits
- guarantee availability of any model
- provide “free” models by itself

All of this depends entirely on:
- your endpoint
- your provider account
- your chosen model ID

KForge is honest about this by design.

---

## Endpoint requirements

Your endpoint must be **OpenAI-compatible**.

### Required

- Base URL only (no trailing `/v1`)
  - Example: `https://api.mistral.ai`
- Authentication via **Bearer token**

KForge will automatically call:

- `/v1/chat/completions`

If you enter a URL ending in `/v1`, KForge will normalize it for you.

---

## How to configure Custom in KForge

1. Select **Custom Endpoint (OpenAI-compatible)** as the provider
2. Open **Settings**
3. Enter:
   - **API Key**: your provider’s API key
   - **Endpoint URL**: base URL (no `/v1`)
4. Save settings
5. Add or select a **model ID** supported by your endpoint

That’s it.

---

## Suggested endpoints and starter models (examples only)

These are **examples, not guarantees**.

Availability, pricing, limits, and free tiers may change at any time depending on the provider.
Use them as a starting point, then adjust based on your actual account and provider docs.

---

### OpenRouter

**Endpoint:**

- `https://openrouter.ai/api`

**Example models:**

- `openrouter/free` — Free / Sandbox
- provider-specific `:free` models — volatile; check current OpenRouter listings

**Notes:**

- the simplest free starting point is `openrouter/free`
- individual `:free` model IDs rotate frequently
- rate limits and availability can change

---

### Groq

**Endpoint:**

- `https://api.groq.com/openai`

**Example models:**

- `llama-3.1-8b-instant` — Sandbox
- `llama-3.3-70b-versatile` — Main

**Notes:**

- very fast inference
- pricing and free-plan limits depend on your Groq account
- check current Groq docs for latest supported IDs

---

### DeepSeek

**Endpoint:**

- `https://api.deepseek.com`

**Example models:**

- `deepseek-chat` — Low-cost paid / Sandbox
- `deepseek-reasoner` — Paid / Main

**Notes:**

- DeepSeek API models are billed
- reasoning mode is slower but stronger
- check current pricing and limits before heavy usage

---

### Mistral

**Endpoint:**

- `https://api.mistral.ai`

**Example models:**

- `mistral-small-latest` — Sandbox / Main
- `codestral-latest` — Main (coding-focused)

**Notes:**

- requires API key
- exact aliases and enabled models may vary over time
- check the provider’s current model list when updating presets

---

## Cost labels and usage modes (important)

KForge uses two separate ideas:

### Cost labels

- **Free**
  - no billing required on that route / tier
- **Paid (low cost)**
  - cheap paid usage
- **Paid (standard)**
  - normal day-to-day paid usage
- **Paid (expensive)**
  - premium or heavier-cost usage
- **Unknown**
  - pricing unclear or provider-dependent

### Usage modes

- **Sandbox**
  - cheap, disposable, or experimental work
- **Main**
  - daily-driver models
- **Heavy**
  - expensive or high-capability models; use sparingly

For Custom endpoints, **you are the source of truth**.
KForge provides organisational hints, not guarantees.

---

## Why Custom matters

Custom exists so that:

- you are never blocked by missing integrations
- you can use private, enterprise, or self-hosted endpoints
- KForge survives provider churn
- advanced users are not limited by UI assumptions

Many tools hard-code providers.
KForge deliberately does not.

---

## When should I use Custom?

Use Custom if:

- your provider is not listed in KForge
- you run your own OpenAI-compatible server
- you want full control over models and endpoints
- you understand your provider’s pricing and limits

If you want “plug-and-play”, use a built-in provider instead.

---

## Final note

Custom is powerful by design.

With power comes responsibility — **and flexibility**.

That trade-off is intentional.