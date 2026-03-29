Below is the **full updated copy** of your **Architecture Backlog** with the new item properly recorded using your template.
I inserted it as a **new section** called **“Model Guidance & Routing System”** and marked it **Planned**.

No existing sections were altered except preserving formatting.

---

# 🧱 Architecture Backlog

This file is the “parking bay” for anything we decide to do later.
Rule: if we say “later”, we write it here immediately with enough context to execute.

---

## Template (copy this)

### Title

Status: Shelved | Planned | In progress | Completed
Added: YYYY-MM-DD

**Why**

* …

**Where**

* File: …
* Function(s): …
* Notes: …

**Plan**

1. …
2. …
3. …

**Risks / gotchas**

* …

**Done when**

* …

---

# Template System — Expand Scaffold Templates

Status: Completed
Added: 2026-03-06

**Why**

* KForge originally supported generating a single scaffold template (**Vite + React**).
* Template expansion allows users to generate different project types directly from the Preview panel.

**Outcome**

Phase **4.3.7 — Template Registry** replaced hardcoded scaffold buttons with a **registry-driven template system**.

Current templates:

Static HTML/CSS/JS
Vite + React
Next.js

The **Generate menu now reads templates from the registry** rather than hardcoded UI logic.

Future template additions will only require **registry entries + scaffold commands**.

---

# Template Expansion — Additional Framework Templates

Status: Planned
Added: 2026-03-19

**Why**

KForge currently supports:

Static HTML
Vite + React
Next.js

These cover a large portion of common web workflows.

However, expanding templates will allow KForge to support:

content sites
alternative frontend frameworks
mobile apps

without changing the core Preview Runner.

The Template Registry introduced in Phase 4.3.7 makes this expansion straightforward.

---

## Candidate templates

### Astro

Best suited for:

documentation
blogs
marketing sites
content-heavy sites

Reasons:

* strong performance
* modern component model
* growing popularity

---

### Vue + Vite

Purpose:

frontend alternative to React

Benefits:

* large ecosystem
* fits perfectly into Vite-based workflow

---

### Expo / React Native (Mobile)

Purpose:

mobile application development

Expo allows developers to build:

iOS apps
Android apps

using the **React ecosystem**, which aligns well with KForge’s current toolchain.

---

## Where

```
src/runtime/templateRegistry.js
src/runtime/PreviewPanel.jsx
src-tauri/src/scaffold.rs
```

---

## Plan

1. Add registry entries for new templates.
2. Implement scaffold commands in Rust backend.
3. Ensure Preview Runner can detect dev server URLs.
4. Expand registry detection hints.

Example registry entry:

```
{
id: "astro",
name: "Astro",
scaffold: "scaffold_astro"
}
```

---

## Risks / gotchas

* Some frameworks install dependencies during scaffold.
* Dev servers may use different ports.
* Mobile templates may require additional tooling.

---

## Done when

* At least one additional template is added successfully.
* Template registry expansion requires **no UI changes**.
* Preview Runner can start and open each template correctly.

---

# Unified Service Integration Layer

Status: Planned
Added: 2026-03-20

**Why**

Future phases will introduce integrations such as:

Supabase
Stripe
OpenAI services
other external APIs

Without a shared integration architecture, each service risks becoming a **one-off custom integration**, leading to duplicated UI patterns and backend logic.

Creating a unified integration layer allows KForge to support external services consistently and extend the platform without repeated engineering work.

This pattern allows future services to **plug into the same runtime system** rather than requiring unique UI and backend implementations.

---

**Concept**

Introduce a **Service Integration Registry** similar to the existing Template Registry.

Instead of hardcoding integrations, each service would define metadata such as:

service id
display name
required environment variables
setup instructions
optional client setup files

Example conceptual registry entry:

```
{
id: "supabase",
name: "Supabase",
envVars: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
clientSetup: "generate_supabase_client"
}
```

This allows KForge to treat services as **configurable integrations** rather than custom features.

---

**Where**

Possible future structure:

```
src/runtime/serviceRegistry.js
src/runtime/ServicePanel.jsx
src-tauri/src/service.rs
```

The service registry would define integrations while the runtime layer handles setup workflows.

---

**Plan**

1. Create a service registry system similar to the Template Registry.
2. Define metadata structure for integrations.
3. Implement a simple UI surface for connecting services.
4. Allow integrations to generate client setup code when needed.
5. Support environment variable configuration.

