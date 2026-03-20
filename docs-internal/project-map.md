
# 🗺 KForge Project Map

**Location:**
D:\kforge\docs-internal\project-map.md

**Version:** v10
**Updated:** 20/03/2026

Purpose: architectural topology & execution responsibility map.

---

# 1 Core Application Architecture

## Application Root

File:

```text
src/App.js
````

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

```text
src/App.js
```

Structure:

```text
messages = [{ id, role, content, ts, action?, actions? }]
```

Everything renders from this.

There are **no duplicate message systems**.

---

## Rendering Surfaces

### Chat Surface

File:

```text
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

```text
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

```text
src/ai/panel/AiPanel.jsx
```

Detects:

* JSON tool payloads
* XML tool payloads

Triggers runtime execution.

---

## Tool Runtime Wrapper

File:

```text
src/ai/tools/toolRuntime.js
```

Handles:

* consent gating
* lifecycle events
* result formatting

Runtime flow:

```text
detect tool
→ consent
→ handler execution
→ result appended
```

---

## Tool Handlers

File:

```text
src/ai/tools/handlers/index.js
```

Current tools:

* read_file
* write_file
* list_dir
* search_in_file
* mkdir

Filesystem layer:

```text
src/lib/fs.js
```

Ensures project-root safety.

---

# 3b Preview Runner (Dev Runtime)

Backend:

```text
src-tauri/src/preview.rs
```

Frontend bridge:

```text
src/runtime/previewRunner.js
```

UI surface:

```text
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

```text
package.json → package project
index.html → static project
```

Implemented in:

```text
preview_detect_kind()
```

inside:

```text
src-tauri/src/preview.rs
```

Result returned to frontend:

```text
static
package
```

---

### Stage 2 — Template Identification (Frontend)

After coarse detection, the frontend attempts to identify the **actual framework template**.

Implemented in:

```text
src/runtime/previewRunner.js
```

Process:

```text
preview_detect_kind()
        ↓
read package.json
        ↓
inspect dependencies / devDependencies
        ↓
match against Template Registry hints
        ↓
identify framework template
```

Example detection signals:

| Dependency       | Template     |
| ---------------- | ------------ |
| `next`           | Next.js      |
| `vite` + `react` | Vite + React |
| no package.json  | Static HTML  |

The result returned to the UI includes:

```text
{
  kind,
  compatibleTemplates,
  detectedTemplate
}
```

Where:

* `kind` → coarse backend detection
* `detectedTemplate` → registry-based framework identification

---

## Package Project Preview

Commands executed:

```text
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

```text
index.html
```

KForge starts an internal static server.

Example URL:

```text
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

```text
std::process::Command
```

Tracks child process PID.

Stop uses:

```text
taskkill /PID <pid> /T /F
```

Static preview uses an internal Rust HTTP server.

Events emitted:

