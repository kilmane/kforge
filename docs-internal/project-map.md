
### `docs-internal/project-map.md`

```markdown
# 🗺 KForge Project Map

Location:

D:\kforge\docs-internal\project-map.md

Version: v14  
Updated: 24/03/2026

Purpose: architectural topology & execution responsibility map.

---

# 1 Core Application Architecture

## Application Root

File:

src/App.js

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

src/App.js

Structure:

messages = [{ id, role, content, ts, action?, actions? }]

Everything renders from this.

There are **no duplicate message systems**.

---

## Rendering Surfaces

### Chat Surface

File:

src/ai/panel/AiPanel.jsx

Filtered projection of message store.

Shows:

* assistant messages
* AI messages
* tool-related system messages
* consent prompts

---

### Transcript Surface

File:

src/ai/panel/TranscriptPanel.jsx

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

src/ai/panel/AiPanel.jsx

Detects:

* JSON tool payloads
* XML tool payloads

Triggers runtime execution.

---

## Tool Runtime Wrapper

File:

src/ai/tools/toolRuntime.js

Handles:

* consent gating
* lifecycle events
* result formatting

Runtime flow:

detect tool
→ consent
→ handler execution
→ result appended

---

## Tool Handlers

File:

src/ai/tools/handlers/index.js

Current tools:

* read_file
* write_file
* list_dir
* search_in_file
* mkdir

Filesystem layer:

src/lib/fs.js

Ensures project-root safety.

---

# 3b Preview Runner (Dev Runtime)

Backend:

src-tauri/src/preview.rs

Frontend bridge:

src/runtime/previewRunner.js

UI surface:

src/runtime/PreviewPanel.jsx

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
* identify a more specific template when dependency signals allow it

---

## Preview Detection

Preview behavior is determined automatically based on project structure.

Detection occurs in **two stages**.

### Stage 1 — Coarse Detection (Backend)

Rust backend determines the general project type.

Primary command:

preview_detect_kind

Current coarse kinds include:

* static
* package

### Stage 2 — Template Identification (Frontend)

File:

src/runtime/previewRunner.js

The frontend then refines that result using the template registry.

Key helpers:

* findTemplatesByDetectedKind(...)
* identifyTemplateFromDependencies(...)

Dependency hints from package.json are used to detect a specific template when possible.

Current recognized template identities:

* Static HTML
* Vite + React
* Next.js

Important rule:

Next.js matching is prioritized before broader React/Vite hint matches so that a Next.js project is not misclassified as Vite + React.

---

# 3c Template Registry / Scaffold System

Registry file:

src/runtime/templateRegistry.js

Backend scaffold implementation:

src-tauri/src/scaffold.rs

Frontend trigger surface:

src/runtime/PreviewPanel.jsx

Current scaffold commands:

* scaffold_static_html
* scaffold_vite_react
* scaffold_nextjs

Current template IDs:

* static-html
* vite-react
* nextjs

Current template responsibilities include:

* scaffold command metadata
* install behavior
* preview strategy
* detection hints
* compatible project kind mapping

Developer note exists at the top of templateRegistry.js.

When adding new templates, maintainers are reminded to also review:

* src/runtime/previewRunner.js
* src/runtime/PreviewPanel.jsx
* src/runtime/ServicePanel.jsx

This is specifically to keep preview detection and deploy guidance aligned.

---

# 3d Preview Surface

File:

src/runtime/PreviewPanel.jsx

Responsibilities:

* show preview state
* show detected project identity
* expose Generate / Install / Preview / Stop / Open / Clear actions
* show compatible template information when useful
* refresh project shape after scaffold completion

PreviewPanel consumes the shared detection result returned by:

previewDetectTemplates(...)

Returned shape includes:

* kind
* compatibleTemplates
* detectedTemplate

---

# 4 Command Runner Architecture

Backend:

src-tauri/src/command_runner.rs

Frontend bridge:

src/runtime/commandRunner.js

UI surface:

src/runtime/CommandRunnerPanel.jsx

Capabilities:

* run shell commands inside project root
* stream stdout/stderr
* one command at a time
* Windows support via cmd /C

Events:

* kforge://command/log
* kforge://command/status

Preview and Terminal are mutually exclusive collapsibles.

---

# 5 Service Integration Layer

Backend:

src-tauri/src/service.rs

Frontend bridge:

src/runtime/serviceRunner.js

Registry:

src/runtime/serviceRegistry.js

UI:

src/runtime/ServicePanel.jsx

Purpose:

Unified architecture for external service integrations.

Pattern:

registry entry + adapter implementation

---

## Current Service Families

### Code

* GitHub

### Deploy

* Vercel
* Netlify

### Backend

* Supabase

### Payments

* Stripe

OpenAI remains registered in the service layer for future integration work.

---

## Current GitHub Actions

Exposed through Services and supporting flows:

* publish local repo
* detect repo state
* open on GitHub
* pull latest
* push changes
* clone/import through New Project flow

---

## Current Deploy Actions

Exposed through Services → Deploy:

* open Vercel import URL for current GitHub repo
* open Netlify start/import flow
* block deploy when GitHub is not connected
* show repo-aware deploy hints

---

# 5b Smart Deploy Guidance

Primary file:

src/runtime/ServicePanel.jsx

ServicePanel now consumes shared project identity from:

previewDetectTemplates(...)

This avoids duplicate framework detection logic inside Services.

Key mapping helper:

getDeployProjectIdentity(...)

Current smart deploy mappings:

* static-html / static → Good fit: Netlify or Vercel
* vite-react → Good fit: Netlify or Vercel
* nextjs → Recommended: Vercel

Provider-specific hints are also supported.

Examples:

* Vercel + Next.js → Recommended for Next.js projects.
* Netlify + Next.js → Next.js usually fits best on Vercel.

Fallback behavior remains calm:

* Recommendation: Good fit: Netlify or Vercel

This fallback is user-facing.

Developer maintenance reminder is registry-facing, not user-facing.

---

# 6 Layout / Dock Architecture

Dock shell file:

src/layout/DockShell.jsx

Modes:

* bottom
* full

Meaning:

* bottom = dock below workspace
* full = focus mode replaces main layout

Focus mode is a surface promotion, not a resized dock.

---

# 7 Operational Flow Map

## Standard Local Development

Open folder
→ Generate optional template
→ Install
→ Preview
→ Open
→ Iterate

## AI Editing Loop

Open folder
→ prompt AI
→ AI edits files
→ preview / install / rerun

## GitHub Flow

Open folder
→ Services
→ Publish
→ Push changes
→ Open on GitHub or Pull latest

## Deploy Flow

Open folder
→ Services
→ Deploy
→ choose Vercel or Netlify
→ follow provider browser flow

## Smart Deploy Flow

Open folder
→ project identity detected through preview pipeline
→ Services → Deploy
→ recommendation shown based on template/project type
→ provider opened in browser

---

# 8 Stable Milestone Summary

Current stable milestone includes:

* AI message architecture
* safe filesystem tools
* preview runtime
* scaffold templates
* command runner
* service integration layer
* GitHub workflow
* GitHub import
* deploy shortcuts
* smart deploy guidance

This project map should be updated whenever:

* execution authority moves
* registry responsibilities change
* a new runtime lane appears
* deploy recommendation mappings expand
```

---
