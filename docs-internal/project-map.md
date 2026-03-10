# 🗺 KForge Project Map

D:\kforge\docs-internal\project-map.md

**Version:** v3
**Updated:** 10/03/2026
**Purpose:** Architectural topology & execution responsibility map

---

# 1️ Core Application Architecture

## 🧠 1.1 Application Root (Execution Authority)

### 📍 `src/App.js`

This is the **brain of the application**.

### Responsibilities

* Owns global state:

  * `messages`
  * `focusMode`
  * project root
  * AI configuration
* Executes AI requests
* Injects system instructions
* Injects patch instructions
* Builds contextual prompt
* Handles retry logic
* Controls project lifecycle
* Owns top-level layout
* Defines `TranscriptBubble`

### Key Functions

* `sendWithPrompt`
* `handleSendChat`
* `handleRetryLast`
* `buildInputWithContext`
* `runAi(...)`
* `maybeCapturePatchPreview`

### Project Lifecycle (App-level Authority)

* `handleOpenFolder`
* `handleNewProject`
* `handleRefreshTree`
* Sets project root
* Loads project memory
* Commits UI state

> If AI behavior is wrong → start here.

---

# 2️ AI System Architecture

## 🔹 2.1 Single Message Store (Critical Rule)

### Canonical State

```js
messages = [{ id, role, content, ts, action?, actionLabel?, actions? }]

📍 Defined in: src/App.js

There is only one message store.

Everything renders from it.

🔹 2.2 Message Rendering Surfaces
🧩 TranscriptBubble

Defined in:

src/App.js

Injected downward:

App.js → AiPanel → TranscriptPanel

There are no duplicate bubble implementations.

TranscriptBubble supports both:

single action button via actionLabel + onAction

multi-action button arrays via actions

This matters for tool consent rendering.

🧠 Chat View (GPT-style Surface)

📍 src/ai/panel/AiPanel.jsx

Renders a filtered projection of the canonical message store.

Now includes:

assistant messages

AI messages

tool-related system messages

consent requests with action buttons

Filter behavior:

assistant / ai messages always visible

system messages visible in normal chat when:

they have actions, or

content begins with [tool]

This was expanded in Phase 4.3.2.d so tool consent and tool status are visible without opening full transcript.

📜 Transcript View

📍 src/ai/panel/TranscriptPanel.jsx

Renders full message stream

Includes:

user

assistant

system

tool events

Contains Retry / Clear controls

Renders consent buttons

Must forward actions={m.actions} into TranscriptBubble

🧭 Architectural Rule

Chat View is a filtered projection of Transcript.
Transcript is the full system log.
There is only one message store.

Prevents:

UI drift

Bubble prop mismatch bugs

State duplication

Ghost rendering bugs

3️ Tool Runtime Architecture
🔍 3.1 Tool Detection & Coordination

📍 src/ai/panel/AiPanel.jsx

Responsibilities:

Detect model-initiated tool calls

Parse:

XML tool calls

Bare JSON tool calls

Deduplicate payloads (processedKeysRef + global seen cache)

Trigger runToolCall

Gate execution behind consent

This file is both:

UI controller

Runtime coordinator

Important current behavior

Model tool requests are now visible in normal chat view.

Confirmed working narrow path:

assistant tool block
→ AiPanel detects tool request
→ toolRuntime requests consent
→ user approves
→ handler executes
→ tool result appears in transcript/chat
Current limitation

When a single assistant response contains multiple tool blocks, only the first detected tool call is executed.

So this currently supports:

single tool call per assistant response ✅

But not yet:

sequential execution of multiple tool calls from one response ❌

This is the next follow-up ship after explorer refresh.

⚙ 3.2 Tool Runtime Wrapper

📍 src/ai/tools/toolRuntime.js

Handles:

Consent enforcement

Tool lifecycle state

Transcript-visible system messages

Success/error formatting

Invocation coordination

Current runtime flow:

normalize tool
→ append pre-call system status
→ wait for consent
→ invoke handler
→ append result/error system status
🧰 3.3 Tool Handlers (Execution Layer)

📍 src/ai/tools/handlers/index.js

Maps:

tool name → implementation

Current tools:

read_file

list_dir

write_file

search_in_file

mkdir

Confirmed real filesystem behavior

write_file is now confirmed to perform real disk writes through the filesystem layer.

Validated user flow:

create new/open project

ask AI to create src/App.jsx

approve tool request

file appears on disk

ask AI to update same file

approve tool request

file content changes on disk

This is the Phase 4.3.2.d breakthrough.

3️b Preview Runner (Phase 4.3.2 — Dev Runtime)

📍 Backend: src-tauri/src/preview.rs
📍 Frontend bridge: src/runtime/previewRunner.js
📍 UI: src/runtime/PreviewPanel.jsx

Purpose

Provides controlled local project preview via:

pnpm install

pnpm dev

Process lifecycle management (start / stop)

Log streaming (stdout / stderr)

Localhost URL detection

Architecture
Backend (Tauri)

Uses std::process::Command to spawn pnpm install and pnpm dev

Tracks the spawned process PID in PreviewState

Uses Windows taskkill /PID <pid> /T /F to terminate the entire dev server tree

Streams stdout / stderr lines into the UI

Events emitted:

kforge://preview/log

kforge://preview/status

Preview state is registered via:

.manage(preview::PreviewState::default())

in src-tauri/src/lib.rs.

This avoids Windows PID tracking issues previously observed with tauri_plugin_shell.

Frontend Bridge

previewRunner.js:

Wraps invoke() calls:

preview_install

preview_start

preview_stop

Subscribes to emitted log/status events

UI Layer

PreviewPanel.jsx:

Dev-only

Collapsible

Receives projectPath from:

App.js → AiPanel → PreviewPanel
Design Constraints

Dev-only (not visible in production builds)

Explicit user-triggered execution

No automatic network exposure

Localhost only

No background daemons

4️ Filesystem Layer

📍 src/lib/fs.js

Responsibilities:

Safe path resolution

Project root enforcement

Memory loading/saving

File operations

Folder tree building

Important rule:

App.js is the only authority that sets project root.

These functions:

openProjectFolder()

createNewProject()

Do NOT mutate global state.

Phase 4.3.2.d filesystem behavior

saveFile(...) now auto-creates the parent directory before writing.

This means AI file writes like:

src/App.jsx

src/main.jsx

src/components/Button.jsx

can succeed even when parent folders do not yet exist.

Current limitation

Explorer tree does not auto-refresh after successful AI filesystem changes.

So files may exist on disk while Explorer remains stale until manual refresh / reopen.

If file creation fails → check here.

5️⃣ Layout & Dock Architecture
🔹 DockShell (Layout Controller)

📍 src/layout/DockShell.jsx

This component controls:

Main layout surface

Dock positioning

Height behavior

🔹 Dock Modes (Phase 4.2i)
1️⃣ Bottom Dock Mode (default)
dockMode="bottom"

Main layout occupies space

Dock panel capped at max-h-[55vh]

Used when Focus OFF

2️⃣ Full Surface Mode (Focus)
dockMode="full"

Dock panel replaces main layout

Occupies full height under top bar

Used when Focus ON

Architectural Principle

Focus Mode is not a resized dock.
It is a surface promotion of the dock panel.

Eliminates:

Height fighting

50/50 splits

Artificial max-height caps

Dock centering bugs

6️⃣ AI UI Panels (Surface Components)

📍 src/ai/panel/

File	Responsibility
AiPanel.jsx	AI surface + tool runtime coordination
PromptPanel.jsx	Prompt input UI
SystemPanel.jsx	System (optional) field
ParametersPanel.jsx	Temperature + tokens
TranscriptPanel.jsx	Transcript rendering
PatchPreviewPanel.jsx	Diff preview
ProviderControlsPanel.jsx	Provider/model selection
7️⃣ System Field Flow

UI:

SystemPanel.jsx

Data flow:

SystemPanel
→ AiPanel
→ App.js
→ buildInputWithContext()
→ sent to provider as `system`
8️⃣ Consent Rendering

Consent buttons are created using:

appendMessage("system", ..., { actions: [...] })

Rendered through:

App.js TranscriptBubble

Forwarded by:

TranscriptPanel.jsx
AiPanel.jsx normal chat view

If consent UI breaks → inspect:

AiPanel.jsx

TranscriptPanel.jsx

src/App.js (TranscriptBubble)

9️⃣ Dev Tools (Development Only)

Hidden in production.

Enabled via:

Ctrl + Shift + T

Persisted:

localStorage: kforge:devToolsEnabled

Located in:

AiPanel.jsx

TranscriptPanel.jsx

🔟 Quick Navigation (“Where is X?”)
Task	File
Modify AI request payload	src/App.js
Change tool detection	src/ai/panel/AiPanel.jsx
Add a new tool	src/ai/tools/handlers/index.js
Change filesystem behavior	src/lib/fs.js
Modify dock behavior	src/layout/DockShell.jsx
Modify chat rendering	src/App.js
Modify transcript UI	src/ai/panel/TranscriptPanel.jsx
Modify consent behavior	src/ai/panel/AiPanel.jsx + src/ai/panel/TranscriptPanel.jsx
Modify preview runtime	src-tauri/src/preview.rs
Modify preview bridge	src/runtime/previewRunner.js
Modify preview UI	src/runtime/PreviewPanel.jsx
⚠ Sensitive Runtime Files

Edit carefully:

src/App.js

src/ai/panel/AiPanel.jsx

src/ai/panel/TranscriptPanel.jsx

src/lib/fs.js

src/ai/tools/toolRuntime.js

src/layout/DockShell.jsx

src-tauri/src/preview.rs

These files coordinate multiple systems.

📦 Runtime Data (Not Committed)
.kforge/
🧭 Law for Future Changes

When adding:

New tool → update handlers + toolRuntime + Project Map

New AI parameter → update SystemPanel / ParametersPanel / App.js

New consent behavior → update AiPanel + TranscriptPanel + Project Map

New file interaction → update fs.js

New layout mode → update DockShell + Project Map

New preview runtime behavior → update preview.rs / previewRunner / PreviewPanel + Project Map

Always update this map in the same commit as architectural changes.

🧠 Architectural Summary

KForge is built around:

One canonical message store

One AI execution authority (src/App.js)

One surface promoted via DockShell

One tool runtime pipeline

One real filesystem bridge for AI edits

Strict separation of UI projection vs runtime state

No duplicate message systems.
No duplicated bubble renderers.
No split dock logic.

Phase 4.3.2.d confirmed that AI filesystem edits are now real, consent-gated, and scoped to the active workspace.