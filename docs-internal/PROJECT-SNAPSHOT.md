
# 🧭 KForge — PROJECT SNAPSHOT (Internal Canonical State)

Location:
D:\kforge\docs-internal\PROJECT-SNAPSHOT.md

Last Updated: **April 3rd, 2026**

Phase: **5.2 — Supabase Developer Assist**
Status: **Testing resumed, fixes, polish, and routing hardening checkpointed**

Stable restore tags now available:

* `phase-4.10-agent-loop-stable`
* `phase-4.10.1-agent-hardening-stable`
* `phase-5.2-awareness-stable`
* `phase-5.2-supabase-dev-assist-midtest`
* `phase-5.2-supabase-dev-assist-polish`
* `routing-hardening-2026-04-03`

---

This file is the authoritative operational reference.

If anything conflicts with:

• chat memory  
• assumptions  
• scattered notes  

This file wins.

Not user-facing.

---

# 🟠 1️⃣ Project Overview

KForge is a desktop-first developer workspace built around:

• A GPT-clean AI surface  
• Secure filesystem access  
• Explicit, consent-gated tooling  
• Calm, attention-disciplined UI  

KForge is **chat-first**, not tool-first.

---

# 🟣 2️⃣ Current Architectural Reality

## 🧠 Execution Authority

AI execution still lives primarily in:

src/App.js

This file owns:

• canonical message state  
• AI request building  
• context injection  
• patch instruction injection  
• retry logic  
• project lifecycle control  
• workspace root management  
• TranscriptBubble definition  

If AI behaves incorrectly → start here.

---

# 💬 Single Message Store (Critical Rule)

There is exactly one message array:

messages (owned by App.js)

Everything renders from this.

Structure:

id, role, content, ts, optional action metadata

No duplicate message systems exist.

---

# 🧩 Rendering Surfaces

Two projections of the same message store.

## Chat View (GPT-clean)

File:

src/ai/panel/AiPanel.jsx

Shows:

• assistant messages  
• AI messages  
• relevant tool messages  
• consent prompts  

---

## Transcript View

File:

src/ai/panel/TranscriptPanel.jsx

Full system log.

Contains:

• user / assistant / system / tool messages  
• Retry + Clear controls  
• consent actions  

Architectural rule:

Chat = filtered projection  
Transcript = complete system log

---

# 🟢 3️⃣ Layout & Dock Architecture

## DockShell

File:

src/layout/DockShell.jsx

Supports two layout modes.

### Bottom Mode (default)

dockMode = "bottom"

Dock sits under main workspace.

---

### Focus Mode

dockMode = "full"

Dock replaces main layout.

Focus mode is a **surface promotion**, not a resized dock.

---

# 🔵 4️⃣ Tool Runtime Pipeline

## Tool Detection

File:

src/ai/panel/AiPanel.jsx

Handles:

• tool payload parsing  
• JSON/XML tool formats  
• natural-language fallback parsing for weaker models  
• deduplication  
• consent gating  
• execution dispatch  
• agent continuation handoff  

---

## Tool Runtime Wrapper

File:

src/ai/tools/toolRuntime.js

Responsibilities:

• consent enforcement  
• lifecycle messages  
• transcript logging  
• error formatting  

Runtime flow:

detect tool  
→ consent request  
→ handler execution  
→ append result  

---

## Tool Schemas

File:

src/ai/tools/toolSchema.js

Responsibilities:

• exposes model-facing tool descriptions  
• defines available tool names and parameters  
• keeps model-visible tool inventory aligned with real handlers  

Current model-visible tools:

• read_file  
• list_dir  
• search_in_file  
• write_file  
• mkdir  

---

## Tool Handlers

File:

src/ai/tools/handlers/index.js

Tools currently available:

• read_file  
• list_dir  
• write_file  
• search_in_file  
• mkdir  

Filesystem authority:

src/lib/fs.js

App.js sets project root.  
fs.js enforces safety.

---

## Agent Loop

Files:

src/ai/agent/agentRunner.js  
src/ai/panel/AiPanel.jsx

Phase 4.10 introduced a real **tool-calling agent loop**.

Core flow:

model  
→ tool request  
→ consent/runtime execution  
→ tool result fed back to model  
→ continued reasoning  
→ final answer  

This loop sits **above** the existing tool runtime and does **not bypass** it.

Important rule:

All tool execution still flows through:

src/ai/tools/toolRuntime.js

This preserves explicit consent behavior and transcript visibility.

---

## Agent Loop Hardening

Phase 4.10.1 added hardening for weaker and more inconsistent models.

Improvements include:

• duplicate tool-call detection  
• prevention of repeated identical tool executions  
• support for natural-language tool-call recovery such as `list_dir(.)`  
• bounded inspection guidance for workspace-analysis tasks  
• write tools no longer treated as safe automatic actions  
• local tool-result injection so the continuation model sees fresh results immediately  
• calmer transcript behavior during duplicate suppression  

Read-only tools that may auto-run:

• read_file  
• list_dir  
• search_in_file  

Write tools now require consent:

• write_file  
• mkdir  

This change was made specifically because weaker models could otherwise attempt unwanted file creation during inspection flows.

---

# 🟤 4b Preview Runtime

Backend:

src-tauri/src/preview.rs

Frontend bridge:

src/runtime/previewRunner.js

UI surface:

src/runtime/PreviewPanel.jsx

Preview runner provides:

• dependency installation  
• development server startup  
• static site preview  
• log streaming  
• URL detection  
• controlled process stop  
• preview log persistence  
• project-type detection  
• registry-aware template identification  

---

## Preview Detection Model

Detection now works in two stages.

### Stage 1 — coarse project kind

Backend command:

preview_detect_kind

Current kinds include:

• static  
• package  

### Stage 2 — registry-aware template identification

Frontend logic:

src/runtime/previewRunner.js

Uses:

• templateRegistry hints  
• package.json dependency inspection  
• compatible template lookup  

Current recognized template identities include:

• Static HTML  
• Vite + React  
• Next.js  

Important implementation note:

Next.js detection is explicitly prioritized ahead of generic React/Vite matching so that Next.js is not misidentified as Vite + React.

---

# 🧱 4c Scaffold System

Backend:

src-tauri/src/scaffold.rs

Frontend trigger:

src/runtime/PreviewPanel.jsx

Registry:

src/runtime/templateRegistry.js

Registered scaffold commands:

scaffold_static_html  
scaffold_vite_react  
scaffold_nextjs  

Templates supported:

• Static HTML  
• Vite + React  
• Next.js  

Scaffolds generate **directly into the workspace root**.

Developer reminder now exists in:

src/runtime/templateRegistry.js

When new templates are added, future maintainers are reminded to also review:

• src/runtime/previewRunner.js  
• src/runtime/PreviewPanel.jsx  
• src/runtime/ServicePanel.jsx  

so deploy guidance and detection remain in sync.

---

# 🖥 4d Command Runner

Backend:

src-tauri/src/command_runner.rs

Frontend bridge:

src/runtime/commandRunner.js

UI:

src/runtime/CommandRunnerPanel.jsx

Capabilities:

• run shell commands in project root  
• stream stdout/stderr logs  
• one command at a time  
• Windows compatibility using:

cmd /C <command>

Events emitted:

