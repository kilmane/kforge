# 🧭 KForge — PROJECT SNAPSHOT (Internal Canonical State)

**Location:**
D:\kforge\docs-internal\PROJECT-SNAPSHOT.md

**Last Updated:** March 15th, 2026

**Phase:** 4.3.4 — Preview Runner UX polish
**Status:** Stable milestone reached

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

* A GPT-clean AI surface
* Secure filesystem access
* Explicit, consent-gated tooling
* Calm, attention-disciplined UI

KForge is **chat-first**, not tool-first.

---

# 🟣 2️⃣ Current Architectural Reality

## 🧠 Execution Authority

AI execution lives in:

```
src/App.js
```

This file owns:

* Canonical message state
* AI request building
* Context injection
* Patch instruction injection
* Retry logic
* Project lifecycle control
* TranscriptBubble definition

If AI behaves incorrectly → start here.

---

# 💬 Single Message Store (Critical Rule)

There is exactly one message array:

```
messages (owned by App.js)
```

Everything renders from this.

Structure:

```
id, role, content, ts, optional action metadata
```

No duplicate message systems exist.

---

# 🧩 Rendering Surfaces

There are two projections of the same message store.

## Chat View (GPT-clean, tool-aware)

File:

```
src/ai/panel/AiPanel.jsx
```

Current behavior:

* assistant messages visible
* AI messages visible
* tool-related system messages visible when relevant
* consent prompts visible in normal chat
* tool success/failure visible in normal chat

This was stabilized in Phase 4.3.2.d so AI file editing can be approved without opening Transcript.

---

## Transcript View

File:

```
src/ai/panel/TranscriptPanel.jsx
```

Current behavior:

* full message stream
* user / assistant / system / tool events
* Retry + Clear controls
* consent actions rendered

Architectural law:

Chat is a filtered projection of Transcript.
Transcript is the complete system log.

There is only one message store.

---

# 🟢 3️⃣ Layout & Dock Architecture

## 🔹 DockShell

File:

```
src/layout/DockShell.jsx
```

DockShell supports two layout modes.

### Bottom Mode (default)

```
dockMode = "bottom"
```

* Main layout occupies screen
* Dock appears below
* Dock capped at max 55% viewport height

Used when Focus OFF.

---

### Full Surface Mode (Focus)

```
dockMode = "full"
```

* Dock replaces main layout
* Occupies full height under top bar
* No height cap

Used when Focus ON.

Architectural principle:

Focus mode is a **surface promotion**, not a resized dock.

---

# 🔵 4️⃣ Tool Runtime Pipeline

## Tool Detection + Coordination

File:

```
src/ai/panel/AiPanel.jsx
```

Responsibilities:

* parse model tool requests
* detect JSON / XML tool payloads
* deduplicate tool calls
* trigger runtime execution
* enforce consent gating

Supported tool input shapes:

* XML tool payloads
* JSON tool calls

---

## Tool Runtime Wrapper

File:

```
src/ai/tools/toolRuntime.js
```

Responsibilities:

* consent enforcement
* lifecycle messaging
* transcript-visible tool events
* success/error formatting

Runtime flow:

```
detect tool
→ request consent
→ user approves
→ invoke tool handler
→ append result/error
```

---

## Tool Handlers

File:

```
src/ai/tools/handlers/index.js
```

Maps tool name → implementation.

Current tools:

* read_file
* list_dir
* write_file
* search_in_file
* mkdir

Filesystem authority lives in:

```
src/lib/fs.js
```

App.js sets project root.
fs.js enforces path safety.

---

# 🟤 4️b Preview Runtime (Phase 4.3)

Preview execution is now a core part of the development loop.

Purpose:

* run project-local development servers
* stream logs safely into UI
* allow explicit start / stop control
* detect localhost preview URLs

Backend authority:

```
src-tauri/src/preview.rs
```

Frontend bridge:

```
src/runtime/previewRunner.js
```

UI surface:

```
src/runtime/PreviewPanel.jsx
```

---

## Design Constraints

* dev-only
* explicit user-triggered execution
* no automatic network exposure
* no background daemons
* localhost-only preview
* preview runtime isolated from AI pipeline

Preview does **not modify AI message flow**.

---

## Preview Panel Responsibilities

PreviewPanel.jsx now handles:

* Generate / Install / Preview / Stop / Open / Clear controls
* preview log display
* preview status display
* preview URL detection
* preview root selection (Base vs Generated)
* scaffold target persistence
* preview log persistence across panel close/reopen
* human-readable process completion messages
* filtering CLI-only terminal hints

---

## Preview Root Selection

Preview can run from two locations:

**Base Folder**

The folder originally opened in KForge.

Used for:

* AI-generated projects
* existing projects
* vibe coding workflows

**Generated Template**

The nested project created by the **Generate** button.

Example:

```
workspace/
└─ my-react-app/
```

This allows preview to run from the generated template root.

---

## Stable Development Loop

```
Generate → Install → Preview → Open → Stop → Iterate
```

This is the canonical preview workflow.

---

# 🟠 5️⃣ AI Filesystem Writing (Phase 4.3.2.d)

This phase delivered the first real AI → workspace write loop.

Validated flow:

```
Open folder
→ AI prompt
→ AI emits write_file tool
→ consent requested
→ user approves
→ file written to disk
```

Confirmed working cases:

* file creation
* file editing
* nested folder writes

Filesystem guarantees:

* writes scoped to project root
* parent folders auto-created
* errors surfaced visibly

---

# 🟡 6️⃣ Known Remaining Gaps

Explorer refresh gap.

After AI writes files successfully, Explorer does not auto-refresh.

Next ship:

```
Phase 4.3.2.e — Explorer auto-refresh
```

Multi-tool execution gap.

When a model response contains multiple tool calls:

* only the first tool executes

Next ship:

```
Phase 4.3.2.f — Multi-tool execution
```

---

# 🟤 7️⃣ UI Philosophy (Locked)

KForge is not:

A debug console with chat attached.

KForge is:

A calm reasoning-first coding surface.

Principles:

* chat is primary
* tools are explicit
* diagnostics optional
* human-readable errors first
* raw data available on demand
* no hidden side effects

---

# 🟠 8️⃣ Focus Mode Intent

Focus Mode:

* removes distraction
* promotes AI surface
* preserves editor integrity

Focus Mode does **not** change AI behavior.

It only changes layout.

---

# 🟣 9️⃣ Provider Strategy

KForge supports:

* cloud LLMs
* OpenAI-compatible endpoints
* local runtimes (Ollama etc.)

Model IDs are:

* user-editable
* case-sensitive
* passed to providers exactly

Cost tags are metadata only.

---

# 🔴 10️⃣ Backup & Safety Discipline

KForge enforces:

* local git commits
* GitHub pushes
* periodic zip snapshots
* external backup

Risky refactors must always be reversible.

---

# ⚖ 11️⃣ Operational Laws

* one objective per chat
* major milestone → new chat
* revert before hacking deeper
* clarity over cleverness
* architecture updates must update documentation

---

# 🧠 12️⃣ Current Stability State

As of Phase 4.3.4:

* GPT surface stable
* tool consent visible
* AI file editing working
* filesystem writes scoped safely
* preview runner stable
* preview logs persist across panel reopen
* preview UX clarified
* preview root selection visible
* CLI terminal hints filtered

This is a **restore-grade checkpoint** for the AI editing + preview workflow.
