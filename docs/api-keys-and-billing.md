# API Keys & Billing Guide

_Last updated: 28 April 2026_

This page helps you find the API key pages for the AI providers supported by **KForge**.

KForge does not sell AI models or manage provider billing. Each provider controls its own pricing, free tiers, rate limits, and account rules.

> [!IMPORTANT]
> Provider pricing and free tiers change often.  
> Treat this page as a friendly starting guide, not a permanent pricing promise.  
> Always check the provider’s own billing page before spending money.

---

## Quick summary

| Provider | API key needed in KForge? | Billing note |
|---|---|---|
| Claude / Anthropic | Yes | Usually needs API billing or credit |
| DeepSeek | Yes | Token billing; offers may change |
| Gemini | Yes | Free tier available, billing for higher tiers |
| Groq | Yes | Free tier available with limits |
| OpenAI | Yes | Usually needs prepaid API credit |
| Mistral | Yes | Free Experiment plan available |
| OpenRouter | Yes | Free routes exist, paid credit for paid models |
| Ollama local | No | Runs locally |
| Ollama direct cloud API | Yes | Direct cloud API needs an Ollama API key |
| LM Studio local | No by default | Local server, optional auth token |


---

## 1. Claude / Anthropic

Claude models are provided by **Anthropic**.

### API key page

https://platform.claude.com/settings/keys

### Billing required?

Usually, yes.

Claude API usage is separate from a normal Claude chat subscription. You need an Anthropic Console API key and enough API billing access or credit for requests to work.

### KForge note

Use this provider when selecting Claude models directly through Anthropic.

Having access to Claude in a browser does not automatically mean your Anthropic API key has billing enabled.

---

## 2. DeepSeek

DeepSeek provides its own cloud API and is also commonly available through OpenAI-compatible routes.

### API key page


https://platform.deepseek.com/api_keys


### Billing required?

DeepSeek API usage is billed by token usage.

New account offers, free credits, trial tokens, and promotions can change. Do not rely on a fixed “free forever” allowance unless the DeepSeek console currently confirms it for your account.

### KForge note

DeepSeek’s API is OpenAI-compatible, so it usually fits well with coding tools and OpenAI-style clients.

---

## 3. Gemini / Google AI Studio

Gemini models are provided by Google.

### API key page


https://aistudio.google.com/api-keys


### Billing required?

Not always.

Gemini API usually has a free tier for experimentation, but rate limits apply. Billing is needed for paid tiers, higher limits, or production-style usage.

### KForge note

Gemini can be a good option for testing and experimentation.

Check Google AI Studio’s current limits before relying on it heavily.

---

## 4. Groq

Groq provides fast hosted inference through GroqCloud.

### API key page


https://console.groq.com/keys


### Billing required?

Not always.

GroqCloud has a free tier with rate limits. You can create API keys and use supported models within those limits. Paid usage may be needed for higher limits or production use.

### KForge note

Groq is often useful when speed matters.

Model availability and free-tier limits can change, so treat it as a fast and useful route, not a guaranteed unlimited free service.

---

## 5. OpenAI

OpenAI provides GPT models through the OpenAI API.

### API key page


https://platform.openai.com/api-keys


### Billing page


https://platform.openai.com/settings/organization/billing/overview


### Billing required?

Usually, yes.

OpenAI API billing is separate from ChatGPT subscriptions. Having ChatGPT Plus, Pro, or another ChatGPT plan does not automatically mean your OpenAI API key has API credit.

OpenAI API usage normally requires billing or prepaid API credit.

### KForge note

If KForge says quota or billing failed, check your OpenAI platform billing page.

A working OpenAI API key still needs available API credit to make requests.

---

## 6. Mistral

Mistral provides models through la Plateforme.

### API key page


https://console.mistral.ai/api-keys


### Billing required?

Not necessarily for testing.

Mistral provides an Experiment plan for API access, intended for experimentation, prototyping, and evaluation. Paid plans or billing may be needed for heavier use.

### KForge note

Mistral is a useful direct cloud provider to try.

Check the current plan, model availability, and rate limits in the Mistral console.