kforge://command/log  
kforge://command/status  

Preview and Terminal panels are **mutually exclusive collapsibles**.

User-facing surface name is:

**Terminal**

Path:

AI Panel  
→ Terminal  

---

# 🔌 4e Service Integration Layer

Backend:

src-tauri/src/service.rs

Frontend bridge:

src/runtime/serviceRunner.js

Registry:

src/runtime/serviceRegistry.js

UI:

src/runtime/ServicePanel.jsx

Panel host:

src/ai/panel/AiPanel.jsx

Registered commands include:

service_setup  
github_detect_repo  
github_open_repo  
github_pull  
github_push  
github_clone_repo  
supabase_create_env_file  
supabase_install_client  
supabase_create_client_file  
supabase_create_read_example  
supabase_create_insert_example  
supabase_create_query_helper  
supabase_quick_connect  
stripe_create_env_file  
open_url  

---

## Service Layer Purpose

Provides a unified architecture for **external service integrations**.

Instead of building custom subsystems for each service, KForge now uses:

registry entry + adapter implementation

This creates a consistent runtime lane for integrations.

---

## Service Registry

File:

src/runtime/serviceRegistry.js

Current services:

• GitHub  
• Supabase  
• Stripe  
• OpenAI  

Deploy providers are currently represented through the task-first Services UI and fallback provider mapping in the Services panel:

• Vercel  
• Netlify  

Fields include:

• id  
• name  
• description  
• status  
• envVars  
• setupCommand  

---

# 🟣 GitHub Integration (Phase 4.6)

Phase 4.6 introduced the **first real service adapter** and then expanded it into a broader GitHub workflow.

Backend implementation:

src-tauri/src/service.rs

Frontend UI:

src/runtime/ServicePanel.jsx

Runtime bridge:

src/runtime/serviceRunner.js

---

## GitHub Capabilities Now Implemented

GitHub support now includes:

• publish local project to a new GitHub repository  
• detect whether current folder is already a Git repo  
• detect whether a remote exists  
• open current repository on GitHub in browser  
• pull latest changes into an existing local repo  
• push local changes to GitHub  
• import an existing GitHub repository during New Project flow  

This means KForge now supports **both directions**:

### Local → GitHub

Publish

### GitHub → Local

Import from GitHub

---

## Authentication Model

KForge does **not manage OAuth tokens directly**.

Authentication is delegated to the GitHub CLI.

Requirements:

• git installed  
• GitHub CLI installed  
• user authenticated via:

gh auth login

This keeps KForge secure and avoids token storage.

---

## Service Panel Behavior

Services panel now supports:

• task-based top-level grouping  
• single-active-service display  
• GitHub-focused action surface  
• repository name input  
• public/private visibility selection  
• GitHub publish trigger  
• push / pull / open actions  
• live service log streaming  

Logs persist when:

• collapsing / reopening Services  

Logs reset when:

• workspace resets  
• project root changes  

---

## Service Panel UX Architecture

Example grouping:

• Code → GitHub  
• Deploy → Vercel / Netlify  
• Backend → Supabase  
• Payments → Stripe  

This architecture was introduced specifically to support scaling future integrations cleanly.

---

# 🚀 Deploy Pipeline (Phase 4.7)

Phase 4.7 attached the next real service lane after GitHub:

Deploy

Current deploy providers:

• Vercel  
• Netlify  

Deploy actions are intentionally lightweight.

KForge does **not** try to become a hosting dashboard.

Instead, KForge provides **guided deploy shortcuts** for GitHub-connected projects.

---

## Deploy Capabilities Implemented

For a project that is already connected to GitHub, KForge now supports:

• detect deploy readiness from current GitHub repo state  
• show the current GitHub repository inside Deploy  
• open Vercel import flow for the detected repository  
• open Netlify start/import flow for the detected repository  
• guide the user with deploy-specific log messages  
• show a warning hint when deployment should wait for a push  

This creates the intended user path:

Local project  
→ Publish to GitHub  
→ Push changes  
→ Deploy via Vercel or Netlify  

---

# 🚀 4.7b Deploy Pipeline-2 (Smart Deploy)

Phase 4.7b adds **template-aware deploy guidance**.

This is guidance only.

It does **not** introduce:

• provider lock-in  
• advanced hosting dashboards  
• build setting editors  
• environment config panels  

Instead, Services → Deploy now reads already-known project identity and shows calmer, smarter wording.

---

## Smart Deploy Source of Truth

Project identity is shared from the existing preview detection path.

Primary files:

• src/runtime/templateRegistry.js  
• src/runtime/previewRunner.js  
• src/runtime/PreviewPanel.jsx  
• src/runtime/ServicePanel.jsx  

This keeps deploy guidance aligned with preview/template detection instead of creating duplicate framework detection logic inside Services.

---

## Smart Deploy Behaviors

Current mappings:

### Static HTML

Project type:  
Static HTML

Recommendation:  
Good fit: Netlify or Vercel

Hint text:  
Good fit for static sites.

### Vite + React

Project type:  
Vite + React

Recommendation:  
Good fit: Netlify or Vercel

Hint text:  
Good fit for this project.

### Next.js

Project type:  
Next.js

Recommendation:  
Recommended: Vercel

Provider-specific hints:

• Vercel → Recommended for Next.js projects.  
• Netlify → Next.js usually fits best on Vercel.  

This preserves user choice while still giving clearer guidance.

---

## Smart Deploy UX Surface

Location:

Services → Deploy → Vercel / Netlify

Deploy panel now shows:

• Project type: <detected template label>  
• Recommendation: <provider guidance>  
• GitHub repo: <owner/repo> or GitHub connection required  
• provider-specific hint text  

This keeps the deploy panel more context-aware without increasing complexity.

---

## Smart Deploy Safety / Fallback Behavior

If project identity is not recognized cleanly, deploy guidance stays calm.

Fallback wording remains:

Recommendation: Good fit: Netlify or Vercel

This avoids noisy warnings for end users.

Developer-facing reminder is handled in:

src/runtime/templateRegistry.js

so future template additions prompt maintainers to review deploy recommendation mapping.

---

# 🟩 4.8 Supabase Integration (real full-stack)

Phase 4.8 introduced the **first backend-oriented service adapter**:

Supabase

This is the first service integration focused on project backend connection setup rather than code hosting or deploy handoff.

Primary implementation:

src-tauri/src/service.rs

Primary UI:

src/runtime/ServicePanel.jsx

---

## Supabase Capabilities Implemented

The Supabase adapter now supports:

• readiness inspection for current project setup  
• environment file detection  
• detection of `SUPABASE_URL`  
• detection of `SUPABASE_ANON_KEY`  
• local Supabase configuration detection via `supabase/config.toml`  
• Supabase client library detection in `package.json`  
• `.env.example` generation when missing  
• browser handoff to Supabase dashboard  

This gives the user a first real guided path for backend connection setup.

---

# 🟩 4.8.1 Supabase UX Assist + Docs

Phase 4.8.1 finished the first Supabase pass with beginner-facing polish and documentation support.

This phase improved the onboarding path without turning KForge into a backend dashboard.

---

## Supabase UX Capabilities Added

Additional capabilities added in 4.8.1 include:

