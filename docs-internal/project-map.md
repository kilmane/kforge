
# 🗺 KForge Project Map

Location:

D:\kforge\docs-internal\project-map.md

Version: **v23**
Updated: **03/04/2026**

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
* AI capability-awareness context injection

This is the **AI execution brain**.

App.js is also the **authority for the current project root**.

---

# 2 AI System Architecture

## Single Message Store

Defined in:

src/App.js

Structure:

```text
messages = [{ id, role, content, ts, action?, actions? }]
````

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

```text
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

```text
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

The **user-facing label is Terminal**.

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

```text
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
* Stripe setup assistance

---

## ServicePanel Log Model

As of Phase 4.9.1, logs are **provider-keyed**.

Structure:

```text
{
  github: [],
  supabase: [],
  stripe: []
}
```

Persisted state:

logsByService

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

# 5b Supabase Developer Assist (Phase 5.2)

Phase 5.2 extends the Supabase adapter with **developer-assist integration helpers**.

Primary files:

* src-tauri/src/service.rs
* src-tauri/src/lib.rs
* src/runtime/serviceRunner.js
* src/runtime/ServicePanel.jsx

New commands:

* supabase_create_read_example
* supabase_create_insert_example
* supabase_create_query_helper

Generated files:

```text
src/examples/supabaseExample.js
src/examples/supabaseInsertExample.js
src/lib/supabaseQueries.js
```

Purpose:

Provide **small starter patterns** for integrating Supabase reads and writes into an existing project.

These artifacts are intentionally lightweight and designed to:

* help beginners understand query structure
* give copyable patterns for real app code
* reduce the learning gap between frontend development and database interaction

Important bug fixed during testing:

The developer-assist commands were originally implemented in `service.rs` but not registered in `src-tauri/src/lib.rs`.

Phase 5.2 testing exposed this issue and corrected the command wiring.

---

# 5c GitHub Adapter

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

Important distinction:

* **Services → Code → GitHub** is for actions on the **current open local project**
* **New Project → Import from GitHub** is the GitHub import flow

---

# 5d Smart Deploy Guidance

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

# 5e Stripe Adapter

Primary implementation:

src-tauri/src/service.rs

Primary UI surface:

src/runtime/ServicePanel.jsx

Frontend bridge:

src/runtime/serviceRunner.js

Registry surface:

src/runtime/serviceRegistry.js

AI-awareness surface:

src/ai/capabilities/kforgeServiceWorkflows.js

Discovery support:

src/ai/capabilities/discoverCapabilities.js

Purpose:

Provide a guided Stripe payments setup workflow inside:

Services
→ Payments → Stripe

Capabilities include:

* readiness inspection
* detection of `STRIPE_SECRET_KEY`
* detection of `STRIPE_PUBLISHABLE_KEY`
* detection of `STRIPE_WEBHOOK_SECRET`
* `.env.example` generation or update for Stripe placeholders
* `.env` creation helper
* browser handoff to Stripe dashboard
* browser handoff to Stripe docs
* browser handoff to Stripe webhook docs
* webhook-readiness guidance for server-side Stripe event flows

Scope rule:

Stripe adapter is **guided setup assistance**, not a payments dashboard.

---

# 6 AI Capability Awareness Architecture (Phase 5.x)

Primary files:

* src/ai/capabilities/kforgeCapabilities.js
* src/ai/capabilities/kforgeServiceWorkflows.js
* src/ai/capabilities/kforgePreviewWorkflows.js
* src/ai/capabilities/kforgeTerminalWorkflows.js
* src/ai/capabilities/discoverCapabilities.js

Purpose:

Teach the AI about **real KForge workflows** so it can guide users toward KForge-first actions instead of performing everything inside chat.

---

## Capability Self-Discovery

File:

src/ai/capabilities/discoverCapabilities.js

Discovery sources:

* serviceRegistry.js
* templateRegistry.js

Purpose:

Allow AI awareness to detect **real runtime capabilities** and reduce manual maintenance.

---

## Relevance Filtering

User prompts are passed into the capability formatter.

The formatter returns **only relevant workflow context**.

Benefits:

* smaller prompts
* less noise
* better workflow matching

---

## AI Guidance Boundaries

Capability awareness must remain **advisory only**.

It must never:

* auto-open Services
* auto-select providers
* change Focus Mode
* hijack UI panels

Safe behavior:

* infer relevant workflow
* recommend KForge-first paths
* continue in chat only if user bypasses KForge

---

# 7 Layout / Dock Architecture

Dock shell file:

src/layout/DockShell.jsx

Modes:

* bottom
* full

Meaning:

* bottom = dock below workspace
* full = focus mode replaces main layout

Focus mode is a **surface promotion**.

---

# 8 Operational Flow Map

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
→ Code → GitHub
→ Publish / Push / Pull / Open repository

Import flow:

New Project
→ Import from GitHub

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
→ generate example queries
→ connect backend

---

## Payments Flow (Stripe)

Open folder
→ Services
→ Payments → Stripe
→ Check Stripe setup
→ Create `.env`
→ Open Stripe dashboard / docs / webhook docs
→ continue project setup

---

## Preview Template Flow

Open folder
→ Preview
→ Generate
→ Install if needed
→ Preview
→ Open

---

## Terminal Workflow

Open folder
→ AI Panel
→ Terminal
→ run command

Example commands:

* pnpm install
* pnpm dev
* git status

---

## Workflow-Aware AI Flow

User asks for a capability
→ AI checks whether KForge already has a workflow
→ AI guides user to the KForge-first path
→ AI continues in chat only if the user explicitly bypasses KForge

---

# 9 Stable Milestone Summary

Current stable milestone includes:

* AI message architecture
* tool runtime
* agent runtime
* preview runner
* scaffold system
* command runner
* terminal panel
* service integration layer
* GitHub workflow
* deploy guidance
* Supabase backend integration
* Supabase Quick Connect
* Supabase Developer Assist starter artifacts
* Stripe adapter
* Stripe webhook-readiness guidance
* per-service log isolation
* AI capability-awareness system
* preview-aware AI guidance
* terminal-aware AI guidance
* service registry discovery
* template registry discovery

---

# 10 Next Architecture Lane

Next planned phases:

**Phase 5.3 — OpenAI Adapter**
**Phase 5.4 — Future Template Expansion**

Longer-term direction:

**Phase 6 — Model Guidance & Routing**

Possible work:

* model capability registry
* model routing
* agent templates
* smart model selection
* improved AI workflow orchestration

```