```text
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
* previewDetectTemplates (framework-aware detection)

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
* template-aware project detection
* post-scaffold project re-detection

UI adapts based on project type.

### Static projects

```text
Preview → Open
```

Install is hidden for static-only projects.

### Package projects

```text
Install → Preview → Open
```

If a template is identified the UI shows:

```text
Next.js project detected
```

Otherwise it falls back to:

```text
Package project detected
```

---

# 3c Scaffold System

Backend implementation:

```text
src-tauri/src/scaffold.rs
```

Frontend trigger:

```text
src/runtime/PreviewPanel.jsx
```

Template registry:

```text
src/runtime/templateRegistry.js
```

Registered Tauri commands:

```text
scaffold_static_html
scaffold_vite_react
scaffold_nextjs
```

---

## Scaffold Behavior

Scaffold generates project templates directly in the workspace root.

Example:

```text
workspace/
├ src/
├ package.json
├ vite.config.js
└ index.html
```

No nested folder is created.

---

## Current Templates (Phase 4.4 baseline)

KForge currently supports three template generators.

### Static HTML/CSS/JS

Behavior:

* generates files directly in the workspace root
* no dependency install required
* preview can run immediately

Files created:

```text
index.html
styles.css
script.js
```

This template is registry-backed and appears again in the Generate menu.

---

### Vite + React

Command executed:

```text
pnpm dlx create-vite@latest . --template react --no-interactive
```

Behavior:

* lightweight scaffold
* dependencies installed separately via Install button

---

### Next.js

Command executed:

```text
pnpm create next-app@latest . --yes
```

Behavior:

* heavier scaffold
* dependencies installed during generation
* significantly larger dependency tree

This is expected because `create-next-app` performs a full dependency install.

---

## Scaffold Logging

Scaffold emits preview log and status events so generation appears in the existing Preview panel.

Events emitted:

```text
kforge://preview/log
kforge://preview/status
```

Static HTML generation now uses short, immediate log messages suited to local file creation rather than package-manager scaffolding.

Example flow:

```text
Generating Static HTML starter...
Created: index.html, styles.css, script.js
Ready: Static HTML does not need Install. Click Preview, then Open.
scaffold complete: <path>
```

---

## Important UX Notes

After scaffold completes, PreviewPanel re-runs project detection so the UI reflects the new project shape immediately.

This fixes the earlier stale-state issue where Static HTML generation could leave Install visible until a later refresh.

Current intended behavior:

* Static HTML generate → Install hidden
* Vite generate → Install available
* Next.js generate → Install may still appear available, though dependencies are typically already present

The Next.js install-state nuance is acceptable for now.

---

## Future Direction — Template Registry

Phase **4.3.7 — Template Registry** introduced a structured template system.

Templates now define:

* metadata
* scaffold commands
* preview compatibility
* detection hints
* install behavior

The registry allows KForge to support additional frameworks without hardcoding logic in the UI.

Future templates may include:

```text
Astro
Vue
Svelte
Expo / React Native
```

---

# 3d Command Runner Panel

Backend implementation:

```text
src-tauri/src/command_runner.rs
```

Frontend bridge:

```text
src/runtime/commandRunner.js
```

UI surface:

```text
src/runtime/CommandRunnerPanel.jsx
```

Panel integration:

```text
src/ai/panel/AiPanel.jsx
```

---

## Responsibilities

Command Runner provides a simple in-app terminal surface for user-triggered commands inside the active workspace/project root.

Capabilities:

* run one command at a time
* stream stdout/stderr logs to the frontend
* expose run status to the UI
* execute commands in the active project root
* support shell built-ins on Windows

---

## Backend Behavior

Command execution is rooted in the current workspace/project path.

On Windows, commands are executed via:

```text
cmd /C <command>
```

This is important because shell built-ins such as:

```text
dir
echo hello
```

do not work correctly when treated as standalone executables.

Events emitted:

```text
kforge://command/log
kforge://command/status
```

The backend currently enforces a simple single-command-at-a-time model.

---

## Frontend Behavior

The frontend subscribes to command log/status events and renders a terminal-style log view plus command input.

Current UX behavior:

* input command
* run command
* stream logs into terminal panel
* clear input after run
* return focus to input after run

Validated examples:

```text
node -v
git status
dir
```

---

## Panel Layout Integration

Within `AiPanel.jsx`, Preview and Terminal are separate collapsible sections.

Behavior:

* Preview and Terminal share the same panel area
* opening one closes the other
* they never appear split side-by-side in the same space

This preserves a focused single-runtime surface while supporting both preview and command workflows.

---

# 3e Service Integration Layer (Foundation)

Backend implementation:

```text
src-tauri/src/service.rs
```

Frontend bridge:

```text
src/runtime/serviceRunner.js
```

Registry:

```text
src/runtime/serviceRegistry.js
```

UI surface:

```text
src/runtime/ServicePanel.jsx
```

Panel integration:

```text
src/ai/panel/AiPanel.jsx
```

Registered Tauri command:

```text
service_setup
```

---

## Responsibilities

Service Integration Layer provides a shared architecture for future external integrations.

This phase introduces the **foundation only**.

Its job is to prevent future services from becoming one-off subsystems.

Planned integration types include:

* Supabase
* Stripe
* OpenAI
* GitHub
* deployment providers such as Vercel and Netlify

---

## Architectural Role

The Service Layer sits alongside the other runtime systems:

```text
Template Registry
Service Registry
Preview Runtime
Command Runtime
```

This means future integrations plug into an existing lane rather than introducing new architecture.

The key design idea is:

```text
new service = registry entry + adapter implementation
```

not:

```text
new service = new subsystem
```

---

## Service Registry

`serviceRegistry.js` defines service metadata for supported or planned integrations.

Current example fields include:

* `id`
* `name`
* `description`
* `status`
* `envVars`
* `setupCommand`

Current placeholder entries include:

* Supabase
* Stripe
* OpenAI

The registry is the frontend source of truth for what services KForge knows about.

---

## Frontend Runtime Bridge

`serviceRunner.js` provides the frontend runtime bridge.

Responsibilities:

* invoke service setup command
* subscribe to service log events
* subscribe to service status events

Events used:

```text
kforge://service/log
kforge://service/status
```

This mirrors the same architectural pattern already used by Preview and Command Runner.

---

## Backend Behavior

`service.rs` currently provides a placeholder backend command:

```text
service_setup
```

Current behavior:

* validates project path
* validates service id
* emits status events
* emits log events
* enforces one service setup at a time

This phase does **not** yet perform real integration work.

No external accounts are connected.
No configuration files are generated.
No environment variables are written.

The backend currently exists to define the runtime lane and event contract.

---

## Service UI

`ServicePanel.jsx` provides a simple in-app panel for service setup.

Current UI responsibilities:

* show known services
* show status badges
* show declared environment variables
* trigger placeholder setup for available services
* render service logs
* display current workspace/project path

Current design intent:

* minimal
* guided
* explicit
* not a DevOps dashboard

Within `AiPanel.jsx`, Services is a separate collapsible section alongside Preview and Terminal.

Behavior:

* Services shares the same runtime panel area
* opening Services closes Preview and Terminal
* only one runtime surface is visible at a time

This keeps the right-hand workspace tools focused and calm.

---

## Current Phase Boundary

Phase 4.5 intentionally introduces architecture only.

Not implemented yet:

* real Supabase setup
* real Stripe setup
* real OpenAI setup
* GitHub publishing
* deploy pipeline actions

Those future phases should mainly attach adapters to the Service Layer rather than inventing fresh UI/runtime systems.

---

# 3f Workspace Refresh Events

Event emitted when filesystem changes occur:

```text
kforge://workspace/refresh
```

Handled in:

```text
src/App.js
```

Explorer refreshes after:

* AI file writes
* directory creation
* scaffold generation

---

# 4 Filesystem Layer

File:

```text
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

```text
src/layout/DockShell.jsx
```

Modes:

### Bottom Mode (default)

```text
dockMode="bottom"
```

### Focus Mode

```text
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
* template-aware project detection
* registry-driven extensibility
* single unified project root

System workflow:

```text
AI → filesystem edits → runtime tools → browser feedback
```

This architecture supports the **vibe coding loop**:

```text
prompt
→ AI edits files
→ preview or command feedback
→ user sees result instantly
```