• Create `.env` file from `.env.example`  
• calmer beginner-friendly wording in Services → Backend → Supabase  
• clearer explanation of connection values inside the panel  
• user guide notes for Supabase flow  
• project map + snapshot updates for Supabase architecture  

Command added:

supabase_create_env_file

This command creates `.env` by copying `.env.example` when `.env` does not already exist.

If `.env` already exists, KForge leaves it unchanged.

---

# 🟩 4.8.2 Guided Supabase Actions

Phase 4.8.2 upgraded the Supabase lane from a mostly diagnostic checker into a **guided setup assistant**.

This phase exists specifically to remove ambiguity for beginners and vibe coders.

Primary files:

• src-tauri/src/service.rs  
• src-tauri/src/lib.rs  
• src/runtime/serviceRunner.js  
• src/runtime/serviceRegistry.js  
• src/runtime/ServicePanel.jsx  

---

## Supabase Capabilities Added in 4.8.2

The Supabase adapter also supports:

• improved final success wording after readiness check  
• detection of `VITE_SUPABASE_URL`  
• detection of `VITE_SUPABASE_ANON_KEY`  
• clearer Vite-aware guidance in the Supabase panel  
• guided install action for `@supabase/supabase-js`  
• guided creation of `src/lib/supabase.js`  
• detection of an existing Supabase client file  
• non-destructive client-file generation behavior  

New commands added:

supabase_install_client  
supabase_create_client_file  

---

## Supabase Client File Behavior

KForge can generate:

src/lib/supabase.js

Typical client-file logic:

• imports `createClient` from `@supabase/supabase-js`  
• reads `VITE_SUPABASE_URL` or `SUPABASE_URL`  
• reads `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`  
• exports a reusable `supabase` client  

If a client file already exists, KForge logs that no changes were made and leaves the file untouched.

---

# 🟩 4.8.3 Supabase Polish

Phase 4.8.3 polished the guided Supabase lane based on real testing in a fresh Vite + React workspace.

This phase focused on reducing ambiguity, improving Windows reliability, and making the Supabase panel feel calmer and more readable for beginners and vibe coders.

Primary files:

• src-tauri/src/service.rs  
• src/runtime/ServicePanel.jsx  
• docs-internal/user-guide-notes.md  
• docs-internal/project-map.md  
• docs-internal/PROJECT-SNAPSHOT.md  

---

## Supabase Capabilities Added in 4.8.3

The Supabase adapter and panel now also support:

• environment-variable checks that treat empty values as **not set**  
• clearer next-step guidance after each Supabase action  
• Windows-safe package installation for `pnpm add @supabase/supabase-js` using shell execution  
• clearer install failure feedback with surfaced command output  
• consistent terminology: **Supabase client file**  
• compact top-of-panel guidance with a **More info** toggle  
• activity log grouping into visible sections  
• quoted action labels highlighted inside the log  
• cleaner log readability across repeated setup actions  

---

## Windows Install Reliability

The Supabase install action now runs through a shell path instead of depending only on direct process lookup.

Current behavior:

• Windows uses a shell execution path compatible with GUI runtime conditions  
• install output is streamed into the Services log  
• if installation fails, the user sees clearer package-manager output in the log  

This fixes the real test failure where the button could fail on Windows even though `pnpm add @supabase/supabase-js` worked in the internal terminal.

---

## Supabase Panel UX Shape

Services → Backend → Supabase now has a calmer structure:

### Compact first-step guidance

The top card emphasizes the first step:

"Check Supabase setup"

This keeps the panel focused on action rather than training text.

### Expandable extra help

Additional explanation is available behind:

More info

This reduces clutter while still giving beginners optional help when they want it.

---

## Supabase Activity Log Behavior

The Services log for Supabase is now easier to scan.

Current behavior:

• each user action begins a new visible log section  
• log sections are separated visually  
• action names in quotes are highlighted  
• repeated actions are easier to distinguish from older output  

Examples of highlighted action labels:

• "Check Supabase setup"  
• "Create .env file"  
• "Install Supabase client"  
• "Create Supabase client file"  

This keeps the beginner guidance readable without needing a separate wizard UI.

---

# 🟩 4.9 Supabase Quick Connect

Phase 4.9 added **Supabase Quick Connect** as a faster guided entry point for backend setup.

This is a UX-focused improvement on top of the existing Supabase lane, not a new subsystem.

Primary files:

• src-tauri/src/service.rs  
• src/runtime/serviceRunner.js  
• src/runtime/serviceRegistry.js  
• src/runtime/ServicePanel.jsx  

---

## Supabase Quick Connect Purpose

Quick Connect is intended to feel more like:

I want to use Supabase  
→ tell me what is missing  
→ guide me toward a working setup  

This reduces the feeling that the user must manually understand every setup detail before getting started.

---

## Supabase Quick Connect Capabilities

Phase 4.9 adds or strengthens:

• one-click guided Supabase setup check  
• clearer log headings for Supabase actions  
• cleaner separation between action blocks  
• timestamps in service log entries  
• faster path toward a usable beginner setup  
• better continuity between setup inspection and guided actions  

Command added:

supabase_quick_connect

---

## Cloud and Local Supabase Coverage

Quick Connect and the existing setup checks now better support both:

### Cloud Supabase

Typical connection values:

• project URL from Supabase dashboard  
• anon key from Supabase dashboard  

### Local Supabase

Typical connection signals:

• local URL such as `http://127.0.0.1:54321`  
• local project config at `supabase/config.toml`  

This keeps the Supabase lane useful for both hosted and local development workflows.

---

## Supabase Logging Improvements in 4.9

Supabase service logging now includes:

• clearer headings  
• clearer separation between log blocks  
• timestamps for entries  
• improved readability during repeated setup steps  

This makes the guided setup flow easier to understand in real use.

---

# 🟩 4.9.1 ServicePanel Log Isolation Polish

Phase 4.9.1 is a small UX polish change focused on **per-service log isolation** inside the Services panel.

This is not a structural phase, but it materially improves clarity.

Primary file:

• src/runtime/ServicePanel.jsx  

---

## ServicePanel Log Isolation Behavior

Before 4.9.1:

• service activity streamed into a shared log array  
• switching services could show unrelated earlier log output  
• this was confusing during mixed GitHub / Supabase use  

After 4.9.1:

• each service keeps its own activity history  
• GitHub shows only GitHub logs  
• Supabase shows only Supabase logs  
• switching services does not mix provider output  
• returning to a service restores its earlier log history  

---

## ServicePanel Internal State Change

ServicePanel log state now uses a provider-keyed map instead of a single shared array.

Conceptual shape:

```javascript
{
  github: [],
  supabase: [],
  stripe: [],
}
```

Persisted state now tracks:

logsByService

instead of:

logs

This preserves the existing panel persistence model while isolating log history per provider.

---

## What 4.9.1 Did Not Change

Phase 4.9.1 does **not** change:

• log timestamps  
• service status flow  
• task/provider grouping  
• Supabase setup logic  
• GitHub publish/push/pull behavior  

It only changes how log history is stored and shown in the ServicePanel UI.

---

## Current Services Log Rules

Services logs now behave like this:

• logs persist while the same project remains open  
• each provider has its own log history  
• logs still reset on workspace reset  
• logs still reset when project root changes  

