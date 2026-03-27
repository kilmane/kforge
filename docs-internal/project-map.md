

# 🗺 KForge Project Map

Location:

D:\kforge\docs-internal\project-map.md

Version: v18
Updated: 27/03/2026

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

## ServicePanel Responsibilities

Primary file:

src/runtime/ServicePanel.jsx

ServicePanel currently owns:

* task-grouped service selection
* active provider selection
* provider-aware action rendering
* provider-specific activity logs
* persisted service-panel UI state
* GitHub action surface
* deploy guidance surface
* Supabase guided setup surface

The panel is task-first, but runtime behavior is provider-aware.

---

## ServicePanel Log Model

As of Phase 4.9.1, ServicePanel log persistence is **provider-keyed** rather than using one shared array.

Conceptual structure:

```javascript
{
  github: [],
  supabase: [],
  stripe: [],
}
```

This state is persisted as:

logsByService

This replaced the earlier shared:

logs

Result:

* each provider has its own activity history
* switching providers does not mix logs
* returning to a provider restores that provider's earlier log history

Logs still reset when:

* workspace resets
* project root changes

---

# 5a Supabase Adapter

The Supabase adapter is the **first backend service integration** attached to the Services layer.

Primary implementation:

src-tauri/src/service.rs

Primary UI surface:

src/runtime/ServicePanel.jsx

Purpose:

Provide a beginner-friendly connection workflow for Supabase-backed projects.

---

## Supabase Adapter Responsibilities

The adapter now performs **inspection, quick-connect guidance, and guided setup actions**.

Capabilities include:

* Supabase readiness inspection
* Quick Connect entry action
* environment variable detection
* detection of empty versus non-empty env values
* `.env.example` generation
* `.env` creation helper
* Supabase client library detection
* Supabase client installation helper
* Supabase client file generation
* local Supabase config detection
* guided log output for the user
* browser handoff to Supabase dashboard

---

## Supabase Detection Signals

The adapter checks for the following indicators.

Environment files:

* `.env`
* `.env.local`
* `.env.development`
* `.env.example`

Environment variables:

* `SUPABASE_URL`
* `SUPABASE_ANON_KEY`
* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`

Important detection rule:

Empty values such as:

`SUPABASE_URL=`

are treated as **not set**.

Local Supabase project:

* `supabase/config.toml`

Supabase client library:

* `@supabase/supabase-js`
* Supabase dependency signals in `package.json`

Supabase client file candidates:

* `src/lib/supabase.js`
* `src/lib/supabase.ts`

---

## Supabase Quick Connect

Phase 4.9 adds a faster guided entry point:

Quick Connect

Command:

supabase_quick_connect

Purpose:

Let the user start from:

I want Supabase
→ inspect current setup
→ guide the next required step

This reduces setup friction for beginners and vibe coders.

Quick Connect is layered on top of the existing Supabase checks and actions rather than replacing them.

---

## Cloud and Local Supabase Coverage

The Supabase lane supports both:

### Cloud Supabase

Typical connection sources:

* project URL from Supabase dashboard
* anon key from Supabase dashboard

Typical URL shape:

* `https://your-project.supabase.co`

### Local Supabase

Typical detection signals:

* `supabase/config.toml`
* local URL such as `http://127.0.0.1:54321`

This keeps the backend lane useful for both hosted and local workflows.

---

## Supabase Environment Helper

If `.env.example` does not exist:

KForge creates a **template file** containing:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The user can then run:

Create `.env` file

This copies:

.env.example → .env

If `.env` already exists, the operation is skipped.

---

## Supabase Client Installation

KForge provides a guided action:

Install Supabase client

Command executed:

pnpm add @supabase/supabase-js

This installs the official Supabase JavaScript client library.

In Phase 4.8.3 this action was hardened for desktop Windows use by running through a shell execution path rather than depending only on direct binary lookup.

Current behavior also includes:

* streamed install logs
* surfaced package-manager output on failure
* clearer next-step guidance after install

---

## Supabase Client File

KForge can also generate a **Supabase client file**.

Typical generated location:

src/lib/supabase.js

Purpose:

Provide a simple reusable Supabase connection wrapper for frontend code.

Typical structure:

createClient(
import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL,
import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY
)

If the client file already exists, KForge leaves it unchanged.

Terminology is intentionally standardized as:

**Supabase client file**

---

## Supabase Panel UX Shape

The Supabase panel is intentionally split into two layers.

### Compact first-step guidance

The panel emphasizes a clear first action:

"Check Supabase setup"

Quick Connect is available as the faster guided route for users who want a more streamlined setup pass.

### Expandable extra help

Additional explanation is available via a:

More info

toggle.

This keeps the default panel compact while still supporting beginners.

---

## Supabase Activity Log

Supabase activity is rendered inside the Supabase provider log in:

src/runtime/ServicePanel.jsx

Current behavior:

* each user action begins a new visible log section
* log sections are separated visually
* timestamps are included
* quoted action labels are highlighted
* repeated Supabase actions are easier to distinguish from older output

Examples of highlighted actions:

* "Check Supabase setup"
* "Create .env file"
* "Install Supabase client"
* "Create Supabase client file"
* "Supabase Quick Connect"

This keeps the flow readable without requiring a wizard UI.

---

## Supabase Dashboard Access

The Supabase panel also includes a quick link:

Open Supabase

This opens:

[https://supabase.com/dashboard](https://supabase.com/dashboard)

This allows the user to easily copy connection values.

---

# 5b GitHub Adapter

Primary implementation:

src-tauri/src/service.rs

Primary UI surface:

src/runtime/ServicePanel.jsx

GitHub capabilities include:

* detect whether current folder is already a Git repo
* detect whether a remote exists
* publish local project to a new GitHub repository
* open current repository on GitHub in browser
* pull latest changes into an existing local repo
* push local changes to GitHub
* support GitHub import during New Project flow

Authentication is delegated to GitHub CLI rather than managed directly by KForge.

---

# 5c Smart Deploy Guidance

Primary file:

src/runtime/ServicePanel.jsx

ServicePanel consumes shared project identity from:

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

## Backend Flow (Supabase)

Open folder
→ Services
→ Backend → Supabase
→ Quick Connect or "Check Supabase setup"
→ "Create .env file" if needed
→ Add connection values
→ "Install Supabase client"
→ "Create Supabase client file"
→ import client in application code

## Service Log Flow

Open folder
→ use a provider inside Services
→ logs append to that provider only
→ switch providers without log mixing
→ return to provider and see earlier provider history

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
* Supabase backend integration
* guided Supabase setup actions
* Supabase Quick Connect
* Supabase polish for calmer UX and clearer log flow
* per-service Services log isolation

This project map should be updated whenever:

* execution authority moves
* registry responsibilities change
* a new runtime lane appears
* deploy recommendation mappings expand
* ServicePanel persistence structure changes


