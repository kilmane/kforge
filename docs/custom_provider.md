# Custom Provider (OpenAI-compatible Endpoints)

_Last updated: 28/01/2026_

---

## What is the Custom provider?

The **Custom provider** lets you connect **any OpenAI-compatible API endpoint** to KForge.

If your provider supports:

- `POST /v1/chat/completions`
- `Authorization: Bearer <API_KEY>`

Then it will work with Custom.

This makes KForge **future-proof and vendor-agnostic**:

- You are not locked into specific providers
- You can use new providers immediately
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

## Suggested models (examples only)

These are **suggestions, not presets**.

Availability, pricing, and limits may change at any time depending on the provider.
Use them as a starting point, then adjust based on your usage.

---

### OpenRouter

**Endpoint:**

- `https://openrouter.ai/api`

**Example models:**

- `llama-3.1-8b-instant` — Free / Sandbox
- `openai/gpt-4o-mini` — Paid / Main

**Notes:**

- Free models may rotate or be deprecated
- Rate limits can apply

---

### Groq

**Endpoint:**

- `https://api.groq.com/openai`

**Example models:**

- `llama-3.1-8b-instant` — Free
- `llama-3.3-70b-versatile` — Main

**Notes:**

- Extremely fast inference
- Pricing depends on your Groq account

---

### DeepSeek

**Endpoint:**

- `https://api.deepseek.com`

**Example models:**

- `deepseek-chat` — Free
- `deepseek-reasoner` — Main

**Notes:**

- Free tier may have limits
- Reasoner is slower but stronger

---

### Mistral

**Endpoint:**

- `https://api.mistral.ai`

**Example models:**

- `mistral-small-latest` — Sandbox / Main
- `codestral-latest` — Main (coding-focused)

**Notes:**

- Requires API key
- Free evaluation tiers may be limited

---

## Model tags and usage modes (important)

Model tags in KForge are **organizational hints**, not guarantees.

They reflect how *you* intend to use the model — not what the provider promises.

### Suggested interpretation

- **Sandbox**
  - Cheap or free models
  - Safe for iteration and experimentation

- **Free**
  - No billing required
  - Often rate-limited or restricted

- **Main**
  - Daily-driver models
  - Reasonable cost and capability

- **Heavy**
  - Expensive or high-capability models
  - Use sparingly

- **Unknown**
  - Pricing or limits unclear
  - Check provider documentation

For Custom endpoints, **you are the source of truth**.

---

## Why Custom matters

Custom exists so that:

- You are never blocked by missing integrations
- You can use private, enterprise, or self-hosted endpoints
- KForge survives provider churn
- Advanced users are not limited by UI assumptions

Many tools hard-code providers.
KForge deliberately does not.

---

## When should I use Custom?

Use Custom if:

- your provider is not listed in KForge
- you run your own OpenAI-compatible server (vLLM, TGI, gateways)
- you want full control over models and endpoints
- you understand your provider’s pricing and limits

If you want “plug-and-play”, use a built-in provider instead.

---

## Final note

Custom is powerful by design.

With power comes responsibility — **and flexibility**.

That trade-off is intentional.