This matches the mental model users expect from professional integration tooling.

---

# 🟪 4.10 Tool-Calling Agent Loop

Phase 4.10 introduced a real **tool-calling agent loop** to the AI surface.

This is a major AI-runtime milestone.

Primary files:

• src/ai/agent/agentRunner.js  
• src/ai/tools/toolSchema.js  
• src/ai/tools/toolRuntime.js  
• src/ai/tools/handlers/index.js  
• src/ai/panel/AiPanel.jsx  
• src/App.js  

---

## 4.10 Purpose

Before 4.10, AI responses could request tools, but the system behavior was closer to:

single response  
→ detect tool text  
→ execute tool  
→ stop  

After 4.10, the runtime supports:

model  
→ tool request  
→ tool execution  
→ tool result returned to model  
→ continued reasoning  
→ final answer  

This gives KForge a real **agent-style reasoning loop** while preserving the existing consent model.

---

## 4.10 Architectural Rule

The agent loop sits **above** the existing tool runtime.

It does **not** replace or bypass:

src/ai/tools/toolRuntime.js

This means:

• consent gating remains authoritative  
• tool execution still routes through the existing runtime pipeline  
• handler dispatch still flows through `src/ai/tools/handlers/index.js`  
• transcript-visible tool execution remains intact  

---

## 4.10 Agent Loop Shape

Core loop now behaves conceptually like:

assistant  
→ request tool  
→ tool executes  
→ result appended  
→ model continues  
→ final answer returned  

This is the foundational runtime pattern used by modern coding agents.

---

## 4.10 Tool Schema Layer

A separate schema layer now exists for model-visible tool definitions:

src/ai/tools/toolSchema.js

This keeps the model-facing tool inventory aligned with the actual handler registry.

Current exposed tools include:

• read_file  
• list_dir  
• search_in_file  
• write_file  
• mkdir  

---

## 4.10 UI / Transcript Behavior

The AI panel now supports:

• structured tool-call detection  
• continued reasoning after tools run  
• calm chat projection  
• full transcript visibility  
• agent-loop integration without replacing the existing message store  

This keeps the user-facing experience aligned with KForge’s low-noise philosophy.

---

# 🟪 4.10.1 Agent Hardening

Phase 4.10.1 hardened the new agent runtime based on real testing, especially with weaker or less structured models.

Primary files:

• src/ai/agent/agentRunner.js  
• src/ai/panel/AiPanel.jsx  

---

## 4.10.1 Problems Addressed

Real testing surfaced several model/runtime edge cases:

• weaker models describing tool calls in plain English  
• duplicate tool requests  
• repeated workspace exploration  
• accidental file-creation attempts during inspection  
• stale tool-result context during continuation  
• transcript duplication / loop-noise polish issues  

4.10.1 focused on stabilizing these behaviors without redesigning the architecture.

---

## 4.10.1 Hardening Added

The agent runtime now includes:

• duplicate tool-call detection inside the agent loop  
• seeding duplicate protection with already-executed batch tool calls  
• natural-language fallback parsing for tool patterns such as `list_dir(.)`  
• explicit inspection-budget rules for workspace-analysis tasks  
• continuation prompts that discourage repeated exploration  
• local injection of freshly executed tool results into continuation context  
• suppression of duplicate-loop noise in transcript  

This made weaker-model behavior much more usable in real inspection flows.

---

## 4.10.1 Safety Tightening

A critical safety correction was made:

write tools are no longer treated as safe automatic tools.

Safe automatic tools are now read-only:

• read_file  
• list_dir  
• search_in_file  

Write tools now require explicit consent:

• write_file  
• mkdir  

This prevents weaker models from creating files automatically during inspection or explanation tasks.

---

## 4.10.1 Current Weak-Model Reality

Weaker models such as Groq / Llama-family variants can still be valuable, but they require stronger steering.

Current KForge hardening now helps these models by:

• recovering simple function-style tool requests  
• reducing runaway workspace exploration  
• preventing silent write execution  
• allowing read-only inspection flows to complete successfully more often  

Best tool-driving reliability still comes from stronger models such as OpenAI or Claude.

---

# 🟦 5.0.1 Intent-Driven Backend Setup (rolled back UI-routing attempt)

Phase 5.0.1 explored **intent-driven backend setup** by inferring likely backend needs from prompts such as:

• "I need login"  
• "I need a database"  
• "I need file storage"  

The original implementation tried to route that intent into UI behavior.

This version was deliberately rolled back.

---

## Why 5.0.1 Was Rejected

The original UI-routing version caused bad UX and unstable state behavior, including:

• forced jump into Services  
• auto-selection of providers  
• Focus Mode / Exit Focus stickiness  
• Reset Workspace feeling trapped in recommendation state  

This proved that AI intent should **not** directly drive UI routing in the current architecture.

---

## 5.0.1 Important Lesson

The useful part of the experiment was:

• making the AI aware of KForge capabilities  

The rejected part was:

• auto-opening Services  
• panel hijacking  
• sticky recommendation state  
• focus-mode side effects  

Safe future direction:

AI-awareness only, not UI control.

---

# 🟦 5.0.2 KForge Service Workflow Awareness for AI Guidance

Phase 5.0.2 rebuilt the useful part of the 5.0.1 experiment safely.

Instead of trying to control the UI, this phase taught the AI about **real KForge workflows**.

Primary files:

• src/ai/capabilities/kforgeCapabilities.js  
• src/ai/capabilities/kforgeServiceWorkflows.js  
• src/ai/capabilities/kforgePreviewWorkflows.js  
• src/App.js  

---

## 5.0.2 Purpose

The goal was to make the assistant aware of KForge as a product, not just as a file-editing chatbot.

This allows the AI to guide users toward KForge-first workflows such as:

• Services → Backend → Supabase  
• Services → Code → GitHub  
• Services → Deploy → Vercel / Netlify  
• Preview → Generate  

without forcing any UI state change.

---

## 5.0.2 Capability Awareness Model

KForge AI awareness now uses structured manifests.

Current structure:

### Top-level formatter

src/ai/capabilities/kforgeCapabilities.js

### Service workflow manifest

src/ai/capabilities/kforgeServiceWorkflows.js

### Preview / Generate workflow manifest

src/ai/capabilities/kforgePreviewWorkflows.js

This is the first real internal architecture for **product-aware AI guidance** inside KForge.

---

## 5.0.2 Behavior Rule

Important new AI rule:

If a workflow exists in KForge, the assistant should guide the user to that workflow first and should not execute that workflow inside chat unless the user explicitly chooses to bypass KForge.

This now applies to:

• Supabase guided setup  
• GitHub service actions  
• Deploy handoff guidance  
• Preview template generation  

---

## 5.0.2 Grounded Product Truths Captured

The AI now has explicit product guidance for:

### Supabase

Preferred path:

Services  
→ Backend  
→ Supabase  

The AI should hand off to:

• Quick Connect Supabase  
• Check Supabase setup  

and should not immediately create `.env` or client files in chat unless the user explicitly chooses to bypass KForge.

### GitHub

Services → Code → GitHub is for actions on the **current open local project**.

Current GitHub actions include:

• publish  
• push  
• pull  
• open repository  

GitHub import is **not** in Services.

Import path is:

New Project  
→ Import from GitHub  