---

## 7. OpenRouter

OpenRouter is an OpenAI-compatible gateway that can route to many different models.

### API key page


https://openrouter.ai/workspaces/default/keys


### Billing required?

Not always.

OpenRouter has free model routes, usually with request limits. Free model IDs often include:


:free


Paid models require credit.

### KForge note

OpenRouter is useful because it gives access to many models through one OpenAI-compatible endpoint.

Free routes can rotate, disappear, or become rate-limited. They are best treated as experimental.

---

## 8. Ollama

KForge now treats Ollama as two separate provider choices:

* **Ollama endpoint**
* **Ollama Cloud**

This split is intentional because local/endpoint Ollama access and direct Ollama Cloud API access work differently.

### Ollama endpoint

Use **Ollama endpoint** when KForge should connect to an Ollama server endpoint.

Common examples:

* the local Ollama app on your computer
* a remote or self-hosted Ollama endpoint
* Ollama cloud models accessed through the local Ollama app after signing in

For normal local Ollama use, no API key is required in KForge.

Ollama usually runs locally at:

http://localhost:11434

If you use Ollama cloud models through the local Ollama app, you may sign in through your system terminal:

```powershell
ollama signin
```

In that setup, KForge may still connect to the local Ollama endpoint and does not need an Ollama API key inside KForge.


### Ollama Cloud

Use **Ollama Cloud** when KForge should connect directly to Ollama’s hosted cloud API.

This does **not** require the local Ollama app to be running.

Direct Ollama Cloud API access requires an Ollama API key.

### API key page

```text
https://ollama.com/settings/keys
```

### KForge note

Choose the provider based on the route you want:

Ollama endpoint
API key: not required in KForge
Purpose: local Ollama, remote/self-hosted Ollama endpoint, or local app cloud access after `ollama signin`

Ollama Cloud
API key: required
Purpose: direct ollama.com cloud API access, no local Ollama app required


## 9. LM Studio

LM Studio runs models locally on your computer and can expose an OpenAI-compatible local server.

### Local LM Studio

For normal KForge use with local LM Studio, no API key is required by default.

LM Studio usually runs locally at:

http://localhost:1234


### Billing required?

No cloud billing is required for local models.

The cost is your own computer hardware, electricity, and time.

### Advanced note

LM Studio can optionally enable API-token authentication in its server settings. If that is enabled, an API token may be needed.

For normal beginner/local use, authentication is off by default.

### KForge note

API Key — not required by default


---

## Safety tips

Never share your full API key with anyone.

Do not paste API keys into public GitHub repositories, screenshots, support chats, or public documents.

If a key is leaked, delete or rotate it immediately in the provider’s console.

Start with small credit amounts when testing paid APIs.

Use KForge’s model labels to avoid accidentally using expensive models for simple tasks.

---

## Troubleshooting

If a provider is configured in KForge but requests still fail, common causes include:

* missing billing or credit
* rate limits
* wrong model ID
* invalid or expired API key
* wrong endpoint URL for custom providers
* local runtime not running
* local runtime running on a different port
* direct cloud API being confused with a local endpoint

For paid providers, test with a small request first.

For local providers, make sure the local app or server is running before testing the connection.

---

## KForge model label reminder

KForge model labels are guidance, not enforcement.

| Label             | Meaning                       | Typical use                 |
| ----------------- | ----------------------------- | --------------------------- |
| 🔵 Free — Sandbox | Free or no-billing route      | Testing and experimentation |
| 🟢 Paid — Sandbox | Low-cost paid model           | Testing and light work      |
| 🟡 Paid — Main    | Mid-cost paid model           | Default development work    |
| 🔴 Paid — Heavy   | Higher-cost model             | Complex or critical tasks   |
| ⚪ Unknown         | Provider-dependent or unclear | Check before using heavily  |

---

## Final note

KForge gives you control over providers and models.

It does not guarantee pricing, free access, limits, or availability. Providers can change their models, billing rules, free tiers, and API behaviour at any time.

When in doubt, check the provider’s own dashboard first.

````