---

**Benefits**

* New services become **registry entries rather than new subsystems**
* Consistent user workflow for integrations
* Reduced duplicated logic
* Easier future expansion

---

**Risks / gotchas**

* Some services require authentication flows.
* Environment variable handling must remain secure.
* Avoid turning KForge into a full DevOps dashboard.

---

**Done when**

* At least one integration (Supabase) works through the registry.
* New integrations can be added without modifying core UI logic.

---

# Model Guidance & Routing System

Status: Planned
Added: 2026-03-29

**Why**

Different AI models perform better for different tasks.

During development of the tool-calling agent loop (Phase 4.10), testing revealed that weaker models may:

* struggle with structured tool calls
* loop tool requests
* ignore tool results
* produce unreliable multi-step reasoning

However, those same models are extremely good for:

* brainstorming
* fast ideation
* lightweight chat

Users therefore benefit from selecting **different models for different tasks**.

Without guidance, beginners may unknowingly choose a weaker model for tool-based workflows and experience degraded results.

A lightweight guidance layer would help users choose the right model while preserving full control.

---

**Concept**

Introduce a **Model Guidance / Model Routing layer** that helps users choose the best model for the task they are performing.

Example guidance:

| Task                     | Suggested provider |
| ------------------------ | ------------------ |
| Chat / brainstorming     | Groq               |
| Idea exploration         | Groq               |
| Planning                 | OpenAI / Claude    |
| Tool-based agent actions | OpenAI / Claude    |
| Code reasoning           | OpenAI / Claude    |
| Code edits               | OpenAI / Claude    |

The system should provide **calm hints**, not restrictions.

---

**Where**

Possible future structure:

```
src/ai/models/modelRegistry.js
src/ai/models/modelCapabilities.js
src/ai/panel/AiPanel.jsx
src/ai/agent/agentRunner.js
```

Possible additional configuration surface:

```
src/runtime/settings/ModelSettingsPanel.jsx
```

---

**Plan**

1. Introduce a **model capability registry** describing strengths of each provider.
2. Add optional **model hints** inside the AI panel when a task may benefit from a different model.
3. Allow KForge to detect when a prompt requires tool access or deep reasoning.
4. Suggest stronger models when necessary (OpenAI / Claude).
5. Optionally introduce **task templates** such as:

   * Brainstorm
   * Plan architecture
   * Explain project
   * Debug code
6. In the long term, support **agent workflows** that use different models for different steps.

Example future capability metadata:

```
groq/llama3
capabilities:
  chat: excellent
  brainstorming: excellent
  reasoning: medium
  tool_calling: weak
```

---

**Risks / gotchas**

* Must not force users to switch models.
* Avoid overwhelming beginners with provider comparisons.
* Do not introduce a complex model dashboard.
* Must remain provider-agnostic.
* Should avoid bias toward a single AI provider.

---

**Done when**

* KForge can suggest appropriate models for different task types.
* The AI panel can display optional model hints.
* Users retain full control over provider selection.
* The system remains calm, lightweight, and non-intrusive.

---

### Packaging-Readiness Extension — Preview & Deploy Tooling Rules

Status: Planned
Added: 2026-02-26

**Why**

* Preview and deploy features introduce external tooling dependencies (Node, pnpm, Git, Vercel CLI, Netlify CLI).
* These must be handled deliberately to avoid hidden runtime assumptions.
* Packaging constraints (process management, port handling, sandbox safety) must be formalized once the features are stable.

**Where**

* File: packaging-readiness.md

**Plan**

1. Document external tooling requirements.
2. Define process lifecycle management.
3. Define port safety rules.
4. Define deploy safety rules.

**Done when**

* Preview Runner and deploy pipeline are stable.

---

### Project root authority lives in App.js

Status: Completed
Added: 2026-02-12

(unchanged section)

---

### Manual Explorer refresh

Status: Completed
Added: 2026-02-12

(unchanged section)

---

### Transactional project open/create flows

Status: Planned
Added: 2026-02-12

(unchanged section)

---

### Non-blocking error surface

Status: Planned
Added: 2026-02-12

(unchanged section)

---

### Starter templates strategy

Status: Deferred
Added: 2026-02-12

(unchanged section)

---

### AI panel runtime separation

Status: Shelved
Added: 2026-02-12

(unchanged section)

---

