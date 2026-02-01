# Presets Inventory

This document is a snapshot of the current built-in model presets in KForge.
It reflects the state at the time of Phase 3.12 and is intended as a reference
for documentation, maintenance, and future remote presets work.

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
| claude-opus-4-5 | 🔴 Paid | Heavy | Highest capability; use sparingly |
| claude-sonnet-4-5 | 🟡 Paid | Main | Balanced default for dev + writing |
| claude-haiku-4-5 | 🟢 Paid | Sandbox | Cheap + fast; small tasks |

✅ No free Claude — consistent with provider pricing.

---

## Custom (OpenAI-compatible endpoints)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| deepseek-chat | 🔵 Free | Sandbox | Provider-dependent |
| llama-3.1-8b-instant | 🔵 Free | Sandbox | Provider-dependent |
| mistral-medium-latest | 🟡 Paid | Main | Paid workhorse |
| mistral-small-latest | 🟢 Paid | Sandbox | Low-cost paid |
| openai/gpt-4o-mini | 🟢 Paid | Sandbox | Cheap paid default |

⚪ “Free” here is endpoint-dependent and not guaranteed.

---

## DeepSeek

| Model | Cost | Usage | Notes |
|---|---|---|---|
| deepseek-reasoner | 🟡 Paid | Main | Stronger reasoning; slower/costlier |
| deepseek-chat | 🟢 Paid | Sandbox | Cheap general chat |

---

## Gemini (preview-heavy)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| gemini-3-pro-preview | 🔴 Paid | Heavy | Preview; high capability |
| gemini-2.5-pro | 🟡 Paid | Main | Strong reasoning |
| gemini-3-flash-preview | 🟡 Paid | Main | Preview; may change |
| gemini-2.5-flash | 🟢 Paid | Sandbox | Fast |
| gemini-2.5-flash-lite | 🟢 Paid | Sandbox | Fast + cheap |

⚠ Preview models are subject to change or removal.

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

\* Paid refers to local hardware/energy cost, not API billing.

---

## OpenAI

| Model | Cost | Usage | Notes |
|---|---|---|---|
| gpt-4.1-mini | 🟡 Paid | Main | Day-to-day |
| gpt-5-mini | 🟢 Paid | Sandbox | Cheap paid testing |

---

## OpenRouter (highly volatile)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| meta-llama/llama-3.3-70b-instruct:free | 🔵 Free | Sandbox | Rotating / rate-limited |
| mistralai/devstral-2512:free | 🔵 Free | Sandbox | Rotating |
| qwen/qwen3-coder:free | 🔵 Free | Sandbox | Availability may change |
| xiaomi/mimo-v2-flash:free | 🔵 Free | Sandbox | Availability may change |

⚠ OpenRouter free models are not guaranteed and may disappear without notice.

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
- OpenRouter `:free` models
- Gemini `*-preview` models

Medium risk:
- OpenAI model naming changes
- Groq LLaMA version bumps

Low risk:
- Claude family
- Hosted Mistral stable tags
- Local Ollama models
