[← Docs home](index.md)

---

# Presets Inventory

_Last reviewed: 22/07/2026_

This document is a snapshot of the current recommended model presets in KForge.
It is intended as a readable maintenance reference.

Important:
- this file is documentation
- it is not, by itself, proof of the current machine source
- when presets change materially, the actual machine source should be checked and updated in the same pass

Review basis for this snapshot:
- [OpenAI models](https://developers.openai.com/api/docs/models)
- [Claude models](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Gemini models](https://ai.google.dev/gemini-api/docs/models) and [deprecations](https://ai.google.dev/gemini-api/docs/deprecations)
- [DeepSeek API models](https://api-docs.deepseek.com/)
- [Groq supported models](https://console.groq.com/docs/models) and [deprecations](https://console.groq.com/docs/deprecations)
- [Mistral models](https://docs.mistral.ai/models/overview)
- [Ollama model library](https://ollama.com/library)

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
| claude-fable-5 | 🔴 Paid | High capability | Anthropic's highest-capability widely available model |
| claude-opus-4-8 | 🔴 Paid | High capability | Complex agentic coding and enterprise work |
| claude-sonnet-5 | 🟡 Paid | Recommended builder | Current balanced option for speed and intelligence |
| claude-haiku-4-5 | 🟢 Paid | Light / Everyday | Fast lightweight option for small guarded tasks |

✅ No free Claude — consistent with provider pricing.

---

## Custom (OpenAI-compatible endpoints)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| openrouter/free | 🔵 Free | Weak / test only | Router that selects currently available OpenRouter free models |
| deepseek-v4-flash | ⚪ Unknown | Custom / unverified | Endpoint-dependent; paid on DeepSeek API |
| openai/gpt-oss-20b | ⚪ Unknown | Custom / unverified | Endpoint-dependent |
| mistral-small-latest | ⚪ Unknown | Custom / unverified | Endpoint-dependent |
| devstral-small-latest | ⚪ Unknown | Custom / unverified | Endpoint-dependent agentic coding model |

⚪ Custom pricing depends on the exact endpoint you connect, not on KForge itself.

---

## DeepSeek

| Model | Cost | Usage | Notes |
|---|---|---|---|
| deepseek-v4-pro | 🟡 Paid | Recommended builder | Stronger DeepSeek V4 option for reasoning and agentic work |
| deepseek-v4-flash | 🟢 Paid | Light / Everyday | Fast DeepSeek V4 option for general chat and coding |

⚠ The legacy `deepseek-chat` and `deepseek-reasoner` aliases retire on 24 July 2026 and are no longer KForge presets.

---

## Gemini (active + preview mix)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| gemini-3.1-pro-preview | 🔴 Paid | High capability | High capability preview model; availability may change |
| gemini-3.6-flash | 🟡 Paid | Recommended builder | Current stable Flash model for coding and agentic execution |
| gemini-3.5-flash-lite | 🟢 Paid | Light / Everyday | Current low-latency option for guarded iterations |

⚠ Google currently offers free-tier access for several Gemini API models, but labels here remain conservative KForge guidance rather than an exhaustive pricing promise for every account tier.

---

## Groq

| Model | Cost | Usage | Notes |
|---|---|---|---|
| openai/gpt-oss-120b | 🟡 Paid | Recommended builder | Larger Groq production option for stronger reasoning and coding |
| openai/gpt-oss-20b | 🟢 Paid | Light / Everyday | Fast lower-cost Groq production option |

⚠ Groq announced the previous Llama 3.1 8B and Llama 3.3 70B presets as deprecated in June 2026.

---

## Mistral (Hosted)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| devstral-small-latest | 🟡 Paid | Recommended builder | Agentic coding-focused model |
| mistral-small-latest | 🟢 Paid | Light / Everyday | General starter |

⚠ Exact hosted model aliases can evolve. Re-check provider docs when updating presets.

---

## Ollama (Local)

| Model | Cost | Usage | Notes |
|---|---|---|---|
| gpt-oss:20b | 🔴 Paid* | High capability | Local reasoning and agentic model; substantial memory required |
| devstral-small-2 | 🟡 Paid* | Recommended builder | Agentic coding; requires Ollama 0.13.3 or later |
| qwen2.5-coder:7b | 🟡 Paid* | Recommended builder | Local |
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
| gpt-5.6-sol | 🔴 Paid | High capability | Frontier model for complex professional and coding work |
| gpt-5.6-terra | 🟡 Paid | Recommended builder | Balanced GPT-5.6 default for day-to-day development |
| gpt-5.6-luna | 🟢 Paid | Light / Everyday | Cost-sensitive GPT-5.6 option for guarded quick checks |

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
| deepseek-v4-flash | Custom, DeepSeek |
| openai/gpt-oss-20b | Custom, Groq |
| mistral-small-latest | Custom, Mistral |
| devstral-small-latest | Custom, Mistral |

Overlaps are intentional and reflect different tradeoffs (cost, routing, availability, privacy).

---

## Volatility Watchlist

High risk:
- OpenRouter free routing and individual `:free` models
- Gemini `*-preview` models

Medium risk:
- OpenAI and Claude family refreshes
- Groq and DeepSeek model family refreshes

Low risk:
- Current stable OpenAI, Gemini, and Ollama IDs
- Hosted Mistral `*-latest` aliases
- Local Ollama models
---

[← Docs home](index.md)
