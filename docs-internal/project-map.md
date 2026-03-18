# 🗺 KForge Project Map

**Location:**
D:\kforge\docs-internal\project-map.md

**Version:** v7
**Updated:** 18/03/2026

Purpose: architectural topology & execution responsibility map.

---

# 1 Core Application Architecture

## Application Root

File:

```
src/App.js
```

Responsibilities:

* canonical message store
* AI request execution
* prompt construction
* retry logic
* project lifecycle
* workspace root management
* layout authority

This is the **AI execution brain**.

App.js is also the **authority for the current project root**.

---

# 2 AI System Architecture

## Single Message Store

Defined in:

```
src/App.js
```

Structure:

```
messages = [{ id, role, content, ts, action?, actions? }]
```

Everything renders from this.

There are **no duplicate message systems**.

---

## Rendering Surfaces

### Chat Surface

File:

```
src/ai/panel/AiPanel.jsx
```

Filtered projection of message store.

Shows:

* assistant messages
* AI messages
* tool-related system messages
* consent prompts

---

### Transcript Surface

File:

```
src/ai/panel/TranscriptPanel.jsx
```

Full system log.

Includes:

* user
* assistant
* system
* tool messages

Contains Retry + Clear controls.

---

# 3 Tool Runtime Architecture

## Tool Detection

File:

```
src/ai/panel/AiPanel.jsx
```

Detects:

* JSON tool payloads
* XML tool payloads

Triggers runtime execution.

---

## Tool Runtime Wrapper

File:

```
src/ai/tools/toolRuntime.js
```

Handles:

* consent gating
* lifecycle events
* result formatting

Runtime flow:

```
detect tool
→ consent
→ handler execution
→ result appended
```

---

## Tool Handlers

File:

```
src/ai/tools/handlers/index.js
```

Current tools:

* read_file
* write_file
* list_dir
* search_in_file
* mkdir

Filesystem layer:

```
src/lib/fs.js
```

Ensures project-root safety.

---

# 3b Preview Runner (Dev Runtime)

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

## Responsibilities

Preview runner provides a controlled runtime for running local projects.

Capabilities:

* install dependencies
* start dev servers
* serve static sites
* stream logs
* detect preview URL
* stop processes
* persist preview logs

---

## Preview Detection

Preview behavior is determined automatically based on project structure.

Detection rules:

```
package.json → package project preview
index.html → static site preview
```

Package projects run a dev server.

Static projects run KForge's built-in static server.

Detection is implemented in:

```
preview_detect_kind()
```

in:

```
src-tauri/src/preview.rs
```

---

## Package Project Preview

Commands executed:

```
pnpm install
pnpm dev
```

Used for:

* Vite
* React
* Next.js
* future framework templates

---

## Static Project Preview

If a folder contains:

```
index.html
```

KForge starts an internal static server.

Example URL:

```
http://127.0.0.1:56566/
```

Features:

* serves HTML/CSS/JS
* streams preview logs
* supports index.html fallback for unknown routes
* clean process stop
* no dependency install required

---

## Backend Behavior

Uses:

```
std::process::Command
```

Tracks child process PID.

Stop uses:

```
taskkill /PID <pid> /T /F
```

Static preview uses an internal Rust HTTP server.

Events emitted:

```
kforge://preview/log
kforge://preview/status
```

---

## Frontend Bridge

`previewRunner.js` provides:

* preview_detect_kind
* preview_install
* preview_start
* preview_stop
* preview_get_status

Also subscribes to preview log/status events.

These events drive the Preview UI state.

---

## Preview UI

PreviewPanel.jsx handles:

* Generate template project
* Install dependencies
* Start preview server
* Stop preview server
* Open preview URL in browser
* Clear preview logs

Additional UX responsibilities:

* preview log persistence
* preview URL detection and restoration
* scaffold path persistence
* human-readable install/preview completion messages
* CLI hint filtering
* preview log auto-scroll
* preview workflow instructions

UI adapts based on project type.

### Static projects

```
Preview → Open
```

### Package projects

```
Install → Preview → Open
```

---

# 3c Scaffold System

Backend implementation:

```
src-tauri/src/scaffold.rs
```

Frontend trigger:

```
PreviewPanel.jsx
```

Commands currently used:

```
invoke("scaffold_vite_react")
invoke("scaffold_nextjs")
```

---

## Scaffold Behavior

Scaffold generates project templates directly in the workspace root.

Example:

```
workspace/
├ src/
├ package.json
├ vite.config.js
└ index.html
```

No nested folder is created.

---

## Current Templates (Phase 4.3.6)

KForge currently supports two template generators.

### Vite + React

Command executed:

```
pnpm dlx create-vite@latest . --template react --no-interactive
```

Behavior:

* lightweight scaffold
* dependencies installed separately via Install button

---

### Next.js

Command executed:

```
pnpm create next-app@latest . --yes
```

Behavior:

* heavier scaffold
* dependencies installed during generation
* significantly larger dependency tree

This is expected because `create-next-app` performs a full dependency install.

---

## Important UX Note

After Next.js scaffold completes:

* dependencies are already installed
* Install button may still appear available

This is acceptable for now but may be improved later by deriving install readiness from actual project state rather than template type.

---

## Future Direction — Template Registry

Phase **4.3.7 — Template Registry** will replace the current dual-button generation UI.

Future flow:

```
Generate
│
├ Static HTML site
├ React (Vite)
├ Next.js
├ Vue
└ Svelte
```

Templates will be defined in a **Template Registry** which provides:

* template metadata
* scaffold commands
* preview behavior
* install expectations

This will allow KForge to support additional frameworks without hardcoding them into the UI.

---

# 3d Workspace Refresh Events

Event emitted when filesystem changes occur:

```
kforge://workspace/refresh
```

Handled in:

```
src/App.js
```

Explorer refreshes after:

* AI file writes
* directory creation
* scaffold generation

---

# 4 Filesystem Layer

File:

```
src/lib/fs.js
```

Responsibilities:

* path safety
* project root enforcement
* file read/write
* folder tree building
* project memory integration

Filesystem operations are restricted to the **active project root**.

---

# 5 Layout Architecture

DockShell controls layout.

File:

```
src/layout/DockShell.jsx
```

Modes:

### Bottom Mode (default)

```
dockMode="bottom"
```

### Focus Mode

```
dockMode="full"
```

Focus mode promotes the dock to the main surface.

---

# Architectural Summary

KForge architecture principles:

* one canonical message store
* one AI execution authority
* one tool runtime pipeline
* one filesystem bridge
* preview runtime isolated from AI logic
* UI projections separated from runtime state
* single unified project root

System workflow:

```
AI → filesystem edits → preview runtime → browser feedback
```

This architecture supports the **vibe coding loop**:

```
prompt
→ AI edits files
→ preview updates
→ user sees result instantly
```