### Preview / Generate

If the user asks for a React / Next.js / static starter app that KForge can generate, AI should guide them to:

Preview  
→ Generate  

and should not manually scaffold template files in chat unless the user explicitly chooses to bypass KForge.

### Stripe

Stripe was still **planned** at the time of Phase 5.0.2 and was not yet a ready guided KForge workflow.

This historical note is now superseded by Phase 5.1 and 5.1.1.

---

## AI Capability Awareness Maintenance Rule

KForge AI workflow awareness is now maintained through structured capability manifests.

Current files:

• src/ai/capabilities/kforgeCapabilities.js  
• src/ai/capabilities/kforgeServiceWorkflows.js  
• src/ai/capabilities/kforgePreviewWorkflows.js  

Current maintenance rule:

• if a new **service workflow** is added, update:  
• src/ai/capabilities/kforgeServiceWorkflows.js  
• if a new **non-service guided workflow or panel** is added, create or update a manifest under:  
• src/ai/capabilities/  
• then include that workflow manifest in:  
• src/ai/capabilities/kforgeCapabilities.js  

Reason:

Without this step, the AI may not know that the new KForge capability exists, may fail to guide users to it, or may incorrectly bypass the KForge workflow and try to perform the task directly in chat.

This is currently a **manual maintenance discipline** and should later be improved by a broader global AI capability awareness / self-discovery system.

---

# 🟦 5.0.3 Global AI Capability Awareness

Phase 5.0.3 expanded KForge AI awareness from a first safe workflow-handoff layer into a broader **global capability-awareness system**.

This phase kept the safe 5.0.2 principle intact:

AI-awareness only, not UI control.

Primary files:

• src/ai/capabilities/kforgeCapabilities.js  
• src/ai/capabilities/kforgeServiceWorkflows.js  
• src/ai/capabilities/kforgePreviewWorkflows.js  
• src/ai/capabilities/kforgeTerminalWorkflows.js  
• src/ai/capabilities/discoverCapabilities.js  
• src/ai/panel/AiPanel.jsx  
• src/App.js  

---

## 5.0.3 Purpose

The goal of 5.0.3 was to make KForge AI aware of a broader product surface while reducing manual drift and prompt bloat.

This phase specifically added:

• broader non-service capability awareness  
• Terminal workflow awareness  
• capability self-discovery from real runtime registries  
• relevance filtering so prompts receive more focused capability context  
• safer tool-emission behavior for explanations and manual-only requests  

---

## 5.0.3 Capability Awareness Model

KForge AI awareness now has four layers:

### Top-level capability formatter

src/ai/capabilities/kforgeCapabilities.js

Responsibilities:

• aggregate workflow manifests  
• format AI-facing capability context  
• apply relevance filtering  
• inject global KForge workflow behavior rules  

### Structured workflow manifests

Current examples:

• src/ai/capabilities/kforgeServiceWorkflows.js  
• src/ai/capabilities/kforgePreviewWorkflows.js  
• src/ai/capabilities/kforgeTerminalWorkflows.js  

These files define:

• workflow name  
• route  
• summary  
• preferred AI behavior  
• KForge handoff language  
• manual fallback language  

### Capability self-discovery

File:

src/ai/capabilities/discoverCapabilities.js

Current discovery sources:

• src/runtime/serviceRegistry.js  
• src/runtime/templateRegistry.js  

This reduces manual drift by allowing AI awareness to pick up real runtime capabilities from the codebase.

### Prompt integration

File:

src/App.js

App.js now passes the current prompt text into the capability formatter so only the most relevant workflow context is injected.

---

## 5.0.3 New Capability Coverage

The AI can now recognize and guide users toward:

• Services workflows  
• Preview workflows  
• Generate workflows  
• Terminal workflows  
• discovered service capabilities from `SERVICE_REGISTRY`  
• discovered template capabilities from `TEMPLATE_REGISTRY`  

This makes the assistant more aware of the real KForge surface without adding UI-routing behavior.

---

## 5.0.3 Terminal Awareness

A dedicated Terminal workflow manifest now exists:

src/ai/capabilities/kforgeTerminalWorkflows.js

This teaches the AI to prefer:

AI Panel  
→ Terminal  

when the user wants to:

• run shell commands  
• install packages  
• run dev servers  
• run Git commands  
• perform project diagnostics  

Important rule:

The AI may recommend Terminal, but must remain **advisory only** and must not imply that it can open or control the Terminal UI automatically.

---

## 5.0.3 Preview Guidance Tightening

Preview guidance was refined in 5.0.3 to separate:

• previewing an existing project  
from  
• generating a new starter template  

Current rule:

If the user asks to **preview the current project**, AI should guide them to:

Preview

Only if the user explicitly wants to create a new supported starter project should AI guide them to:

Preview  
→ Generate  

This prevents incorrect “Generate” handoffs for users who already have a project open.

---

## 5.0.3 Relevance Filtering

Capability context is now filtered based on the active user message.

This means App.js no longer injects the full capability surface into every prompt.

Instead, the system prefers relevant subsets, which improves:

• prompt size  
• signal-to-noise ratio  
• likelihood of correct workflow matching  

Current hardening rule:

If no strong relevance match exists and the user is **not** clearly asking for a KForge-managed workflow, the system should avoid dumping the full workflow list into the prompt.

This reduces false workflow handoffs for ordinary build/edit prompts.

---

## 5.0.3 Routing-Bucket Hardening (post-testing lesson)

Post-testing hardening showed that stable AI behavior depends on classifying requests into a small number of durable routing buckets rather than endlessly adding one-off prompt patches.

These buckets should now be treated as canonical guidance:

• project open vs no project open  
• empty folder vs real project  
• KForge workflow request vs normal implementation request  
• manual bypass vs KForge-managed path  
• successful tool writes vs failed tool writes  
• gratitude / closing turn vs active work request  

Why this matters:

• prevents false workflow handoff  
• reduces model drift on low-quality prompts  
• improves no-project and empty-folder behavior  
• improves manual-bypass behavior  
• prevents fake success messaging after failed writes  
• avoids weird workflow re-handoffs after casual “thanks” turns  

Primary files involved in this routing hardening:

• src/App.js  
• src/ai/panel/AiPanel.jsx  
• src/ai/capabilities/kforgeCapabilities.js  
• src/ai/capabilities/kforgePreviewWorkflows.js  

Rule of thumb for future debugging:

When a new AI-routing bug appears, first classify it into one of these buckets before adding more wording or guardrails.

---

## 5.0.3 Self-Discovery Rule

Capability self-discovery now supplements manual manifests.

Current discovery includes:

### Services

Discovered from:

src/runtime/serviceRegistry.js

This means service availability, status, route labels, and descriptions can be surfaced to the AI from the real runtime registry.

### Templates

Discovered from:

src/runtime/templateRegistry.js

This means supported starter templates can also be surfaced from the real registry.

This reduces the risk that a new service or template exists in KForge but is invisible to the assistant.

---

## 5.0.3 Tool Emission Guardrails

Tool-emission instructions in App.js were tightened to prevent AI overreach.

Current rule:

The assistant should only emit tool fenced blocks when the user is explicitly asking for an action inside the project, such as:

• creating files  
• editing files  
• running project operations  

