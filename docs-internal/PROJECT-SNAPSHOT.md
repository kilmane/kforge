# 🧭 KForge — PROJECT SNAPSHOT (Internal Canonical State)

D:\kforge\docs-internal\PROJECT-SNAPSHOT.md

**Last Updated:** March 10th, 2026

**Phase:** 4.3.2.d — AI Filesystem Writing (MVP)
**Status:** Stable milestone reached

This file is the authoritative operational reference.

If anything conflicts with:

* chat memory
* assumptions
* scattered notes

This file wins.

Not user-facing.

---

# 🟠 1️⃣ Project Overview

KForge is a desktop-first developer workspace built around:

* A GPT-clean AI surface
* Secure filesystem access
* Explicit, consent-gated tooling
* Calm, attention-disciplined UI

KForge is **chat-first**, not tool-first.

---

# 🟣 2️⃣ Current Architectural Reality

## 🧠 Execution Authority

AI execution lives in:

```text
src/App.js

This file owns:

Canonical message state

AI request building

Context injection

Patch instruction injection

Retry logic

Project lifecycle control

TranscriptBubble definition

If AI behaves incorrectly → start here.

💬 Single Message Store (Critical Rule)

There is exactly one message array:

messages (owned by App.js)

Everything renders from this.

Structure:

id, role, content, ts, optional action metadata

No duplicate message systems exist.

🧩 Rendering Surfaces

There are two projections of the same message store:

Chat View (GPT-clean, now tool-aware)

File:

src/ai/panel/AiPanel.jsx

Current behavior:

assistant messages visible

AI messages visible

tool-related system messages visible when relevant

consent prompts visible in normal chat

tool success/failure visible in normal chat

This changed in Phase 4.3.2.d so AI file editing can be approved and understood without opening full transcript.

Transcript View

File:

src/ai/panel/TranscriptPanel.jsx

Current behavior:

full message stream

includes user, assistant, system, tool

includes Retry + Clear controls

renders consent actions

Architectural law:

Chat is a filtered projection of Transcript.
Transcript is the complete system log.
There is only one message store.

🟢 3️⃣ Layout & Dock Architecture
🔹 DockShell

File:

src/layout/DockShell.jsx

DockShell supports two explicit layout modes:

Bottom Mode (default)
dockMode = "bottom"

Main layout occupies screen

Dock appears below

Dock capped at max 55% viewport height

Used when Focus OFF

Full Surface Mode (Focus)
dockMode = "full"

Dock replaces main layout

Occupies full height under top bar

No height cap

No 50/50 split

Used when Focus ON

Architectural principle:

Focus mode is a surface promotion, not a resized dock.

This eliminated:

Height fighting

Dock centering bugs

Artificial max-height constraints

🔵 4️⃣ Tool Runtime Pipeline
Tool Detection + Coordination

File:

src/ai/panel/AiPanel.jsx

Responsible for:

parsing model tool requests

handling fenced tool/json/XML payloads

deduplication

triggering runtime execution

consent gating

Confirmed supported input shapes:

XML-ish tool payloads

bare JSON tool calls

Tool Runtime Wrapper

File:

src/ai/tools/toolRuntime.js

Responsible for:

consent enforcement

lifecycle messaging

transcript-visible tool events

success/error formatting

Current runtime flow:

detect tool
→ request consent
→ user approves
→ invoke tool handler
→ append tool result/error
Tool Handlers

File:

src/ai/tools/handlers/index.js

Maps tool name → implementation.

Current relevant tools:

read_file

list_dir

write_file

search_in_file

mkdir

Filesystem authority lives in:

src/lib/fs.js

App.js sets project root.
fs.js enforces path safety.

🟤 4️b Preview Runtime (Phase 4.3.2)

Preview execution is now part of the architecture.

Purpose:

run project-local development servers

stream logs safely into UI

allow explicit start / stop control

detect localhost preview URLs

Backend authority:

src-tauri/src/preview.rs

Frontend bridge:

src/runtime/previewRunner.js

UI surface:

src/runtime/PreviewPanel.jsx

Design constraints:

dev-only

explicit user-triggered execution

no automatic network exposure

no background daemons

fully collapsible UI

does not interfere with AI execution pipeline

Preview is runtime tooling.
It does not alter AI message flow.
It does not modify message state.
It is architecturally isolated from the chat system.

Recent stabilization work:

preview process spawning migrated from tauri_plugin_shell to std::process::Command

Windows PID tracking corrected to prevent orphan node.exe dev servers

Stop now reliably terminates the full process tree

Preview UI state now hydrates from backend using preview_get_status

generated scaffold target persists across panel remount via localStorage

preview panel can be closed and reopened without losing runtime state

This ensures:

Generate → Install → Preview → Stop → Iterate

is now a stable development loop.

Stable preview restore point:

c5ecb50
phase-4.3.2-preview-runner-stable
🟠 5️⃣ AI Filesystem Writing (Phase 4.3.2.d)

This ship delivered the first real AI → workspace file-writing loop.

Confirmed working user flow

Validated in real UI flow:

New / Open Project
→ Open Folder sets project root
→ User sends coding prompt
→ Model emits write_file tool block
→ KForge detects tool request
→ Consent appears in normal chat
→ User approves
→ write_file executes
→ File appears on disk
→ User prompts follow-up edit
→ Same file is updated on disk
Confirmed successful cases

Single-file create:

src/App.jsx created by AI tool call

Single-file edit:

src/App.jsx updated by AI tool call

Filesystem behavior:

writes are scoped to active project root

parent directories are auto-created before write

failures surface visibly in transcript/chat

Fixes that made this work
Consent visibility fix

Normal chat now shows tool-related system messages when they matter, instead of hiding all system messages.

Transcript action forwarding fix

TranscriptPanel.jsx now forwards actions={m.actions} so consent buttons actually render.

Parent directory auto-create fix

saveFile(...) in src/lib/fs.js now creates parent directories before calling writeTextFile(...).

This removed the earlier failure mode:

The system cannot find the path specified. (os error 3)

when AI attempted to write nested files like src/App.jsx in an empty project.

🟡 6️⃣ Known Remaining Gaps
Explorer refresh gap

After AI writes files successfully, Explorer tree does not auto-refresh yet.

So the workspace can be correct on disk while Explorer remains stale until manual refresh / reopen.

This is the next UX ship:

Phase 4.3.2.e — Explorer auto-refresh after AI filesystem changes
Multi-tool execution gap

When one assistant response contains multiple tool blocks, only the first detected tool call is currently executed.

Observed result:

first write_file executed

later write_file blocks in the same model response were skipped

This is the next capability ship after explorer refresh:

Phase 4.3.2.f — Execute multiple tool calls in one assistant response
🟤 7️⃣ UI Philosophy (Locked)

KForge is not:

A debug console with chat attached.

KForge is:

A reasoning-first, calm coding surface.

Principles:

chat is primary

tools are explicit

diagnostics are optional

errors summarized in human language first

raw data available on demand

no hidden side effects

Power-user controls must be:

optional

collapsible

never intrusive

🟠 8️⃣ Focus Mode Intent

Focus Mode exists to:

remove distraction

promote AI surface

preserve editor integrity

Focus Mode does NOT:

change AI behavior

create a new chat mode

duplicate message logic

It only changes layout.

🟣 9️⃣ Provider Strategy (Locked)

KForge supports:

cloud LLMs

OpenAI-compatible endpoints

local runtimes (Ollama etc.)

Model IDs:

user-editable

case-sensitive

sent exactly as provider expects

cost tags are metadata only

No friendly renaming at runtime layer.

🔴 10️⃣ Backup & Safety Discipline

KForge enforces multi-layer backup:

local git

remote GitHub

periodic zip snapshots

external storage backup

Risky refactors must always be reversible.

⚖ 11️⃣ Operational Laws

one objective per chat

major milestone → new chat

revert before hacking deeper

prefer clarity over cleverness

full-file edits preferred for core files

temporary code must be removed

architecture changes must update Project Map + Snapshot

🧠 12️⃣ Current Stability State

As of Phase 4.3.2.d:

single-surface GPT UI stable

transcript and normal chat projections stable

tool consent visible in normal chat

AI file creation working

AI file editing working

filesystem writes scoped safely to workspace

parent directories auto-created on write

preview runner stable

preview stop frees Windows dev-server port correctly

no AI pipeline regression in the single-tool path

This is a restore-grade architecture checkpoint for the first real AI-edit loop.

🧭 When To Update This File

Update when:

dock behavior changes

message flow changes

tool runtime changes

provider architecture changes

layout authority shifts

UI philosophy evolves

AI filesystem behavior changes

preview runtime behavior changes

This file documents architectural truth.