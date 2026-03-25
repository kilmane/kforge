
🧭 KForge — PROJECT SNAPSHOT (Internal Canonical State)

Location:
D:\kforge\docs-internal\PROJECT-SNAPSHOT.md

Last Updated: March 25th, 2026

Phase: 4.8.2 — Guided Supabase Actions
Status: Stable milestone ready to commit and tag

Recommended stable tag:
phase-4.8.2-guided-supabase-actions-stable

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

AI execution lives in:

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
• deduplication  
• consent gating  
• execution dispatch  

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
github_clone_repo  
supabase_create_env_file  
supabase_install_client  
supabase_create_client_file  
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

Service logs persist when:

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

Phase 4.8.2 upgrades the Supabase lane from a mostly diagnostic checker into a **guided setup assistant**.

This phase exists specifically to remove ambiguity for beginners and vibe coders.

Primary files:

• src-tauri/src/service.rs  
• src-tauri/src/lib.rs  
• src/runtime/serviceRunner.js  
• src/runtime/serviceRegistry.js  
• src/runtime/ServicePanel.jsx  

---

## Supabase Capabilities Added in 4.8.2

The Supabase adapter now also supports:

• improved final success wording after readiness check  
• detection of `VITE_SUPABASE_URL`  
• detection of `VITE_SUPABASE_ANON_KEY`  
• clearer Vite-aware guidance in the Supabase panel  
• guided install action for `@supabase/supabase-js`  
• guided creation of `src/lib/supabase.js`  
• detection of an existing Supabase helper file  
• non-destructive helper generation behavior

New commands added:

supabase_install_client  
supabase_create_client_file

---

## Supabase Helper File Behavior

KForge can now generate:

src/lib/supabase.js

Typical helper logic:

• imports `createClient` from `@supabase/supabase-js`  
• reads `VITE_SUPABASE_URL` or `SUPABASE_URL`  
• reads `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`  
• exports a reusable `supabase` client

If a helper file already exists, KForge logs that no changes were made and leaves the file untouched.

---

## Supabase User Flow Now Supported

Current intended Supabase path:

Open folder  
→ Services  
→ Backend → Supabase  
→ Check Supabase setup  
→ Create `.env` file if needed  
→ Add connection values  
→ Install Supabase client  
→ Create Supabase client file  
→ import Supabase client into application code

This is the first time KForge supports a **backend integration lane with guided setup actions**, not just diagnostics.

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

Service workflow:

Open folder  
Open Services  
Publish to GitHub  
Push changes  
Deploy via Vercel or Netlify  
Configure Supabase if needed  
Continue development

Import workflow:

New Project  
Choose local create or GitHub import  
Open project automatically  
Continue development

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

---

# 🧠 8️⃣ Current Stability State

As of **Phase 4.8.2 Guided Supabase Actions**:

• AI surface stable  
• filesystem tools validated  
• preview runner stable  
• scaffold system operational  
• template registry working  
• command runner operational  
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
• Supabase helper file creation working  
• Supabase documentation captured

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
Supabase environment file preparation  
Supabase client install guidance  
Supabase helper file generation

---

# 🏗 Extensibility Lanes

KForge now has four extensibility/runtime systems:

Template Registry  
Service Registry  
Preview Runtime  
Command Runtime

These lanes allow new capabilities to be added without redesigning the architecture.

Future integrations will attach adapters rather than creating new subsystems.

Planned adapters:

• Stripe  
• OpenAI  

Possible future backend improvements:

• environment variable manager  
• template-aware backend scaffolding  
• Stripe adapter  
• OpenAI adapter  
• richer Supabase code generation guidance  
• lightweight Supabase connection test action

---

# 🚢 Phase Boundary

Phase 4.8.2 completes the first **guided Supabase action** milestone built on top of the service integration architecture.

What this phase proves:

• the Services layer can support backend integrations, not just code hosting and deploy  
• beginner setup assistance can be extended from diagnostics into guided actions  
• `.env.example`, `.env`, package installation, and helper-file generation all fit naturally into the service lane  
• KForge can reduce technical ambiguity without turning integrations into dashboard-heavy workflows

Current stable journey:

Local Project  
→ GitHub  
→ Smart Deploy Guidance  
→ Vercel / Netlify  
→ Supabase guided setup

This sets up the next major integration lanes:

Stripe adapter  
OpenAI adapter  
Environment variable manager  
Template-aware backend scaffolding
```


