# 🧭 KForge — PROJECT SNAPSHOT (Internal Canonical State)

**Location:**
D:\kforge\docs-internal\PROJECT-SNAPSHOT.md

**Last Updated:** March 16th, 2026

**Phase:** 4.3.2.g — Workspace Root Unification
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
* Workspace root management
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

Two projections of the same message store.

## Chat View (GPT-clean)

File:

```
src/ai/panel/AiPanel.jsx
```

Shows:

* assistant messages
* AI messages
* relevant tool messages
* consent prompts

---

## Transcript View

File:

```
src/ai/panel/TranscriptPanel.jsx
```

Full system log.

Contains:

* user / assistant / system / tool messages
* Retry + Clear controls
* consent actions

Architectural rule:

```
Chat = filtered projection
Transcript = complete system log
```

---

# 🟢 3️⃣ Layout & Dock Architecture

## DockShell

File:

```
src/layout/DockShell.jsx
```

Supports two layout modes.

### Bottom Mode (default)

```
dockMode = "bottom"
```

Dock sits under main workspace.

---

### Focus Mode

```
dockMode = "full"
```

Dock replaces main layout.

Focus mode is a **surface promotion**, not a resized dock.

---

# 🔵 4️⃣ Tool Runtime Pipeline

## Tool Detection

File:

```
src/ai/panel/AiPanel.jsx
```

Handles:

* tool payload parsing
* JSON/XML tool formats
* deduplication
* consent gating
* execution dispatch

---

## Tool Runtime Wrapper

File:

```
src/ai/tools/toolRuntime.js
```

Responsibilities:

* consent enforcement
* lifecycle messages
* transcript logging
* error formatting

Runtime flow:

```
detect tool
→ consent request
→ handler execution
→ append result
```

---

## Tool Handlers

File:

```
src/ai/tools/handlers/index.js
```

Tools currently available:

* read_file
* list_dir
* write_file
* search_in_file
* mkdir

Filesystem authority:

```
src/lib/fs.js
```

App.js sets project root.
fs.js enforces safety.

---

# 🟤 4b Preview Runtime

Preview runner executes project dev servers.

Backend:

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

## Preview Responsibilities

Preview runner provides:

* dependency installation
* development server startup
* log streaming
* URL detection
* controlled process stop
* preview log persistence

Commands executed:

```
pnpm install
pnpm dev
```

---

## Backend Behavior

Uses:

```
std::process::Command
```

Tracks process PID.

Stop command:

```
taskkill /PID <pid> /T /F
```

Events emitted:

```
kforge://preview/log
kforge://preview/status
```

---

# 🧱 4c Scaffold System

File:

```
src-tauri/src/scaffold.rs
```

Frontend trigger:

```
PreviewPanel.jsx → invoke("scaffold_vite_react")
```

---

## Current Scaffold Behavior

Templates are generated using:

```
pnpm dlx create-vite . --template react
```

Important architectural rule:

```
Scaffold runs directly in the workspace root.
```

Example result:

```
workspace/
 ├ src/
 ├ package.json
 ├ vite.config.js
 └ index.html
```

No nested project directory is created.

---

## Why this matters

KForge must maintain a single project root.

```
workspace root
== AI editing root
== preview runtime root
== explorer root
```

This prevents mismatches where:

```
AI edits files
but preview server runs elsewhere
```

---

# 🟡 5️⃣ Stable Development Loop

The canonical workflow:

```
Open folder
Generate (optional)
Install
Preview
Open
Stop
Iterate
```

AI editing workflow:

```
Open folder
Prompt AI
AI writes files
Install
Preview
Hot reload
```

---

# 🟢 6️⃣ Filesystem Guarantees

Filesystem layer ensures:

* writes scoped to project root
* parent folders auto-created
* invalid paths blocked
* errors surfaced clearly

Explorer auto-refreshes after:

* AI file writes
* directory creation
* scaffold generation

---

# 🟠 7️⃣ UI Philosophy

KForge is not a debug console.

KForge is:

A calm reasoning-first coding surface.

Principles:

* chat is primary
* tools are explicit
* diagnostics optional
* human-readable errors first
* no hidden side effects

---

# 🧠 8️⃣ Current Stability State

As of Phase 4.3.2.g:

* GPT surface stable
* tool consent working
* AI filesystem writes validated
* preview runner stable
* preview URL persistence implemented
* explorer refresh fixed
* scaffold root unified
* preview UX polished

This is a **restore-grade checkpoint** for the AI editing + preview workflow.
