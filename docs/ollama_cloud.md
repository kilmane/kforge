# Ollama Cloud in KForge

_Last updated: 29/04/2026_

This page explains how to use **Ollama Cloud** as a direct KForge chat provider.

Ollama Cloud is separate from **Ollama endpoint** in KForge.

---

## Ollama endpoint vs Ollama Cloud

KForge has two Ollama-related provider choices.

### Ollama endpoint

Use **Ollama endpoint** when KForge should connect to an Ollama server endpoint.

Common examples:

* the local Ollama app on your computer
* a remote or self-hosted Ollama endpoint
* Ollama cloud models accessed through the local Ollama app after `ollama signin`

For normal local Ollama use, KForge does **not** need an API key.

The usual local endpoint is:

`http://localhost:11434`

### Ollama Cloud

Use **Ollama Cloud** when KForge should connect directly to Ollama's hosted cloud API.

This route:

* does not require the local Ollama app to be running
* requires an Ollama API key
* uses Ollama's native API
* sends requests to Ollama's hosted API at `https://ollama.com`

In KForge, choose **Ollama Cloud** when you want direct cloud access with an API key.

---

## How to get an API key

Create or manage Ollama API keys here:

`https://ollama.com/settings/keys`

In KForge:

1. Open **Settings**
2. Select **Ollama Cloud**
3. Paste your Ollama API key
4. Click **Save**
5. Return to the provider/model selector
6. Choose **Ollama Cloud**
7. Add a model ID manually

Keys are stored securely by KForge through the operating system keychain.

---

## How to find model IDs

Ollama Cloud model IDs can change over time.

For that reason, KForge does **not** maintain a fixed preset list for Ollama Cloud.

The most reliable source is Ollama's current cloud model list.

You can find model IDs in two ways.

### Option 1: Ollama website

Open Ollama's cloud model browser:

`https://ollama.com/search?c=cloud`

Use the model ID exactly as Ollama shows it.

### Option 2: Direct API model list

If you have an Ollama API key, you can list the direct cloud API models from PowerShell:

`GET https://ollama.com/api/tags`

Example PowerShell check:

`Invoke-RestMethod -Method Get -Uri "https://ollama.com/api/tags" -Headers @{ Authorization = "Bearer YOUR_OLLAMA_API_KEY" }`

The returned `name` or `model` value is the model ID to enter in KForge.

---

## Direct API model ID examples from /api/tags

Example model IDs seen from Ollama Cloud `/api/tags` include:

| Model ID | Suggested use |
|---|---|
| `gpt-oss:20b` | Smaller cloud test model |
| `gpt-oss:120b` | General direct cloud model |
| `kimi-k2.6` | Larger reasoning/coding model |
| `deepseek-v4-flash` | Faster DeepSeek cloud option |
| `deepseek-v4-pro` | Heavier DeepSeek cloud option |
| `qwen3-coder:480b` | Large coding model |
| `minimax-m2.7` | Larger general model |
| `gemma3:12b` | Smaller general model |
| `gemma3:27b` | Larger Gemma model |

These examples are not guaranteed to remain available forever.

Always check Ollama's current model list before relying on a model ID.

---

## Which cost/usage label to choose

KForge lets you save your own model IDs and label them.

For Ollama Cloud, the label is advisory. KForge cannot automatically know your Ollama plan, quota, limits, or intended usage.

Use this practical guide:

### Free / Sandbox

Choose this for:

* quick tests
* small prompts
* lightweight models
* checking that Ollama Cloud works
* models you plan to use carefully on a free or limited account

Example:

`gpt-oss:20b`

### Paid / Main

Choose this for:

* regular daily use
* serious coding or writing tasks
* models you expect to use often
* cloud usage under a paid Ollama plan

Examples:

`gpt-oss:120b`

`deepseek-v4-flash`

`kimi-k2.6`

### Paid / Heavy

Choose this for:

* very large models
* long prompts
* agent-style workflows
* expensive or slow experiments
* anything you do not want to spam repeatedly

Examples:

`qwen3-coder:480b`

`deepseek-v4-pro`

`mistral-large-3:675b`

When unsure, choose the safer/heavier label.

The label does not change billing. It is only a reminder inside KForge.

---

## Why KForge does not ship fixed Ollama Cloud presets

KForge does not ship fixed compiled presets for Ollama Cloud because the cloud model list can be large and can change frequently.

Instead, Ollama Cloud is treated as a manual model-ID provider.

This keeps KForge:

* accurate
* lower maintenance
* less likely to show stale models
* more flexible for users with different Ollama accounts or plans

The source of truth is Ollama's current model list, not KForge's documentation.

For direct Ollama Cloud use, find the model ID from Ollama, then add it manually in KForge.

---

## Quick test that Ollama Cloud works

After saving your Ollama Cloud API key in KForge:

1. Open **Change Provider/Model**
2. Select **Ollama Cloud**
3. Add a model ID such as `gpt-oss:120b`
4. Select that model
5. Click **Test connection**

If the test turns green, KForge can reach Ollama Cloud directly.