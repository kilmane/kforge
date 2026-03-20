
🧭 KForge — PROJECT SNAPSHOT (Internal Canonical State)

Location:
D:\kforge\docs-internal\PROJECT-SNAPSHOT.md

Last Updated: March 20th, 2026

Phase: 4.5 — Service Integration Layer (Foundation)
Status: Stable milestone ready for commit

Stable commit: d1d30cc

```

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

```

src/App.js

```

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

```

messages (owned by App.js)

```

Everything renders from this.

Structure:

```

id, role, content, ts, optional action metadata

```

No duplicate message systems exist.

---

# 🧩 Rendering Surfaces

Two projections of the same message store.

## Chat View (GPT-clean)

File:

```

src/ai/panel/AiPanel.jsx

```

Shows:

• assistant messages  
• AI messages  
• relevant tool messages  
• consent prompts  

---

## Transcript View

File:

```

src/ai/panel/TranscriptPanel.jsx

```

Full system log.

Contains:

• user / assistant / system / tool messages  
• Retry + Clear controls  
• consent actions  

Architectural rule:

```

Chat = filtered projection
Transcript = complete system log

```

---

# 🟢 3️⃣ Layout & Dock Architecture

## DockShell

File:

```

src/layout/DockShell.jsx

```

Supports two layout modes.

### Bottom Mode (default)

```

dockMode = "bottom"

```

Dock sits under main workspace.

---

### Focus Mode

```

dockMode = "full"

```

Dock replaces main layout.

Focus mode is a **surface promotion**, not a resized dock.

---

# 🔵 4️⃣ Tool Runtime Pipeline

## Tool Detection

File:

```

src/ai/panel/AiPanel.jsx

```

Handles:

• tool payload parsing  
• JSON/XML tool formats  
• deduplication  
• consent gating  
• execution dispatch  

---

## Tool Runtime Wrapper

File:

```

src/ai/tools/toolRuntime.js

```

Responsibilities:

• consent enforcement  
• lifecycle messages  
• transcript logging  
• error formatting  

Runtime flow:

```

detect tool
→ consent request
→ handler execution
→ append result

```

---

## Tool Handlers

File:

```

src/ai/tools/handlers/index.js

```

Tools currently available:

• read_file  
• list_dir  
• write_file  
• search_in_file  
• mkdir  

Filesystem authority:

```

src/lib/fs.js

```

App.js sets project root.  
fs.js enforces safety.

---

# 🟤 4b Preview Runtime

Preview runner executes project development environments.

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

## Preview Responsibilities

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

## Preview Detection

Detection occurs in **two stages**.

### Stage 1 — Coarse backend detection

```

package.json → package project
index.html → static project

```

Implemented by:

```

preview_detect_kind()

```

Returns:

```

package
static

```

---

### Stage 2 — Template identification

Frontend inspects dependencies and matches against **Template Registry hints**.

Examples:

```

next → Next.js
vite + react → Vite + React
index.html without package.json → Static HTML/CSS/JS

```

Detection result:

```

{
kind,
compatibleTemplates,
detectedTemplate
}

```

---

# 🧱 4c Scaffold System

Backend:

```

src-tauri/src/scaffold.rs

```

Frontend trigger:

```

src/runtime/PreviewPanel.jsx

```

Registry:

```

src/runtime/templateRegistry.js

```

Registered scaffold commands:

```

scaffold_static_html
scaffold_vite_react
scaffold_nextjs

```

---

## Scaffold Behavior

Scaffolds generate **directly in the workspace root**.

Example:

```

workspace/
├ src/
├ package.json
├ vite.config.js
└ index.html

```

No nested folder is created.

---

## Templates (Phase 4.5 baseline)

### Static HTML/CSS/JS

Scaffold command:

```

scaffold_static_html

```

Creates:

```

index.html
styles.css
script.js

```

Characteristics:

• no dependency install required  
• preview works immediately  
• install button hidden after generation  

Example logs:

```

Generating Static HTML starter...
Created: index.html, styles.css, script.js
Ready: Static HTML does not need Install. Click Preview, then Open.
scaffold complete: <path>

```

---

### Vite + React

```

pnpm dlx create-vite@latest . --template react --no-interactive

```

Characteristics:

• lightweight scaffold  
• dependencies installed via Install button  

---

### Next.js

```

pnpm create next-app@latest . --yes

```

Characteristics:

• heavier scaffold  
• dependencies installed during generation  

---

# 🖥 4d Command Runner

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

Panel host:

```

src/ai/panel/AiPanel.jsx

