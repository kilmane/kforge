

# Full File Replacement

`D:\kforge\docs-internal\project-map.md`

```markdown
# 🗺 KForge Project Map

Location:

```

D:\kforge\docs-internal\project-map.md

```

Version: v13  
Updated: 24/03/2026

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
* detect compatible template types for the current project

---

## Preview Detection

Preview behavior is determined automatically based on project structure.

Detection occurs in **two stages**.

### Stage 1 — Coarse Detection (Backend)

Rust backend determines the general project type.

Rules:

```

package.json → package project
index.html → static project

```

Implemented in:

```

preview_detect_kind()

```

inside:

```

src-tauri/src/preview.rs

```

---

### Stage 2 — Template Identification (Frontend)

Implemented in:

```

src/runtime/previewRunner.js

```

Process:

```

preview_detect_kind()
↓
read package.json
↓
inspect dependencies
↓
match Template Registry hints
↓
identify framework

```

Example detection:

| Dependency | Template |
|------------|----------|
| next | Next.js |
| vite + react | Vite + React |
| none | Static |

---

# 3d Command Runner Panel

Backend:

```

src-tauri/src/command_runner.rs

```

Frontend bridge:

```

src/runtime/commandRunner.js

```

UI:

```

src/runtime/CommandRunnerPanel.jsx

```

Capabilities:

* run commands
* stream logs
* execute in project root
* support shell built-ins

---

# 3e Service Integration Layer

Backend:

```

src-tauri/src/service.rs

```

Frontend runtime:

```

src/runtime/serviceRunner.js

```

Registry:

```

src/runtime/serviceRegistry.js

```

UI:

```

src/runtime/ServicePanel.jsx

```

Panel integration:

```

src/ai/panel/AiPanel.jsx

```

---

## Architectural Role

The Service Layer provides a unified runtime for external integrations.

It prevents future integrations from becoming one-off subsystems.

Future services include:

```

Supabase
Stripe
OpenAI
GitHub
Netlify
Vercel

```

Architecture principle:

```

new service = registry entry + adapter

```

not

```

new service = new subsystem

```

---

# Service Panel Architecture (Phase 4.6)

The Services UI was redesigned in Phase **4.6 Part 3**.

The previous stacked layout was replaced with a **single-active-service tab architecture**.

Example structure:

```

Services

[ Code / GitHub ] [ Deploy ] [ Backend ] [ Payments ]

```

Only **one service panel is visible at a time**.

This prevents UI clutter as integrations grow.

Benefits:

* focused workspace
* scalable architecture
* avoids “wall of services”
* prepares for deployment integrations

---

# GitHub Integration (Phase 4.6)

GitHub is the first full service adapter.

Capabilities implemented:

```

Publish repository
Push changes
Pull latest
Open on GitHub
Import repository (clone)

```

These actions correspond to standard Git operations.

| Action | Git Operation |
|------|----------------|
| Publish | initialize + create GitHub repo |
| Push | git push |
| Pull latest | git pull |
| Open on GitHub | open repo webpage |
| Import | git clone |

---

## GitHub Publishing

Workflow:

```

git init
git add .
git commit
git branch -M main
gh repo create
git push

```

Requires:

```

git installed
GitHub CLI installed
gh auth login

```

Authentication is handled by **GitHub CLI**, not KForge.

---

## GitHub Import (Phase 4.6 Part 4)

A GitHub repository can now be imported directly during project creation.

Location:

```

New Project flow

```

User flow:

```

New Project

Type 1 or 2

1 — Create local project
2 — Import from GitHub

```

If option **2** is chosen:

```

GitHub repository URL
→ choose parent folder
→ git clone executed
→ project opens automatically

```

This allows existing GitHub projects to be opened directly in KForge.

---

# Deploy Pipeline (Phase 4.7)

KForge now supports **guided deployment entry points**.

Location:

```

Services → Deploy

```

Available providers:

```

Vercel
Netlify

```

Workflow:

```

Local project
→ Publish to GitHub
→ Services → Deploy
→ Choose Vercel or Netlify

```

KForge opens the provider import flow for the detected GitHub repository.

Example:

```

Vercel
[https://vercel.com/new/clone?repository-url=](https://vercel.com/new/clone?repository-url=)<repo>

```
```

Netlify
[https://app.netlify.com/start](https://app.netlify.com/start)

```

KForge intentionally avoids full DevOps dashboards and instead provides **guided deployment shortcuts**.

---

## Service UI Actions

GitHub service actions operate **only on the currently open project**.

Example:

```

Pull latest

```

means:

```

Update current local repo from GitHub

```

It does **not clone new projects**.

Clone/import happens only during **New Project creation**.

---

# Service Logging

Services emit events:

```

kforge://service/log
kforge://service/status

```

Logs are streamed into the Services panel.

This matches the same architecture used by:

```

Preview
Command Runner

```

---

# 3f Workspace Refresh Events

Event:

```

kforge://workspace/refresh

```

Handled in:

```

src/App.js

```

Explorer refreshes after:

* AI file writes
* scaffold generation
* folder creation
* service operations

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

### Bottom Mode

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
* command runtime isolated from AI logic
* service runtime isolated from AI logic
* UI projections separated from runtime state
* registry-driven extensibility
* unified project root authority

---

# Runtime Architecture Overview

```

AI Runtime
│
▼
Filesystem Layer
│
▼
Runtime Tools
├ Preview Runtime
├ Command Runner
└ Service Integration Layer

```

---

# Development Loop

KForge supports the **vibe-coding workflow**:

```

prompt
→ AI edits files
→ preview / command feedback
→ user sees result instantly

```
```


