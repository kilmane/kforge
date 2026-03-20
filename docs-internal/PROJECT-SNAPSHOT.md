
🧭 KForge — PROJECT SNAPSHOT (Internal Canonical State)

Location:
D:\kforge\docs-internal\PROJECT-SNAPSHOT.md

Last Updated: March 20th, 2026

Phase: 4.4 — Command Runner Panel
Status: Stable milestone ready for commit

Stable commit:

```

pending

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

## Templates (Phase 4.4)

### Static HTML/CSS/JS

New scaffold command:

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

# 🖥 4d Command Runner (NEW — Phase 4.4)

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

---

# 🧠 8️⃣ Current Stability State

As of **Phase 4.4**:

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

Supported workflows now include:

```

AI editing
Project scaffolding
Dev server preview
Static site preview
In-app terminal commands

```

This milestone represents the **first complete local development loop inside KForge**.

A restore-grade checkpoint for the KForge runtime architecture.
```

---

