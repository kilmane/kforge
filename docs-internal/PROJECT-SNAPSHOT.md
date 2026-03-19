
🧭 KForge — PROJECT SNAPSHOT (Internal Canonical State)

**Location:**
D:\kforge\docs-internal\PROJECT-SNAPSHOT.md

**Last Updated:** March 19th, 2026

**Phase:** 4.3.8 — Registry-aware project identification
**Status:** Stable milestone ready for commit

**Stable commit:**

```

pending

```

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

Preview runner executes project development environments.

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
* static site preview
* log streaming
* URL detection
* controlled process stop
* preview log persistence
* project-type detection
* template identification when possible

Typical commands executed:

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

Static preview uses an internal Rust HTTP server.

---

## Automatic Preview Detection

Preview behavior is determined automatically in **two stages**.

### Stage 1 — Coarse backend detection

Rust determines the broad project type from project structure.

Rules:

```

package.json → package project
index.html → static project

```

This is implemented by:

```

preview_detect_kind()

```

Possible result:

```

package
static

```

This stage determines preview behavior.

---

### Stage 2 — Registry-aware template identification

After coarse detection, the frontend attempts to identify the actual framework template.

Implemented in:

```

src/runtime/previewRunner.js

```

Flow:

```

preview_detect_kind()
→ read package.json
→ inspect dependencies/devDependencies
→ match against Template Registry detection hints
→ identify template when possible

```

Examples:

```

next → Next.js
vite + react → Vite + React
index.html without package.json → Static HTML/CSS/JS

```

Returned preview detection shape now includes:

```

{
kind,
compatibleTemplates,
detectedTemplate
}

```

Where:

* `kind` is the coarse backend classification
* `detectedTemplate` is the registry-based framework match when confidence is sufficient

This keeps preview behavior simple while making the UI framework-aware.

---

## Preview UI Behavior

UI adapts automatically:

```

Static project → Preview → Open
Package project → Install → Preview → Open

```

If a registry template is identified, the Preview panel shows a human-readable result such as:

```

Next.js project detected

```

Fallback remains available when only coarse detection is known.

This replaces the older more technical wording:

```

Detected kind: package

```

---

# 🧱 4c Scaffold System

Backend:

```

src-tauri/src/scaffold.rs

```

Frontend trigger:

```

PreviewPanel.jsx

```

Current scaffold commands:

```

invoke("scaffold_vite_react")
invoke("scaffold_nextjs")

```

---

## Current Templates

### Static HTML/CSS/JS

Template registry supports a static template path for simple non-package projects.

Characteristics:

* no dependency install required
* internal static server preview
* suitable for plain HTML/CSS/JS sites

---

### Vite + React

Command:

```

pnpm dlx create-vite@latest . --template react --no-interactive

```

Characteristics:

* lightweight scaffold
* dependencies installed separately via **Install** button
* very fast generation

---

### Next.js

Command:

```

pnpm create next-app@latest . --yes

```

Characteristics:

* heavier scaffold
* installs dependencies during generation
* creates a much larger dependency tree

Generation therefore takes significantly longer than Vite templates.  
This is expected behavior from `create-next-app`.

---

## Important UX Note

After Next.js scaffold completes:

* dependencies are already installed
* the **Install** button may still appear available

This is currently acceptable behavior.

Future improvement may derive install readiness from actual project state rather than template type.

---

## Template Registry (Critical Architectural Addition)

KForge now has a structured template registry.

This became the source of truth for template metadata.

Registry responsibilities include:

* template IDs
* human labels
* scaffold metadata
* preview compatibility
* install expectations
* detection hints

This removes the need for scattered framework checks in the UI.

Framework awareness should be derived from registry metadata, not hardcoded special cases.

This is the foundation for future template expansion such as:

* Astro
* Vue + Vite
* Expo / React Native

---

## Workspace Root Rule (Critical)

KForge enforces a **single workspace root**.

```

workspace root
== AI editing root
== preview runtime root
== explorer root

```

Scaffold therefore runs **directly in the workspace folder**, not inside a nested directory.

Example result:

```

workspace/
├ src/
├ package.json
├ vite.config.js
└ index.html

```

This prevents mismatches where:

```

AI edits files
but preview server runs elsewhere

```

---

# 🟡 5️⃣ Stable Development Loop

Canonical user workflow:

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

As of **Phase 4.3.8**:

* GPT surface stable
* tool consent working
* AI filesystem writes validated
* preview runner stable
* preview URL persistence implemented
* explorer refresh fixed
* scaffold root unified
* static HTML preview implemented
* automatic preview detection implemented
* preview UX polished
* Next.js scaffold template implemented
* Template Registry implemented
* registry-aware project identification implemented
* Preview UI wording improved to human-readable project detection

Preview runner now supports:

```

Framework dev servers
Static HTML/CSS/JS sites
Registry-aware framework identification

```

Preview detection now works as:

```

Stage 1: package.json / index.html → coarse project kind
Stage 2: package.json dependency hints → template identification

```

This is a **restore-grade checkpoint** for the AI editing + preview workflow and establishes the architectural base for broader template expansion.
```

