
🧭 KForge — PROJECT SNAPSHOT (Internal Canonical State)

Location:
D:\kforge\docs-internal\PROJECT-SNAPSHOT.md

Last Updated: March 21st, 2026

Phase: 4.6 — GitHub Integration
Status: Stable milestone ready for commit

Stable commit: <to be filled after commit>

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

Registered command:

service_setup

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

Fields include:

• id  
• name  
• description  
• status  
• envVars  
• setupCommand  

---

# 🟣 GitHub Integration (Phase 4.6)

Phase 4.6 introduces the **first real service adapter**.

The GitHub adapter allows a local project to be published directly to GitHub.

Backend implementation:

src-tauri/src/service.rs

Frontend UI:

src/runtime/ServicePanel.jsx

Runtime bridge:

src/runtime/serviceRunner.js

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

• repository name input  
• public/private visibility selection  
• GitHub publish trigger  
• live service log streaming  

Service logs persist when:

• collapsing / reopening Services

Logs reset when:

• workspace resets  
• project root changes

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

As of **Phase 4.6**:

• AI surface stable  
• filesystem tools validated  
• preview runner stable  
• scaffold system operational  
• template registry working  
• command runner operational  
• service integration layer operational  
• GitHub publishing implemented  

Supported workflows now include:

AI editing  
Project scaffolding  
Dev server preview  
Static site preview  
In-app terminal commands  
GitHub repository publishing

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
• Deploy providers (Vercel / Netlify)

---

This milestone represents a **restore-grade architectural checkpoint**.

Phase 4.6 proves the Service Integration Layer works with a real external platform (GitHub).
```

---

After saving, run:

```powershell
git add docs-internal/PROJECT-SNAPSHOT.md
```


