[← Docs home](index.md)

---

# Presets Inventory

_Last reviewed: 22/05/2026_

This document is a snapshot of the current recommended model presets in KForge.
It is intended as a readable maintenance reference.

Important:
- this file is documentation
- it is not, by itself, proof of the current machine source
- when presets change materially, the actual machine source should be checked and updated in the same pass

Cost is represented by color labels, and usage is represented separately.

Legend:
- 🔵 Free
- 🟢 Paid
- 🟡 Paid
- 🔴 Paid
- ⚪ Unknown

Usage:
- Light / Everyday — light work, careful edits, quick iterations
- Recommended builder — default day-to-day project work
- High capability — stronger option for complex or critical tasks; use carefully

---

## Claude

| Model | Cost | Usage | Notes |
|---|---|---|---|
| claude-opus-4-7 | 🔴 Paid | High capability | High capability option for harder reasoning/coding tasks |
| claude-sonnet-4-6 | 🟡 Paid | Recommended builder | Balanced default for dev + writing |
| claude-haiku-4-5 | 🟢 Paid | Light / Everyday | Fast lightweight option for small guarded tasks |

✅ No free Claude — consistent with provider pricing.

---

## Custom (OpenAI-compatible endpoints)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| openrouter/free | 🔵 Free | Weak / test only | Router that selects currently available OpenRouter free models |
| deepseek-chat | ⚪ Unknown | Custom / unverified | Endpoint-dependent; paid on DeepSeek API |
| llama-3.1-8b-instant | ⚪ Unknown | Custom / unverified | Endpoint-dependent |
| mistral-small-latest | ⚪ Unknown | Custom / unverified | Endpoint-dependent |
| codestral-latest | ⚪ Unknown | Custom / unverified | Endpoint-dependent |

⚪ Custom pricing depends on the exact endpoint you connect, not on KForge itself.

---

## DeepSeek

| Model | Cost | Usage | Notes |
|---|---|---|---|
| deepseek-reasoner | 🟡 Paid | Recommended builder | Stronger reasoning; slower/costlier |
| deepseek-chat | 🟢 Paid | Light / Everyday | Lightweight general chat |

---

## Gemini (active + preview mix)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| gemini-3.1-pro-preview | 🔴 Paid | High capability | High capability preview model; availability may change |
| gemini-2.5-pro | 🟡 Paid | Recommended builder | Strong reasoning; older than Gemini 3.1 Pro Preview |
| gemini-3-flash-preview | 🟡 Paid | Recommended builder | Preview; may change quickly |
| gemini-2.5-flash | 🟢 Paid | Light / Everyday | Fast |
| gemini-2.5-flash-lite | 🟢 Paid | Light / Everyday | Fast lightweight option |

⚠ Google currently offers free-tier access for several Gemini API models, but labels here remain conservative KForge guidance rather than an exhaustive pricing promise for every account tier.

---

## Groq

| Model | Cost | Usage | Notes |
|---|---|---|---|
| llama-3.3-70b-versatile | 🟡 Paid | Recommended builder | Large Groq-hosted option; designed for fast inference |
| llama-3.1-8b-instant | 🟢 Paid | Light / Everyday | Very fast |

---

## Mistral (Hosted)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| codestral-latest | 🟡 Paid | Recommended builder | Coding-focused |
| mistral-small-latest | 🟢 Paid | Light / Everyday | General starter |

⚠ Exact hosted model aliases can evolve. Re-check provider docs when updating presets.

---

## Ollama (Local)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| codellama:13b | 🔴 Paid* | High capability | Local compute cost |
| deepseek-coder:6.7b | 🟡 Paid* | Recommended builder | Local |
| llama3.1:8b | 🟡 Paid* | Recommended builder | Local default |
| qwen2.5-coder:7b | 🟡 Paid* | Recommended builder | Local |
| mistral:7b | 🟢 Paid* | Light / Everyday | Fast |
| qwen2.5-coder:1.5b | 🟢 Paid* | Light / Everyday | Very fast |

\* Paid refers to local hardware / energy cost, not API billing.

---

## Ollama Cloud

No compiled presets are currently listed for **Ollama Cloud**.

In the current app, Ollama Cloud should be treated as a manual model-ID provider. Enter the model ID supported by Ollama Cloud directly in KForge.

Example starter model ID:

| Model | Cost | Usage | Notes |
|---|---|---|---|
| gpt-oss:120b | ⚪ Unknown | Custom / unverified | Direct Ollama Cloud model ID example; verify availability in Ollama Cloud |

⚠ Ollama Cloud availability, pricing, and model IDs may change. Re-check Ollama's current cloud model list before adding compiled presets.

---

## OpenAI

| Model | Cost | Usage | Notes |
|---|---|---|---|
| gpt-5.4 | 🔴 Paid | High capability | Frontier model for complex coding and reasoning |
| gpt-5.4-mini | 🟡 Paid | Recommended builder | Balanced default for day-to-day dev + general work |
| gpt-5.4-nano | 🟢 Paid | Light / Everyday | Lightweight GPT-5.4-class option |

---

## OpenRouter (highly volatile)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| openrouter/free | 🔵 Free | Weak / test only | Router that selects from currently available free models |

⚠ OpenRouter free availability is not guaranteed and may change without notice.

---

## Duplicate Models (Intentional Overlap)

| Model | Providers |
|---|---|
| deepseek-chat | Custom, DeepSeek |
| llama-3.1-8b-instant | Custom, Groq |
| mistral-small-latest | Custom, Mistral |

Overlaps are intentional and reflect different tradeoffs (cost, routing, availability, privacy).

---

## Volatility Watchlist

High risk:
- OpenRouter free routing and individual `:free` models
- Gemini `*-preview` models

Medium risk:
- OpenAI naming shifts
- Groq model family refreshes

Low risk:
- Claude current family
- Hosted Mistral stable aliases
- Local Ollama models
---

[← Docs home](index.md)