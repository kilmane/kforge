

# Full File Replacement

`D:\kforge\docs-internal\PROJECT-SNAPSHOT.md`

```markdown
🧭 KForge — PROJECT SNAPSHOT (Internal Canonical State)

Location:
D:\kforge\docs-internal\PROJECT-SNAPSHOT.md

Last Updated: March 24th, 2026

Phase: 4.7 — Deploy Pipeline
Status: Stable milestone ready to commit and tag

Recommended stable tag:
phase-4.7-deploy-pipeline-stable

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

## GitHub Publish Workflow

When the user clicks **Publish**:

1. Validate workspace path  
2. Ensure `git` is installed  
3. Ensure `gh` (GitHub CLI) is installed  
4. Verify authentication using:

gh auth status

5. Initialize repository if needed:

git init

6. Stage project files:

git add .

7. Create initial commit:

git commit -m "Initial commit from KForge"

8. Ensure main branch:

git branch -M main

9. Create repository and push:

gh repo create <repo-name> --public|--private --source . --remote origin --push

---

## GitHub Import Workflow (Phase 4.6 Part 4)

KForge now supports importing an existing GitHub repository at project-creation time.

This is effectively:

git clone

Current entry point:

New Project flow

Current UX:

Type 1 or 2 then press Enter

1 — Create local project  
2 — Import from GitHub

If the user chooses **2**:

1. ask for GitHub repository URL  
2. ask for optional folder name  
3. ask where to place the project  
4. run clone into selected parent folder  
5. automatically open the cloned project in KForge  

This is the correct workflow for bringing an existing GitHub project onto the local machine.

---

## GitHub Action Meanings (Important)

These actions are intentionally different:

### Publish

Create a new GitHub repo from the current local project.

### Push changes

Send current local changes to an already connected GitHub repo.

### Pull latest

Bring the latest remote changes into the current local repo.

### Open on GitHub

Open the repository webpage in the browser.

### Import from GitHub

Clone a GitHub repo locally as a new project.

This distinction is important:

**Pull latest is not import.**  
**Open on GitHub is not import.**

Import only happens during the **New Project** flow in the current implementation.

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

## Service Panel UX Architecture (Phase 4.6 Part 3)

The Services panel was significantly reworked in Phase 4.6 Part 3.

Previous issue:

• stacked services created clutter  
• placeholder services competed with real services  
• activity log risked becoming chaotic  

Current architecture:

• task-first tab grouping  
• one active service visible at a time  
• provider chips inside selected task  
• activity log contained inside active service panel  
• calmer, lower-noise visual hierarchy  

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

## Deploy Capabilities Now Implemented

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

## Deploy UX Model

Location:

Services → Deploy

Provider choices:

• Vercel  
• Netlify  

Deploy surface behavior:

• uses detected GitHub remote from the current project  
• shows repo context directly in the panel  
• blocks deploy action when GitHub is not connected  
• opens the browser to the provider flow when deploy is available

Current wording in the UI includes:

• GitHub repo: <owner/repo>  
• Deploy with Vercel  
• Deploy with Netlify  
• Connect GitHub first  
• Push changes before deploying

---

## Vercel Flow

When the current project has a valid GitHub remote, KForge opens:

https://vercel.com/new/clone?repository-url=<github-repo-url>

This allows the Vercel import flow to begin directly from the current repository.

KForge logs a message such as:

Opened Vercel import for <owner/repo>.

---

## Netlify Flow

When the current project has a valid GitHub remote, KForge opens:

https://app.netlify.com/start

The user then selects GitHub and chooses the repository.

KForge logs a message such as:

Opened Netlify import. Choose GitHub and select <owner/repo>.

---

## Deploy Readiness Rule

Deployment currently depends on GitHub connection.

Minimum expected state:

• current folder is a Git repo  
• origin remote exists  
• remote is a supported GitHub URL  

If this is not true, the Deploy panel shows:

Connect GitHub first

If the project is connected but no commit history is present yet, the Deploy panel shows:

Push changes before deploying

This keeps deploy guidance calm and explicit.

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

As of **Phase 4.7**:

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

• Supabase  
• Stripe  
• OpenAI  

Possible future deploy improvements:

• template-aware deploy guidance  
• static vs SSR deploy recommendations  
• framework-specific hints before browser handoff

---

# 🚢 Phase Boundary

Phase 4.7 is now a stable milestone built on top of the completed Phase 4.6 GitHub workflow.

What Phase 4.7 proves:

• the Service Integration Layer works beyond GitHub  
• grouped Services UI scales into multiple provider families  
• deploy actions can remain lightweight and guided  
• KForge can connect local project → GitHub → deploy platform without turning into a hosting dashboard

Current stable journey:

Local Project  
→ GitHub  
→ Vercel / Netlify

This sets up the next major phase:

Phase 4.8 — Supabase Integration (real full-stack)
```

