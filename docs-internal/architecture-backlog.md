D:\kforge\docs-internal\architecture-backlog.md

# 🧱 Architecture Backlog

This file is the “parking bay” for anything we decide to do later.  
Rule: if we say “later”, we write it here immediately with enough context to execute.

---

## Template (copy this)

### Title
Status: Shelved | Planned | In progress | Completed  
Added: YYYY-MM-DD  

**Why**
- …

**Where**
- File: …
- Function(s): …
- Notes: …

**Plan**
1) …
2) …
3) …

**Risks / gotchas**
- …

**Done when**
- …

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


src/runtime/templateRegistry.js
src/runtime/PreviewPanel.jsx
src-tauri/src/scaffold.rs


---

## Plan

1) Add registry entries for new templates.
2) Implement scaffold commands in Rust backend.
3) Ensure Preview Runner can detect dev server URLs.
4) Expand registry detection hints.

Example registry entry:


{
id: "astro",
name: "Astro",
scaffold: "scaffold_astro"
}


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

### Packaging-Readiness Extension — Preview & Deploy Tooling Rules
Status: Planned
Added: 2026-02-26

**Why**
- Preview and deploy features introduce external tooling dependencies (Node, pnpm, Git, Vercel CLI, Netlify CLI).
- These must be handled deliberately to avoid hidden runtime assumptions.
- Packaging constraints (process management, port handling, sandbox safety) must be formalized once the features are stable.

**Where**
- File: packaging-readiness.md

**Plan**
1) Document external tooling requirements.
2) Define process lifecycle management.
3) Define port safety rules.
4) Define deploy safety rules.

**Done when**
- Preview Runner and deploy pipeline are stable.

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