The assistant should **not** emit tool calls when the user is:

• asking conceptual questions  
• asking for explanations  
• asking for planning help  
• asking for manual commands only  
• explicitly bypassing KForge  
• only expressing gratitude / acknowledgement / casual closing language  

This improves alignment between workflow awareness and normal conversational help.

---

## 5.0.3 Post-Tool Truthfulness Rule

Post-tool follow-up messaging must now be based on **actual successful results**, not merely on requested tool calls.

Current rule:

The AI should not claim that files were written, suggest reviewing file changes, or offer Preview as the next step if the relevant write operations failed.

This specifically protects against false success messaging in no-project / bad-path cases.

Primary implementation surface:

src/ai/panel/AiPanel.jsx

---

## 5.0.3 AI Capability Maintenance Rule

KForge AI capability awareness is now maintained through a hybrid model:

### Manual manifests

Used for:

• AI-specific workflow wording  
• nuanced handoff behavior  
• manual fallback language  
• product-specific advisory rules  

### Real registry discovery

Used for:

• service discovery  
• template discovery  

Current files involved:

• src/ai/capabilities/kforgeCapabilities.js  
• src/ai/capabilities/kforgeServiceWorkflows.js  
• src/ai/capabilities/kforgePreviewWorkflows.js  
• src/ai/capabilities/kforgeTerminalWorkflows.js  
• src/ai/capabilities/discoverCapabilities.js  

This is stronger than the earlier manual-only discipline while still keeping the architecture simple.

---

# 🟨 5.1 Stripe Adapter

Phase 5.1 converted Stripe from a planned service entry into a **real adapter-backed Payments lane**.

Primary files:

• src-tauri/src/service.rs  
• src-tauri/src/lib.rs  
• src/runtime/serviceRunner.js  
• src/runtime/serviceRegistry.js  
• src/runtime/ServicePanel.jsx  
• src/ai/capabilities/kforgeServiceWorkflows.js  

Primary route:

Services  
→ Payments  
→ Stripe  

---

## 5.1 Purpose

The goal of 5.1 was to give KForge a first real payments integration lane without turning the app into a billing dashboard.

This phase focused on guided setup assistance, not on subscription admin or analytics.

---

## 5.1 Stripe Capabilities Added

The Stripe adapter now supports:

• readiness inspection for current project setup  
• environment file detection  
• detection of `STRIPE_SECRET_KEY`  
• detection of `STRIPE_PUBLISHABLE_KEY`  
• `.env.example` generation or update for Stripe placeholders  
• `.env` creation helper from `.env.example`  
• browser handoff to Stripe dashboard  
• browser handoff to Stripe docs  
• calmer Stripe-specific activity log guidance  
• AI truthfulness for Services → Payments → Stripe  

Command added:

stripe_create_env_file

---

## 5.1 Stripe UX Shape

Services → Payments → Stripe now provides a guided, explicit setup lane.

Current Stripe actions include:

• Check Stripe setup  
• Create `.env` file  
• Open Stripe dashboard  
• Open Stripe docs  

The panel remains deliberately narrow in scope.

It does **not** introduce:

• subscription dashboard UI  
• invoice management  
• webhook event browser  
• analytics panels  
• hidden payment automation  

---

# 🟨 5.1.1 Stripe Webhook Readiness

Phase 5.1.1 extended the new Stripe lane with **webhook-readiness guidance**.

This is a small follow-on phase, not a new subsystem.

Primary files:

• src-tauri/src/service.rs  
• src/runtime/serviceRegistry.js  
• src/runtime/ServicePanel.jsx  
• src/ai/capabilities/kforgeServiceWorkflows.js  
• src/ai/capabilities/discoverCapabilities.js  

---

## 5.1.1 Purpose

The goal of 5.1.1 was to help projects that need server-side Stripe event handling, such as:

• checkout completion  
• subscription updates  
• payment event verification  
• webhook-driven backend workflows  

This phase still avoids turning KForge into a Stripe operations dashboard.

---

## 5.1.1 Webhook-Readiness Capabilities Added

Stripe guidance now also supports:

• detection of `STRIPE_WEBHOOK_SECRET`  
• `.env.example` webhook placeholder support  
• webhook-readiness status messaging in the Stripe setup check  
• browser handoff to Stripe webhook docs  
• AI guidance that mentions webhook readiness when relevant  
• truthful discovered capability routing for Stripe via capability discovery  

Additional Stripe action added:

• Open Stripe webhook docs  

---

## 5.1.1 Stripe Readiness Model

Stripe setup now distinguishes between:

### Core payment readiness

• `STRIPE_SECRET_KEY`  
• `STRIPE_PUBLISHABLE_KEY`  

### Webhook-ready server flows

• `STRIPE_WEBHOOK_SECRET`  

If the core keys exist but the webhook secret does not, KForge reports that the main payment keys are available while webhook signing is not yet configured.

This keeps the guidance calm and accurate for both simple and server-driven Stripe integrations.

---

# 🟩 5.2 Supabase Developer Assist

Phase 5.2 resumed after a separate AI-awareness stabilization detour and now focuses on **guided developer-assist artifacts for Supabase integration**.

This phase is not primarily about awareness.  
It is about whether new Supabase helper actions are genuinely useful for real projects.

Primary files:

• src-tauri/src/service.rs  
• src-tauri/src/lib.rs  
• src/runtime/serviceRunner.js  
• src/runtime/ServicePanel.jsx  
• src/runtime/serviceRegistry.js  
• src/ai/capabilities/kforgeServiceWorkflows.js  

Awareness-related files touched during the detour and checkpointed separately:

• src/ai/capabilities/kforgePreviewWorkflows.js  
• src/ai/capabilities/discoverCapabilities.js  
• src/ai/capabilities/kforgeCapabilities.js  
• src/App.js  
• src/ai/panel/AiPanel.jsx  

---

## 5.2 Purpose

The goal of 5.2 is to help users who already have an app and now want to connect it to Supabase without starting from scratch.

The intended flow is:

existing app  
→ Services → Backend → Supabase  
→ check setup  
→ create env and client  
→ generate starter examples/helpers  
→ adapt those patterns to the real schema  
→ wire app to database  

This is meant to feel like **developer assist**, not full backend automation.

---

## 5.2 Supabase Developer Assist Capabilities

Supabase Developer Assist now includes:

• Check Supabase setup  
• Create `.env` file  
• Install Supabase client  
• Create Supabase client file  
• Create read example  
• Create insert example  
• Create query helper  

The setup and generated artifacts are intended to support both:

• Cloud Supabase  
• Local Supabase  

Current generated files include:

• `src/lib/supabase.js`  
• `src/examples/supabaseExample.js`  
• `src/examples/supabaseInsertExample.js`  
• `src/lib/supabaseQueries.js`  

---

## 5.2 Generated Artifact Intent

The generated files are intentionally small.

They are meant to provide:

• a reusable Supabase client  
• a tiny starter read query  
• a tiny starter insert query  
• an optional small helper layer for repeated read/insert patterns  

This is designed to bridge the gap between:

frontend app already exists  
and  
developer now needs the first real Supabase integration patterns  

The feature set is especially aimed at:

• beginners  
• vibe coders  
• frontend-first developers who need backend connection help  

---

## 5.2 Real Test Findings So Far

