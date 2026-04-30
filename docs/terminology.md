[← Docs home](index.md)

---

# KForge Terminology

This page explains common KForge words used around AI providers, models, presets, labels, API keys, and endpoints.

The goal is simple: help you understand what KForge is asking you to choose or configure.

---

## Provider

A **provider** is the service, company, local runtime, or endpoint that powers KForge chat.

Examples include:

* OpenAI
* Gemini
* Claude
* DeepSeek
* Groq
* Mistral
* OpenRouter
* Ollama endpoint
* Ollama Cloud
* LM Studio
* Custom Endpoint

A provider answers the question:

**Where is the AI request being sent?**

---

## Model

A **model** is the specific AI model you choose inside a provider.

Examples:

* `gpt-5.4-mini`
* `claude-sonnet-4-6`
* `mistral-small-latest`
* `gpt-oss:120b`
* `kimi-k2.6`

A model answers the question:

**Which AI brain should this provider use?**

---

## Model ID

A **model ID** is the exact text the provider expects.

KForge sends the model ID to the provider.

That means model IDs should be entered exactly as the provider documents them.

Examples:

* `gpt-oss:120b`
* `deepseek-chat`
* `mistral-small-latest`
* `openai/gpt-4o-mini`

KForge does not invent or rewrite provider model IDs.

---

## Presets

**Presets** are KForge’s suggested starting models for a provider.

They are meant to reduce decision fatigue.

Presets are not a complete list of every model available from a provider.

A provider may support more models than KForge shows by default.

---

## My Models

**My Models** are model IDs you add yourself.

Use My Models when:

* the provider supports a model that is not in KForge’s presets
* you are using a Custom Endpoint
* you are using a manual model-ID provider such as Ollama Cloud
* you want to keep your own preferred model list

My Models are saved per provider.

That means a model you save for Ollama Cloud does not automatically appear under OpenAI, Mistral, or another provider.

---

## Labels

KForge may show labels beside models to help you choose.

Labels are guidance only.

They do not change billing, provider behavior, or model capability.

Common label ideas include:

* cost
* usage
* notes

---

## Cost labels

Cost labels are a quick reminder about likely cost.

Examples:

* 🔵 **Free** — no direct charge expected on that route, but limits may apply
* 🟢 **Paid / Sandbox** — low-cost paid use or safe testing
* 🟡 **Paid / Main** — normal day-to-day paid use
* 🔴 **Paid / Heavy** — expensive, large, or high-capability use
* ⚪ **Unknown** — pricing is unclear, provider-dependent, or account-dependent

Cost labels are advisory.

Always check the provider’s own pricing page before spending money.

---

## Usage labels

Usage labels describe how a model is intended to be used.

Examples:

* **Sandbox** — testing, quick experiments, low-risk prompts
* **Main** — normal day-to-day work
* **Heavy** — large, expensive, slow, or high-capability tasks

A Heavy label does not block you from using a model.

It is only a reminder to use it carefully.

---

## Notes

Notes are short explanations shown with some model suggestions or documentation.

They may explain things such as:

* the model is good for coding
* the model is a cheap starter option
* availability may change
* pricing depends on the provider
* the model is best used sparingly

Notes are not error messages.

They are human-readable guidance.

---

## API key

An **API key** is a secret token from a provider.

KForge uses it to authenticate with that provider.

Examples:

* OpenAI API key
* Claude / Anthropic API key
* Mistral API key
* Ollama Cloud API key

API keys belong in **Settings**, not in the main chat.

KForge stores provider API keys through the operating system keychain.

---

## Endpoint

An **endpoint** is the base URL KForge connects to.

Examples:

* `http://localhost:11434`
* `http://localhost:1234`
* `https://api.openai-compatible-provider.example`

Some providers have a fixed endpoint built into KForge.

Some providers let you configure an endpoint yourself.

For example:

* **Ollama endpoint** can use the local Ollama app or another Ollama server endpoint
* **LM Studio** can use a local LM Studio server URL
* **Custom Endpoint** requires you to enter an OpenAI-compatible base URL

---

## OpenAI-compatible

**OpenAI-compatible** means an endpoint uses an API shape similar to OpenAI’s chat completions API.

It does not mean:

* the provider is OpenAI
* the models are OpenAI models
* pricing is the same as OpenAI
* every OpenAI feature is supported

For Custom Endpoint, KForge expects an OpenAI-compatible chat endpoint.

---

## Local runtime

A **local runtime** runs on your own computer.

Examples:

* Ollama endpoint using the local Ollama app
* LM Studio using a local server

Local runtimes usually do not need a cloud API key.

They may still need your computer to have enough memory, CPU, or GPU power for the model.

---

## Cloud provider

A **cloud provider** runs the model on remote provider infrastructure.

Examples:

* OpenAI
* Claude
* Gemini
* Mistral
* Ollama Cloud

Cloud providers usually need an API key.

Billing, quotas, and rate limits are controlled by the provider.

---

## Important summary

* **Provider** = where the AI request goes
* **Model** = which AI model to use
* **Model ID** = exact model name sent to the provider
* **Presets** = KForge suggestions
* **My Models** = your saved model IDs
* **Labels** = advisory hints
* **API key** = secret provider credential
* **Endpoint** = base URL KForge connects to

KForge tries to keep these concepts separate so you can choose providers and models clearly.
---

[← Docs home](index.md)