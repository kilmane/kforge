# Presets Inventory

_Last reviewed: 19/04/2026_

This document is a snapshot of the current recommended model presets in KForge.
It is intended as a readable maintenance reference.

Important:
- this file is documentation
- it is not, by itself, proof of the current machine source
- when presets change materially, the actual machine source should be checked and updated in the same pass

Cost is represented by color labels, and usage is represented separately.

Legend:
- 🔵 Free
- 🟢 Paid (low cost)
- 🟡 Paid (standard)
- 🔴 Paid (expensive)
- ⚪ Unknown

Usage:
- Sandbox — testing, quick iterations
- Main — default day-to-day use
- Heavy — high capability; use sparingly

---

## Claude

| Model | Cost | Usage | Notes |
|---|---|---|---|
| claude-opus-4-7 | 🔴 Paid | Heavy | Highest capability; use sparingly |
| claude-sonnet-4-6 | 🟡 Paid | Main | Balanced default for dev + writing |
| claude-haiku-4-5 | 🟢 Paid | Sandbox | Cheap + fast; small tasks |

✅ No free Claude — consistent with provider pricing.

---

## Custom (OpenAI-compatible endpoints)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| openrouter/free | 🔵 Free | Sandbox | Router that selects currently available OpenRouter free models |
| deepseek-chat | ⚪ Unknown | Sandbox | Endpoint-dependent; paid on DeepSeek API |
| llama-3.1-8b-instant | ⚪ Unknown | Sandbox | Endpoint-dependent |
| mistral-small-latest | ⚪ Unknown | Sandbox | Endpoint-dependent |
| codestral-latest | ⚪ Unknown | Main | Endpoint-dependent |

⚪ Custom pricing depends on the exact endpoint you connect, not on KForge itself.

---

## DeepSeek

| Model | Cost | Usage | Notes |
|---|---|---|---|
| deepseek-reasoner | 🟡 Paid | Main | Stronger reasoning; slower/costlier |
| deepseek-chat | 🟢 Paid | Sandbox | Cheap general chat |

---

## Gemini (active + preview mix)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| gemini-3.1-pro-preview | 🔴 Paid | Heavy | Current high-capability preview model |
| gemini-2.5-pro | 🟡 Paid | Main | Strong reasoning; older than Gemini 3.1 Pro Preview |
| gemini-3-flash-preview | 🟡 Paid | Main | Preview; may change quickly |
| gemini-2.5-flash | 🟢 Paid | Sandbox | Fast |
| gemini-2.5-flash-lite | 🟢 Paid | Sandbox | Fast + cheap |

⚠ Google currently offers free-tier access for several Gemini API models, but labels here remain conservative KForge guidance rather than an exhaustive pricing promise for every account tier.

---

## Groq

| Model | Cost | Usage | Notes |
|---|---|---|---|
| llama-3.3-70b-versatile | 🟡 Paid | Main | Large + fast |
| llama-3.1-8b-instant | 🟢 Paid | Sandbox | Very fast |

---

## Mistral (Hosted)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| codestral-latest | 🟡 Paid | Main | Coding-focused |
| mistral-small-latest | 🟢 Paid | Sandbox | General starter |

⚠ Exact hosted model aliases can evolve. Re-check provider docs when updating presets.

---

## Ollama (Local)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| codellama:13b | 🔴 Paid* | Heavy | Local compute cost |
| deepseek-coder:6.7b | 🟡 Paid* | Main | Local |
| llama3.1:8b | 🟡 Paid* | Main | Local default |
| qwen2.5-coder:7b | 🟡 Paid* | Main | Local |
| mistral:7b | 🟢 Paid* | Sandbox | Fast |
| qwen2.5-coder:1.5b | 🟢 Paid* | Sandbox | Very fast |

\* Paid refers to local hardware / energy cost, not API billing.

---

## OpenAI

| Model | Cost | Usage | Notes |
|---|---|---|---|
| gpt-5.4 | 🔴 Paid | Heavy | Frontier model for complex coding and reasoning |
| gpt-5.4-mini | 🟡 Paid | Main | Default lower-latency workhorse |
| gpt-5.4-nano | 🟢 Paid | Sandbox | Cheapest GPT-5.4-class option |

---

## OpenRouter (highly volatile)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| openrouter/free | 🔵 Free | Sandbox | Router that selects from currently available free models |

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