Real restart testing in a fresh Vite + React workspace confirmed:

• `Check Supabase setup` remains useful and beginner-friendly  
• `.env.example` and `.env` creation still provide a clear setup path  
• Supabase client install works through the guided service flow  
• generated `src/lib/supabase.js` is small, conventional, and supports both Vite and generic env names  
• generated read and insert examples are simple starter artifacts, not heavy scaffolding  
• the query helper is technically good, but conceptually slightly more advanced than the read/insert examples  

Product judgment from testing so far:

• keep the full feature set  
• explain the helper files better in docs and UI wording  
• do not remove advanced-looking helpers just because beginners are still learning them  

---

## 5.2 Bugs Found During Testing

Testing surfaced a real wiring bug:

The following commands existed in `src-tauri/src/service.rs` but were not registered in the Tauri invoke handler in `src-tauri/src/lib.rs`:

• `supabase_create_read_example`  
• `supabase_create_insert_example`  
• `supabase_create_query_helper`  

This caused the UI actions to fail even though the backend implementations existed.

This has now been fixed.

---

## 5.2 Messaging Polish

Testing also surfaced a wording issue in the Supabase setup flow:

The setup log previously duplicated the recommendation to create `.env`, and some later wording created sequence tension between:

• “fill env values now”  
and  
• “create the client file now”  

Polish in `src-tauri/src/service.rs` now makes the guidance clearer by:

• removing duplicated “Create .env file” prompting  
• explaining that env values can be filled now or after generating the client file  
• making read/insert example messages more concrete  
• making the query-helper explanation more understandable  

---

## 5.2 Current Product Judgment

Supabase Developer Assist now appears to be a feature worth keeping.

Current direction:

• keep setup helpers  
• keep generated client file  
• keep read example  
• keep insert example  
• keep query helper  
• improve docs and wording so the purpose is clearer to users who are newer to database work  

This phase strengthens the Supabase lane from:

guided setup  
into  
guided setup + starter integration patterns  

---

# 🟡 5️⃣ Stable Development Loop

Canonical workflow:

Open folder  
Generate (optional)  
Install  
Preview  
Open  
Stop  
Iterate  

AI workflow:

Open folder  
Prompt AI  
AI edits files  
Install  
Preview  
Hot reload  

Agent workflow:

Open folder  
Prompt AI  
AI requests tools  
Tools execute through consent/runtime  
AI continues reasoning  
AI returns final answer  

Service workflow:

Open folder  
Open Services  
Publish to GitHub  
Push changes  
Deploy via Vercel or Netlify  
Configure Supabase if needed  
Configure Stripe if needed  
Continue development  

Import workflow:

New Project  
Choose local create or GitHub import  
Open project automatically  
Continue development  

Workflow-aware AI guidance:

User asks for a capability  
→ AI maps request to an existing KForge workflow if one exists  
→ AI guides user to KForge-first path  
→ AI only continues in chat if the user explicitly chooses to bypass KForge  

Terminal-aware AI guidance:

User asks to run commands, install packages, or use shell workflow  
→ AI prefers AI Panel → Terminal if that matches the request  
→ AI remains advisory only  

Conceptual-help rule:

User asks for explanation / conceptual help / manual-only guidance  
→ AI answers normally  
→ no unnecessary tool calls  
→ no forced KForge workflow unless the user is clearly asking to use one  

Routing-bucket rule:

When behavior feels wrong, first classify the case into:

• project-open state  
• empty-folder state  
• workflow request vs implementation request  
• manual-bypass state  
• tool success vs tool failure  
• gratitude / closing turn  

before adding more steering text.

---

# 🟢 6️⃣ Filesystem Guarantees

Filesystem layer ensures:

• writes scoped to project root  
• parent folders auto-created  
• invalid paths blocked  
• clear surfaced errors  

Explorer refreshes after:

• AI file writes  
• directory creation  
• scaffold generation  

Service adapters must follow the same project-root restriction.

---

# 🟠 7️⃣ UI Philosophy

KForge is not a debug console.

KForge is:

A calm reasoning-first coding surface.

Principles:

• chat is primary  
• tools are explicit  
• diagnostics optional  
• human-readable errors first  
• no hidden side effects  
• guided integrations, not dashboard sprawl  

Important 5.x rule:

• AI may guide  
• AI may recommend  
• AI may hand off to real workflows  
• AI must not hijack UI state  

---

# 🧠 8️⃣ Current Stability State

As of **Phase 5.2 — Supabase Developer Assist**:

• AI surface stable  
• filesystem tools validated  
• preview runner stable  
• scaffold system operational  
• template registry working  
• command runner operational  
• Terminal panel awareness implemented for AI guidance  
• service integration layer operational  
• GitHub workflow implemented  
• GitHub import implemented  
• Services UX architecture stabilized  
• Deploy pipeline implemented  
• Vercel deploy shortcut working  
• Netlify deploy shortcut working  
• template-aware deploy guidance working  
• Next.js deploy recommendation working  
• Supabase adapter implemented  
• Supabase setup inspection working  
• `.env.example` generation working  
• `.env` creation assist working  
• Supabase beginner UX wording improved  
• Vite-aware Supabase env guidance working  
• Supabase client install action working  
• Windows-safe Supabase install execution working  
• Supabase client file creation working  
• Supabase read example generation working  
• Supabase insert example generation working  
• Supabase query helper generation working  
• missing Supabase developer-assist Tauri command registration fixed  
• Supabase setup messaging duplication fixed  
• Supabase example/helper wording improved  
• Supabase log grouping working  
• Supabase quoted action highlighting working  
• compact Supabase guidance card working  
• Supabase Quick Connect working  
• Stripe adapter implemented  
• Stripe setup inspection working  
• Stripe `.env.example` generation/update working  
• Stripe `.env` creation assist working  
• Stripe dashboard/docs browser handoff working  
• Stripe webhook readiness guidance working  
• per-service Services log isolation working  
• tool schema layer working  
• tool-calling agent loop working  
• duplicate tool-call protection working  
• weak-model fallback parsing working  
• write-tool consent tightening working  
• stale tool-result continuation fix working  
• Supabase documentation captured  
• agent runtime documentation captured  
• AI workflow-awareness manifests implemented  
• Preview workflow guidance tightened for existing projects vs new template generation  
• Preview template workflow awareness implemented  
• GitHub import-vs-service distinction captured for AI guidance  
• KForge-first handoff behavior implemented for guided workflows  
• capability relevance filtering implemented  
• capability self-discovery from service registry implemented  
• capability self-discovery from template registry implemented  
• service-route discovery now aligned more closely to real task-grouped paths  
• tool-emission guardrails tightened for explanations and manual-only requests  
• no-project vs empty-folder routing hardening implemented  
• manual-bypass routing tightened  
• truthful post-tool success/failure follow-up behavior improved  
• gratitude / closing-turn workflow restraint added  

Supported workflows now include:

