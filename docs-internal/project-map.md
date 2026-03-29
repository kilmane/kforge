
# 🗺 KForge Project Map

Location:

D:\kforge\docs-internal\project-map.md

Version: **v19**
Updated: **29/03/2026**

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

```
messages = [{ id, role, content, ts, action?, actions? }]
```

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
* fenced tool blocks
* natural-language tool calls (fallback for weaker models)

Triggers runtime execution.

---

## Tool Runtime Wrapper

File:

src/ai/tools/toolRuntime.js

Handles:

* consent gating
* lifecycle events
* result formatting
* transcript logging
* error handling

Runtime flow:

```
detect tool
→ consent
→ handler execution
→ result appended
```

---

## Tool Schemas (Model Interface)

File:

src/ai/tools/toolSchema.js

Defines the **model-visible tool interface**.

Responsibilities:

* tool names
* tool descriptions
* parameter shapes

Purpose:

Ensure the model receives a **clean and controlled tool inventory**.

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

# 3a Agent Runtime (Phase 4.10)

Files:

src/ai/agent/agentRunner.js
src/ai/panel/AiPanel.jsx

Phase 4.10 introduced a **tool-calling agent loop**.

The runtime now supports **multi-step reasoning with tools**.

Execution flow:

```
assistant reasoning
→ tool request
→ runtime executes tool
→ result returned to model
→ model continues reasoning
→ final response
```

Important rule:

The agent loop **does not bypass the existing runtime**.

All tool execution still flows through:

src/ai/tools/toolRuntime.js

This preserves:

* consent gating
* transcript visibility
* tool safety guarantees

---

## Agent Runner

File:

src/ai/agent/agentRunner.js

Responsibilities:

* execute the multi-step tool loop
* prevent infinite loops
* detect duplicate tool calls
* normalize tool-call payloads
* stop when a final answer is produced

Loop safety mechanisms include:

* duplicate tool-call detection
* step limits
* stop reasons

Example stop reasons:

* `final_text`
* `duplicate_tool_call`
* `max_steps_reached`

---

# 3b Agent Hardening (Phase 4.10.1)

Phase 4.10.1 improved reliability when using **weaker or less structured models**.

Primary files:

src/ai/panel/AiPanel.jsx
src/ai/agent/agentRunner.js

Improvements include:

* natural-language tool-call fallback parsing
* duplicate tool-call suppression
* injection of tool results into continuation prompts
* prevention of runaway directory exploration
* stricter consent handling for write operations
* transcript noise reduction

---

## Tool Safety Model

Read-only tools may run automatically:

* read_file
* list_dir
* search_in_file

Write tools require consent:

* write_file
* mkdir

This prevents weaker models from modifying files unintentionally.

---

# 3c Preview Runner (Dev Runtime)

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

---

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

# 3d Template Registry / Scaffold System

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

Template responsibilities include:

* scaffold metadata
* install behavior
* preview strategy
* detection hints
* compatible project kind mapping

---

# 3e Preview Surface

File:

src/runtime/PreviewPanel.jsx

Responsibilities:

* show preview state
* show detected project identity
* expose Generate / Install / Preview / Stop / Open / Clear actions
* show compatible template information
* refresh project shape after scaffold completion

PreviewPanel consumes detection results returned by:

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

```
registry entry
+ adapter implementation
```

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

## ServicePanel Responsibilities

Primary file:

src/runtime/ServicePanel.jsx

Responsibilities:

* task-grouped service selection
* active provider selection
* provider-aware action rendering
* provider-specific activity logs
* persisted UI state
* GitHub actions
* deploy guidance
* Supabase setup assistance

---

## ServicePanel Log Model

As of Phase 4.9.1, logs are **provider-keyed**.

Structure:

```
{
  github: [],
  supabase: [],
  stripe: []
}
```

Persisted state:

logsByService

This replaced the earlier shared log array.

Result:

* each provider maintains its own activity history
* switching providers does not mix logs
* returning to a provider restores that provider’s history

Logs reset when:

* workspace resets
* project root changes

---

# 5a Supabase Adapter

Primary implementation:

src-tauri/src/service.rs

Primary UI surface:

src/runtime/ServicePanel.jsx

Purpose:

Provide a guided Supabase connection workflow.

Capabilities include:

* readiness inspection
* Quick Connect
* environment variable detection
* `.env.example` generation
* `.env` creation helper
* Supabase client detection
* Supabase client install helper
* Supabase client file generation
* local Supabase config detection
* browser handoff to dashboard

---

## Supabase Detection Signals

Environment files:

* `.env`
* `.env.local`
* `.env.development`
* `.env.example`

Variables:

* SUPABASE_URL
* SUPABASE_ANON_KEY
* VITE_SUPABASE_URL
* VITE_SUPABASE_ANON_KEY

Empty values are treated as **not configured**.

Local detection:

supabase/config.toml

Client library:

@supabase/supabase-js

Client file candidates:

* src/lib/supabase.js
* src/lib/supabase.ts

---

# 5b GitHub Adapter

Primary implementation:

src-tauri/src/service.rs

Primary UI surface:

src/runtime/ServicePanel.jsx

Capabilities include:

* detect Git repository
* detect remote
* publish repository
* open GitHub repo
* pull latest changes
* push changes
* import GitHub repository during New Project

Authentication handled by **GitHub CLI**.

---

# 5c Smart Deploy Guidance

Primary file:

src/runtime/ServicePanel.jsx

Uses shared identity from:

previewDetectTemplates(...)

Mapping:

* static-html → Netlify or Vercel
* vite-react → Netlify or Vercel
* nextjs → Recommended: Vercel

Fallback remains calm:

Good fit: Netlify or Vercel

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

Focus mode is a surface promotion.

---

# 7 Operational Flow Map

## Standard Local Development

Open folder
→ Generate optional template
→ Install
→ Preview
→ Open
→ Iterate

---

## AI Editing Loop

Open folder
→ prompt AI
→ AI edits files
→ preview / install / rerun

---

## Agent Workflow

Open folder
→ prompt AI
→ AI requests tools
→ tools execute
→ AI continues reasoning
→ AI returns final answer

---

## GitHub Flow

Open folder
→ Services
→ Publish
→ Push changes
→ Open on GitHub or Pull latest

---

## Deploy Flow

Open folder
→ Services
→ Deploy
→ choose Vercel or Netlify
→ provider flow

---

## Backend Flow (Supabase)

Open folder
→ Services
→ Backend → Supabase
→ Quick Connect
→ Create `.env`
→ install client
→ create client file
→ connect backend

---

# 8 Stable Milestone Summary

Current stable milestone includes:

* AI message architecture
* tool runtime
* agent runtime
* preview runner
* scaffold system
* command runner
* service integration layer
* GitHub workflow
* deploy guidance
* Supabase backend integration
* Supabase Quick Connect
* per-service log isolation
* tool-calling agent loop
* agent runtime hardening for weaker models

---


