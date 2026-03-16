# 🗺 KForge Project Map

**Location:**
D:\kforge\docs-internal\project-map.md

**Version:** v4
**Updated:** 15/03/2026

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
* layout authority

This is the **AI execution brain**.

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

Preview runner provides controlled local development runtime:

* install dependencies
* start dev server
* stream logs
* detect preview URL
* stop processes

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

Tracks child process PID.

Stop uses:

```
taskkill /PID <pid> /T /F
```

Events emitted:

```
kforge://preview/log
kforge://preview/status
```

---

## Frontend Bridge

previewRunner.js:

* preview_install
* preview_start
* preview_stop
* preview_get_status

Also subscribes to preview log/status events.

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
* preview root selector (Base / Generated)
* scaffold path persistence
* human-readable install/preview completion messages
* CLI hint filtering

---

## Preview Root Concept

Preview can run from two locations.

**Base Folder**

The folder originally opened in KForge.

Used when:

* AI generates files
* editing existing projects
* vibe coding workflows

---

**Generated Template**

The nested project created by **Generate**.

Example:

```
workspace/
└─ my-react-app/
```

Allows preview to run inside the generated template.

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

Parent folders are auto-created for writes.

---

# 5 Layout Architecture

DockShell controls layout.

File:

```
src/layout/DockShell.jsx
```

Modes:

Bottom Mode (default)

```
dockMode="bottom"
```

Focus Mode (full surface)

```
dockMode="full"
```

Focus mode promotes the dock to the main surface.

---

# 6 UI Panels

Directory:

```
src/ai/panel/
```

Components:

AiPanel.jsx
PromptPanel.jsx
SystemPanel.jsx
ParametersPanel.jsx
TranscriptPanel.jsx
PatchPreviewPanel.jsx
ProviderControlsPanel.jsx

---

# 7 Dev Tools

Enabled via:

```
Ctrl + Shift + T
```

Stored in:

```
localStorage: kforge:devToolsEnabled
```

Used for development debugging.

---

# Quick Navigation

| Task              | File                           |
| ----------------- | ------------------------------ |
| Modify AI request | src/App.js                     |
| Tool detection    | src/ai/panel/AiPanel.jsx       |
| Tool handlers     | src/ai/tools/handlers/index.js |
| Filesystem logic  | src/lib/fs.js                  |
| Dock behavior     | src/layout/DockShell.jsx       |
| Preview runtime   | src-tauri/src/preview.rs       |
| Preview bridge    | src/runtime/previewRunner.js   |
| Preview UI        | src/runtime/PreviewPanel.jsx   |

---

# Architectural Summary

KForge architecture principles:

* one canonical message store
* one AI execution authority
* one tool runtime pipeline
* one filesystem bridge
* preview runtime isolated from AI logic
* UI projections separated from runtime state

This architecture supports:

AI → filesystem edits → preview runtime → browser feedback.