```

---

## Command Runner Capabilities

Provides a simple in-app terminal for the active project root.

Features:

• run commands inside workspace root  
• stream stdout/stderr logs  
• run one command at a time  
• maintain command state  
• emit terminal events to UI  

---

## Windows Compatibility

Commands execute via:

```

cmd /C <command>

```

This enables shell built-ins such as:

```

dir
echo hello

```

---

## Command Runner Events

```

kforge://command/log
kforge://command/status

```

---

## UI Behavior

Preview and Terminal panels are **mutually exclusive collapsibles**.

```

▶ Preview
▶ Terminal

```

Opening one automatically closes the other.

They **share the same panel space** and are never split side-by-side.

---

# 🔌 4e Service Integration Layer (Foundation)

Backend:

```

src-tauri/src/service.rs

```

Frontend bridge:

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

Panel host:

```

src/ai/panel/AiPanel.jsx

```

Registered service command:

```

service_setup

```

---

## Service Layer Purpose

This phase introduces the **foundation for future external services**.

It exists so later integrations such as:

• Supabase  
• Stripe  
• OpenAI  
• GitHub  
• Vercel / Netlify style deploy providers  

can plug into KForge through a shared architecture.

This phase does **not** implement real integrations yet.

---

## Service Layer Responsibilities

The new layer provides:

• service metadata registry  
• frontend runtime bridge  
• service status/log event handling  
• a UI surface for guided service setup  
• backend placeholder command infrastructure  

This is an architectural lane, not a fully active feature set.

---

## Service Registry

File:

```

src/runtime/serviceRegistry.js

```

The registry defines service metadata.

Current fields include:

• `id`  
• `name`  
• `description`  
• `status`  
• `envVars`  
• `setupCommand`  

Current placeholder services:

• Supabase  
• Stripe  
• OpenAI  

Important architectural rule:

```

new service = registry entry + adapter implementation

```

rather than:

```

new service = new subsystem

```

---

## Service Runtime Bridge

File:

```

src/runtime/serviceRunner.js

```

Responsibilities:

• invoke backend service setup  
• subscribe to service log events  
• subscribe to service status events  

Events:

```

kforge://service/log
kforge://service/status

```

This mirrors the same runtime pattern already used by Preview and Command Runner.

---

## Backend Placeholder

File:

```

src-tauri/src/service.rs

```

Current backend behavior:

• validate project path  
• validate service id  
• emit log events  
• emit status events  
• allow one service setup at a time  

Current phase boundary:

• no real external service connection  
• no env file writing  
• no account authentication  
• no config generation  
• no SDK installation  

It is intentionally a **placeholder runtime lane**.

---

## Service UI Behavior

`ServicePanel.jsx` shows the current known services and basic service metadata.

Current UI responsibilities:

• show service name and status  
• show declared environment variables  
• allow placeholder setup action for available services  
• stream service logs into panel  
• display current project/workspace path  

The Services panel is designed to be:

• minimal  
• guided  
• explicit  
• non-dashboard-like  

---

## Runtime Panel Integration

Preview, Terminal, and Services are now separate collapsible runtime panels inside `AiPanel.jsx`.

Current behavior:

```

▶ Preview
▶ Terminal
▶ Services

```

Rules:

• opening one closes the others  
• they share the same panel area  
• only one runtime surface is visible at a time  

This preserves a focused right-side runtime workspace.

---

# 🟡 5️⃣ Stable Development Loop

Canonical workflow:

```

Open folder
Generate (optional)
Install
Preview
Open
Stop
Iterate

```

AI workflow:

```

Open folder
Prompt AI
AI edits files
Install
Preview
Hot reload

```

Service workflow foundation now exists for future phases:

```

Open folder
Open Services
Choose service
Run guided setup
Continue coding

```

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

Service setup phases in the future must also obey the same project-root rule.

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

As of **Phase 4.5**:

• AI surface stable  
• filesystem tools validated  
• preview runner stable  
• static HTML preview working  
• template registry operational  
• registry-aware project detection implemented  
• static scaffold restored and working  
• install button logic corrected for static projects  
• preview detection refresh after scaffold implemented  
• command runner panel implemented  
• terminal command streaming operational  
• service integration foundation implemented  
• service registry operational  
• service runtime placeholder wired into frontend and backend  
• Services panel added to AI panel  

Supported workflows now include:

```

AI editing
Project scaffolding
Dev server preview
Static site preview
In-app terminal commands
Service integration foundation

```

This milestone represents a **restore-grade architectural checkpoint**.

KForge now has four major extensibility/runtime lanes:

```

Template Registry
Service Registry
Preview Runtime
Command Runtime

```

Future phases such as GitHub integration, deploy pipeline work, and Supabase setup can now plug into this foundation instead of creating fresh subsystems.
```

