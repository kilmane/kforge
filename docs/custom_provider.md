[← Docs home](index.md)

---

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

## One Custom provider slot

KForge currently has **one Custom provider slot**.

That means the Custom provider stores one active setup at a time:

* one Custom API key
* one Custom endpoint URL
* one saved Custom model list

If you change the Custom endpoint or API key, you are replacing the current Custom provider setup.

Important:

* saved model IDs may remain under **My Models**
* those model IDs will be sent to the newly configured Custom endpoint
* if the new endpoint does not support the old model IDs, requests may fail

After changing the Custom endpoint, remove any old model IDs that belonged to the previous provider.

Example:

If Custom was using Moonshot/Kimi with `kimi-k2.6`, and you later change Custom to another OpenAI-compatible endpoint, remove `kimi-k2.6` unless the new endpoint supports it.

KForge may add richer Custom profiles in the future if there is a clear need, but the current design keeps Custom simple: one advanced endpoint slot at a time.

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

## Suggested endpoint types and starter examples

These are **examples, not guarantees**.

The Custom provider is mainly for endpoints that are **not already built into KForge**.

If a provider already appears in KForge, prefer the built-in provider first. Built-in providers usually have clearer labels, safer defaults, and better beginner guidance.

Use Custom when you are connecting something more advanced or specific to your setup.

---

### Private or company AI gateways

Use Custom if your workplace, team, or organisation gives you an OpenAI-compatible endpoint.

Example endpoint shapes:

* `https://ai.your-company.example`
* `https://gateway.your-team.example`
* `https://llm.internal.example`

Example model IDs:

* `company/default`
* `company/coder`
* `team-main`
* whatever model ID your gateway documents

Notes:

* KForge cannot know the pricing, limits, or model list for private gateways
* your organisation is the source of truth
* ask your admin for the correct endpoint, API key, and model ID

---

### Self-hosted OpenAI-compatible servers

Use Custom if you run your own OpenAI-compatible model server.

Common self-hosted setups may include OpenAI-compatible servers powered by tools such as vLLM, LocalAI, llama.cpp server, LiteLLM, or other gateway software.

Example endpoint shapes:

* `http://localhost:8000`
* `http://192.168.1.50:8000`
* `https://your-server.example`

Example model IDs:

* `local-model`
* `qwen-coder`
* `llama-local`
* whatever your server exposes

Notes:

* your server must support `POST /v1/chat/completions`
* your endpoint should be entered as the base URL, without `/v1`
* KForge’s Custom provider expects a Bearer-token style API key. If your server has no authentication, you may need to configure your server or proxy to accept the key KForge sends.

---

### Hosted GPU or rented server endpoints

Use Custom if you rent GPU infrastructure and expose an OpenAI-compatible endpoint from it.

Example endpoint shapes:

* `https://your-instance.example`
* `https://your-gpu-host.example`
* a temporary HTTPS endpoint from your hosting provider

Example model IDs:

* `served-model`
* `coder-main`
* `instruct-model`
* whatever your hosted server exposes

Notes:

* endpoint URLs may change when instances are recreated
* pricing depends on the GPU host, not KForge
* model IDs depend on the server image or framework you deploy

---

### Proxy or routing layers

Use Custom if you run a proxy layer that presents one OpenAI-compatible endpoint to KForge.

This can be useful when you want one endpoint to route requests behind the scenes.

Example endpoint shapes:

* `http://localhost:4000`
* `https://llm-router.example`
* `https://proxy.your-team.example`

Example model IDs:

* `router/default`
* `router/coding`
* `fallback-main`
* whatever your proxy expects

Notes:

* KForge sends the model ID you choose
* the proxy decides what happens behind that endpoint
* pricing, fallback behavior, logging, and privacy depend on your proxy setup

---

### New OpenAI-compatible providers not yet built into KForge

Use Custom when a new provider supports OpenAI-compatible chat completions but KForge does not yet have a first-class provider for it.

Before using it, check the provider’s own documentation for:

* base URL
* API key format
* model IDs
* pricing
* rate limits
* whether `/v1/chat/completions` is supported

If that provider later becomes first-class in KForge, prefer the built-in provider unless you specifically need custom routing.

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
---

[← Docs home](index.md)