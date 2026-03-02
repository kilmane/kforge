
# 🧭 KForge — PROJECT SNAPSHOT (Internal Canonical State)

**Last Updated:** February 27th, 2026
**Phase:** 4.3.1 — Preview Runner MVP (Dev Runtime)
**Status:** Architecturally Stable + Runtime Extended

This file is the authoritative operational reference.

If anything conflicts with:

* chat memory
* assumptions
* scattered notes

This file wins.

Not user-facing.

---

# 🟠 1️⃣ Project Overview

KForge is a desktop-first developer workspace built around:

• A GPT-clean AI surface
• Secure filesystem access
• Explicit, consent-gated tooling
• Calm, attention-disciplined UI

KForge is **chat-first**, not tool-first.

---

# 🟣 2️⃣ Current Architectural Reality (Phase 4.2i)

## 🧠 Execution Authority

AI execution lives in:

src/App.js

This file owns:

• Canonical message state
• AI request building
• Context injection
• Patch instruction injection
• Retry logic
• Project lifecycle control
• TranscriptBubble definition

If AI behaves incorrectly → start here.

---

## 💬 Single Message Store (Critical Rule)

There is exactly one message array:

messages (owned by App.js)

Everything renders from this.

Structure:
id, role, content, ts, optional action metadata

No duplicate message systems exist.

---

## 🧩 Rendering Surfaces

There are two projections of the same message store:

### Chat View (GPT-clean)

File: src/ai/panel/AiPanel.jsx

• Assistant-only projection
• Clean reasoning surface
• No tool/system noise
• Used in both Focus ON and Focus OFF

### Transcript View

File: src/ai/panel/TranscriptPanel.jsx

• Full message stream
• Includes user, assistant, system, tool
• Includes Retry + Clear controls
• Renders consent actions

Architectural law:

Chat is a filtered projection of Transcript.
Transcript is the complete system log.
There is only one message store.

---

# 🟢 3️⃣ Layout & Dock Architecture

## 🔹 DockShell

File: src/layout/DockShell.jsx

DockShell now supports two explicit layout modes:

### Bottom Mode (default)

dockMode = "bottom"

• Main layout occupies screen
• Dock appears below
• Dock capped at max 55% viewport height
• Used when Focus OFF

### Full Surface Mode (Focus)

dockMode = "full"

• Dock replaces main layout
• Occupies full height under top bar
• No height cap
• No 50/50 split
• Used when Focus ON

Architectural principle:

Focus mode is a surface promotion, not a resized dock.

This eliminated:
• Height fighting
• Dock centering bugs
• Artificial max-height constraints

---

# 🔵 4️⃣ Tool Runtime Pipeline

## Tool Detection + Coordination

File: src/ai/panel/AiPanel.jsx

Responsible for:

• Parsing model tool requests
• Handling fenced tool/json/XML payloads
• Deduplication
• Triggering runtime execution
• Consent gating

---

## Tool Runtime Wrapper

File: src/ai/tools/toolRuntime.js

Responsible for:

• Consent enforcement
• Lifecycle messaging
• Transcript-visible tool events
• Success/error formatting

---

## Tool Handlers

File: src/ai/tools/handlers/index.js

Maps tool name → implementation.

Filesystem authority lives in:

src/lib/fs.js

App.js sets project root.
fs.js enforces path safety.

---
# 🟤 4️⃣b Preview Runtime (Phase 4.3.1)

Preview execution is now part of the architecture.

Purpose:
• Run project-local development servers
• Stream logs safely into UI
• Allow explicit start / stop control
• Detect localhost preview URLs

Backend authority:

src-tauri/src/preview.rs

Frontend bridge:

src/runtime/previewRunner.js

UI surface:

src/runtime/PreviewPanel.jsx

Design constraints:

• Dev-only
• Explicit user-triggered execution
• No automatic network exposure
• No background daemons
• Fully collapsible UI
• Does not interfere with AI execution pipeline

Preview is runtime tooling.
It does not alter AI message flow.
It does not modify message state.
It is architecturally isolated from the chat system.

----

# 🟡 5️⃣ UI Philosophy (Locked)

KForge is not:

A debug console with chat attached.

KForge is:

A reasoning-first, calm coding surface.

Principles:

• Chat is primary
• Tools are explicit
• Diagnostics are optional
• Errors summarized in human language first
• Raw data available on demand
• No hidden side effects

Power-user controls must be:
• Optional
• Collapsible
• Never intrusive

---

# 🟠 6️⃣ Focus Mode Intent

Focus Mode exists to:

• Remove distraction
• Promote AI surface
• Preserve editor integrity

Focus Mode does NOT:
• Change AI behavior
• Create a new chat mode
• Duplicate message logic

It only changes layout.

---

# 🟣 7️⃣ Provider Strategy (Locked)

KForge supports:

• Cloud LLMs
• OpenAI-compatible endpoints
• Local runtimes (Ollama etc.)

Model IDs:

• User-editable
• Case-sensitive
• Sent exactly as provider expects
• Cost tags are metadata only

No friendly renaming at runtime layer.

---

# 🔴 8️⃣ Backup & Safety Discipline

KForge enforces multi-layer backup:

• Local git
• Remote GitHub
• Periodic zip snapshots
• External storage backup

Risky refactors must always be reversible.

---

# ⚖ 9️⃣ Operational Laws

• One objective per chat
• Major milestone → new chat
• Revert before hacking deeper
• Prefer clarity over cleverness
• Full-file edits preferred for core files
• Temporary code must be removed
• Architecture changes must update Project Map + Snapshot

---

# 🧠 10️⃣ Current Stability State

As of Phase 4.2i:

• Single-surface GPT UI stable
• Assistant-only chat projection working
• Transcript view stable
• DockShell dual-mode working
• Focus mode full-height surface working
• No duplicate rendering paths
• No split dock logic
• Tauri preview process runner stable
• Async log streaming stable
• Collapsible dev runtime panel integrated
• No AI pipeline regression

This is a restore-grade architecture checkpoint.

---

# 🧭 When To Update This File

Update when:

• Dock behavior changes
• Message flow changes
• Tool runtime changes
• Provider architecture changes
• Layout authority shifts
• UI philosophy evolves

This file documents architectural truth.

---
