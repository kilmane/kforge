# 🧭 Portability & Project Notes — KForge (Internal)

_Last updated: January 24th, 2026 (Phase 3.6.x)_

This file is the **canonical internal context and operational reference**.

If something conflicts with:
- memory
- chat history
- assumptions

**This file wins.**

This document is not user-facing.

---

## 🟠 Project Overview

KForge is a **desktop-first developer workspace** with:
- an AI assistant
- secure filesystem control
- a modular, calm UI philosophy

### Current focus
- **Phase 3.6** — MCPs / tool integration
- Built on top of a stable editor and AI panel foundation

---

## 🔒 Backup & Safety Discipline (IMPORTANT)

KForge follows a **strict multi-layer backup strategy**.

### Layers
- Local git repository
- GitHub remote repository

### Physical backups
- Zip archive of the full `kforge` folder
- Created at major phase milestones
- Stored externally (e.g. Google Drive)

⚠️ Risky work is **never** done without rollback options.

---

## 🧩 UI Authority (Current State)

UI authority currently lives in:
- `src/App.js`

### Layout
- Top: Toolbar
- Left: Explorer
- Center: Editor (tabs + Monaco)
- Right: AI panel (collapsible)

This structure is **transitional**.

All UI work must respect the long-term vision of a:
- calm
- modular
- closable interface

---

## 🎯 UI Philosophy & Attention Discipline

KForge is **not** a debug console with chat bolted on.

KForge **is** a chat-first thinking environment with optional diagnostics.

### Guiding principles
- Chat is the primary surface for reasoning, iteration, and “vibe coding”
- Diagnostics and raw payloads are secondary
- Debug information must never dominate attention

### Supporting rules
- Tools must feel intentional, explicit, and calm
- Errors should be summarized in human language first
- Raw details must be available on demand
- Model quirks should be handled through protocol enforcement and recovery loops
- UI noise is not an acceptable solution

### Power-user diagnostics
- Must be optional
- Must be collapsible
- Must never be auto-intrusive

This philosophy informs:
- tool UX and consent flows
- error handling and recovery behavior
- provider and model variability handling
- future refactors toward a chat-centric workspace

---

## 🧠 Provider Strategy (Locked)

- Support many LLMs, especially free-tier options
- Cloud, OpenAI-compatible, and local runtimes are first-class citizens
- Custom endpoints enable future providers without rewrites
- Accessibility and flexibility are core design constraints

---

## 🧪 Model Flexibility (User-Editable)

KForge must allow users to:
- add and manage model IDs on the fly
- per provider
- without rebuilds or redeployments

As long as the provider is supported, models are user-controlled.

### Why this matters
Model availability changes constantly:
- deprecations
- billing plan changes
- provider catalog updates

KForge must remain useful even when presets become stale.

### Important rules
- Model IDs must be **exact provider identifiers**
- Case-sensitive
- No friendly names
- Cost tags are metadata only
- Cost tags must **never** be appended to the model ID sent to providers

### Implementation preference (future UX)
- Per-provider “Add model ID” input
- Saved per-provider “My models” list
- Persist user-added models locally
- Merge user models with shipped presets at runtime

---

## 💸 Token Efficiency & Cost Awareness

KForge is designed to **burn fewer tokens per useful result**.

This is achieved through:
- explicit context control (limited rolling chat window)
- no hidden system prompt bloat
- active file context included only by user intent
- no silent resending of large buffers or workspace state

As a result:
- users get more meaningful work per token
- compared to tools that resend entire conversations implicitly

Token efficiency is a **core product principle**, not an afterthought.

---

## 🛠️ Tooling & MCP Direction

- Tools are explicit, consent-gated, and transcript-visible
- No silent execution
- No filesystem access without user intent

Tool runtime is being extracted out of `App.js` for stability.

---

## 📎 Lessons from External Tools (Reminder)

Prior experience with other “vibe coding” tools revealed:
- fragile state handling
- poor consistency
- hidden side effects

KForge intentionally avoids these patterns.

Concrete lessons will be added here later as a reference checklist.

---

## 📜 Project Laws (Operational)

- One objective per chat
- Major milestones → new chat
- If stuck: revert, commit, regroup
- Prefer reliability over cleverness
- Full file replacement preferred for core files
- Temporary test code must be removed
- Modularization requires cleanup of redundant logic
- Markdown files must be Notepad-friendly (no triple backticks)

---

## 🧭 Usage

At the start of a new chat:
- paste the Context Summary
- reference this file if deeper context is needed

Update this file whenever:
- architecture changes
- rules evolve
- project direction shifts