AI editing  
Project scaffolding  
Dev server preview  
Static site preview  
In-app terminal commands  
GitHub repository publishing  
GitHub repo push / pull / open  
GitHub repository import during project creation  
Deploy handoff to Vercel  
Deploy handoff to Netlify  
Template-aware deploy recommendation inside Services  
Supabase setup inspection  
Supabase Quick Connect  
Supabase environment file preparation  
Supabase client install guidance  
Supabase client file generation  
Supabase read example generation  
Supabase insert example generation  
Supabase query helper generation  
Supabase beginner-friendly guided setup  
Stripe setup inspection  
Stripe environment file preparation  
Stripe dashboard/docs handoff  
Stripe webhook-readiness guidance  
Per-service persistent activity logs in Services  
Tool-based AI inspection and reasoning  
Agent-style read/inspect/explain loops  
Workflow-aware AI guidance to existing KForge features  
Preview-driven template generation guidance  
Preview-first guidance for already-open projects  
Terminal-aware command guidance  
KForge-first handoff for supported product workflows  
Capability-aware conversational behavior with reduced prompt bloat  
Routing-bucket-aware AI hardening for common workflow states  
Truthful post-tool follow-up behavior  

---

# 🏗 Extensibility Lanes

KForge now has six extensibility/runtime systems:

Template Registry  
Service Registry  
Preview Runtime  
Command Runtime  
Agent Runtime  
AI Capability Awareness  

These lanes allow new capabilities to be added without redesigning the architecture.

Future integrations will attach adapters rather than creating new subsystems.

Current AI-awareness maintenance discipline:

• new service workflow → update `src/ai/capabilities/kforgeServiceWorkflows.js` when AI-specific guidance is needed  
• new non-service guided workflow → add/update a manifest under `src/ai/capabilities/`  
• discovered runtime services come from `src/runtime/serviceRegistry.js`  
• discovered templates come from `src/runtime/templateRegistry.js`  
• top-level formatting and filtering live in `src/ai/capabilities/kforgeCapabilities.js`  
• routing-state hardening and post-tool truthfulness frequently involve `src/App.js` and `src/ai/panel/AiPanel.jsx`  

Planned adapters:

• OpenAI  

Possible future backend improvements:

• environment variable manager  
• template-aware backend scaffolding  
• OpenAI adapter  
• richer Supabase code generation guidance  
• lightweight Supabase connection test action  
• richer model-routing between fast chat models and stronger tool-driving models  

---

# ⚓ Captain’s Law — Safe Editing Workflow

These workflow rules exist to keep development **fast, safe, and predictable** across all ships.

They apply to all future phases unless explicitly overridden.

---

## 1 — Locate Before Editing

Always locate the relevant code first using:

```text
rg -n "<search phrase>" <path>
```

Never edit based on memory or assumptions.

---

## 2 — Inspect Live Code Blocks

Before modifying a file, inspect the current code block using:

PowerShell example:

```text
Get-Content <file> | Select-Object -Skip <line> -First <count>
```

This prevents accidental edits against outdated assumptions.

---

## 3 — Prefer Full File Replacement (When Safe)

If a file is small enough to review comfortably:

Replace the **entire file**.

Advantages:

* fewer merge mistakes
* clearer changes
* easier verification

Large files should use **precise block replacement instead**.

---

## 4 — Replace Exact Blocks Only

When partial edits are required:

1. extract the exact current block  
2. modify only that block  
3. paste the corrected block back  

Never guess surrounding code.

---

## 5 — Verify Immediately

After every edit, verify changes using:

```text
rg -n "<keyword>" <file>
```

Confirm the expected code is present and old code is gone.

---

## 6 — Commit Frequently

Stable progress should be committed regularly:

```text
git add .
git commit -m "<phase description>"
git push
```

---

## 7 — Create Restore Points

When reaching a stable milestone, create a tag:

```text
git tag <milestone-tag>
git push origin <milestone-tag>
```

This creates a reliable rollback point.

---

## 8 — One Step At A Time

Development proceeds **incrementally**.

Rules:

* no jumping ahead
* verify each change
* test before continuing

This discipline keeps KForge stable even during rapid iteration.

---

End of Captain’s Law.

---

# 🚢 Phase Boundary

Phase 4.9 introduced **Supabase Quick Connect** and improved the usability of guided backend onboarding.

Phase 4.9.1 then polished the Services experience by isolating activity logs per provider.

Phase 4.10 then introduced the first real **tool-calling agent loop**.

Phase 4.10.1 hardened that loop based on real model behavior, especially for weaker models.

Phase 5.0.1 explored **Intent-Driven Backend Setup**, but the UI-routing version was deliberately rolled back because auto-navigation and sticky state created instability.

Phase 5.0.2 then rebuilt the useful part safely as **KForge service workflow awareness for AI guidance**.

Phase 5.0.3 then expanded that foundation into **Global AI Capability Awareness**.

Post-phase testing then added a **routing hardening checkpoint** covering no-project state, empty-folder state, manual bypass, truthful post-tool follow-up behavior, and gratitude / closing-turn restraint.

Phase 5.1 then converted Stripe from a placeholder into a real **Stripe Adapter** inside Services → Payments.

Phase 5.1.1 then extended that lane with **Stripe Webhook Readiness** guidance.

Phase 5.2 then returned to its actual purpose: **Supabase Developer Assist**. Real testing in a fresh project validated the generated helper flow, exposed missing Tauri command registration for the new Supabase example/helper actions, and improved the setup/example messaging so the feature is clearer for beginners and vibe coders.

What this now proves:

• the Services layer can support beginner-friendly backend onboarding  
• fast guided entry points reduce friction for vibe coders  
• structured logs materially improve usability  
• per-service history matters once multiple integrations live in one panel  
• backend integrations can remain explicit, calm, and low-noise without turning into dashboard-heavy workflows  
• KForge can support real agent-style reasoning without sacrificing consent-gated tooling  
• weaker models can be made more usable with targeted runtime hardening  
• AI can be taught real KForge workflows without hijacking the UI  
• KForge product awareness can scale beyond Services into Preview, Terminal, and discovered runtime capabilities  
• capability self-discovery reduces drift between real KForge features and AI awareness  
• relevance filtering can reduce prompt bloat while keeping workflow guidance effective  
• task-grouped service-route discovery matters for truthful AI guidance  
• tool-emission rules must distinguish between action requests and explanatory chat  
• stable AI behavior depends on classifying requests into a small number of routing buckets  
• post-tool follow-up messaging must be tied to actual tool success, not merely intended calls  
• Supabase setup helpers become much more valuable when paired with tiny generated starter patterns for real reads and writes  

Current stable journey:

Local Project  
→ GitHub  
→ Smart Deploy Guidance  
→ Vercel / Netlify  
→ Supabase Quick Connect  
→ guided Supabase setup  
→ Supabase Developer Assist starter artifacts  
→ Stripe setup and webhook-readiness guidance  
→ AI tool-calling agent workflow  
→ KForge workflow-aware AI guidance  
→ Global AI capability awareness across Services / Preview / Terminal / registry-discovered features  
→ routing-bucket hardening for calmer, more truthful AI behavior  

This sets up the next major integration lanes:

Phase 5.3 — OpenAI Adapter  
Phase 5.4 — Future Template Expansion  

Important warning for future work:

Do **not** return to intrusive UI-routing intent behavior.

Previously rejected:

• auto-opening Services  
• auto-selecting providers from chat  
• focus-mode side effects  
• sticky recommendation state  
• panel hijacking  

Safe direction is:

AI-awareness only, not UI control.
````

