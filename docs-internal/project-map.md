
# 🗺 KForge Project Map

Location:

`D:\kforge\docs-internal\project-map.md`

Version: **v26**
Updated: **13/04/2026**

Purpose: architectural topology, UI ownership map, and execution responsibility map.

---

# 1 Core Application Architecture

## Application Root

File:

```text
src/App.js
````

Responsibilities:

* canonical message store
* AI request execution
* prompt construction
* retry logic
* project lifecycle
* workspace root management
* layout authority
* AI capability-awareness context injection
* workspace activity indicators
* top workspace toolbar rendering
* dock composition between main workspace and AI panel

This is the **AI execution brain**.

App.js is also the **authority for the current project root**.

App.js is the **active React layout authority** for the current application shell.

---

# 1a Window / Shell Area Map

This section exists to make future UI hunts much easier.

When trying to add, remove, or move UI elements, first identify **which shell layer owns that area**.

---

## Native OS Window Chrome / Title Bar

Visual area:

* the very top yellow-strip area
* the place where the **KForge** window title text appears
* the same strip that contains native minimize / maximize / close buttons

Ownership:

* **not rendered by React**
* **not owned by `src/App.js`**
* rendered by the **operating system window chrome** via Tauri

Primary config source:

```text
src-tauri/tauri.conf.json
```

Relevant responsibility:

* window title string
* native window sizing defaults
* native shell behavior at the Tauri window level

Important note:

The visible **KForge** title in that top strip currently comes from the Tauri window configuration, not from a React component.

So if someone asks:

> “Which file renders the KForge title beside the native window buttons?”

the answer is:

* there is **no current React file** rendering that title
* the title is configured in `src-tauri/tauri.conf.json`
* the actual strip is native OS / Tauri window chrome

---

## Native Tauri Menu Bar

Visual area:

* the white strip below the OS title bar
* the strip that contains the native **Help** menu

Ownership:

* **not a React toolbar**
* native Tauri menu surface

Primary file:

```text
src-tauri/src/lib.rs
```

Responsibilities:

* native menu creation
* submenu creation
* native Help links
* menu event routing
* opening external documentation links

Important note:

This bar is the **native Tauri menu bar**, not the same thing as the OS title bar and not the same thing as the React top toolbar inside `src/App.js`.

---

## React App Top Toolbar

Visual area:

* the top in-app bar below native shell surfaces
* contains items like:

  * Focus
  * New Project
  * Open Folder
  * Reset Workspace
  * Refresh
  * Close Folder
  * Save
  * Memory
  * Settings
  * Hide AI
  * current folder path
  * workspace busy badge

Ownership:

```text
src/App.js
```

Relevant local authority:

```text
topBarEl
```

Responsibilities:

* workspace actions
* project path display
* workspace busy indicator display
* AI panel visibility toggle
* memory panel toggle
* save-state feedback

Important note:

This is the main **React-controlled top toolbar**.

It is **below** native window chrome and **below** the native Tauri menu bar.

---

## Explorer Column

Visual area:

* left-hand project tree
* empty-folder message
* no-folder-open message
* folder scanning feedback

Primary file:

```text
src/components/Explorer.jsx
```

Data authority:

```text
src/App.js
```

Responsibilities:

* tree rendering
* folder/file node expansion
* active file highlight
* busy-state display during tree population

Important note:

Explorer does **not** discover project state by itself.

It is a rendering surface for state owned by `App.js`.

---

## Editor Tabs Row

Primary file:

```text
src/components/Tabs.jsx
```

Responsibilities:

* active file tabs
* tab switching
* close behavior for open files

Important note:

This is the **current active tabs surface**.

---

## Editor Surface

Primary file:

```text
src/components/EditorPane.jsx
```

Responsibilities:

* active file content editing
* editor display
* text change propagation back into app state

---

## AI Dock / AI Panel Header

Primary files:

```text
src/layout/DockShell.jsx
src/ai/panel/AiPanel.jsx
```

Visual area:

* right / bottom docked AI surface
* model/provider button
* Help dropdown location candidate
* transcript toggle
* chat / transcript area
* prompt area
* action controls

Responsibilities:

* dock placement
* focus-mode surface promotion
* AI header controls
* chat vs transcript view switching
* prompt and actions rendering

Important note:

When looking for a home for controls such as a **Help dropdown beside the model selector**, the correct current surface is:

```text
src/ai/panel/AiPanel.jsx
```

not the native window chrome and not legacy layout files.

Provider/help note:

Ollama is now split into two first-class KForge chat providers:

* **Ollama endpoint** — local, remote, or self-hosted Ollama endpoint. No KForge API key required.
* **Ollama Cloud** — direct `ollama.com` native API access. Requires an Ollama API key, uses manual model IDs, and does not ship fixed compiled presets.

The live Help dropdown includes a dedicated **How to Use Ollama Cloud** guide.

---

## Legacy / Non-Authority Layout Files

Files such as:

```text
src/layout/TabsBar.js
src/layout/AppLayout.js
src/layout/AssistantPane.js
src/layout/EditorPane.js
src/components/Chat.jsx
```

may still exist in the repository, but they are **not the current root layout authority**.

For the live app shell, the real authority is:

```text
src/App.js
```

This matters because a UI element added to an old layout stub may not appear in the live app.

---

# 2 AI System Architecture

## Single Message Store

Defined in:

```text
src/App.js
```

Structure:

```text
messages = [{ id, role, content, ts, action?, actions? }]
```

Everything renders from this.

There are **no duplicate message systems**.

---

## Rendering Surfaces

### Chat Surface

File:

```text
src/ai/panel/AiPanel.jsx
```

Filtered projection of message store.

Shows:

* assistant messages
* AI messages
* tool-related system messages
* consent prompts
* transient assistant pending bubble

Important note:

Chat mode is **not** the same as Transcript mode.

Chat mode deliberately hides some system noise and shows only the calmer projection.

---

### Transcript Surface

File:

```text
src/ai/panel/TranscriptPanel.jsx
```

Full system log.

Includes:

* user
* assistant
* system
* tool messages

Contains:

* Retry control
* Clear control

Important layout lesson:

`TranscriptPanel.jsx` is sensitive to **scroll ownership**.

The transcript view works correctly when:

* the parent container in `AiPanel.jsx` gives it a real flex height
* `TranscriptPanel.jsx` owns the internal transcript scroll area
* the header and controls are not fighting a parent scroll container

This became especially important during the “missing Clear button” debugging session.

---

## Pending / Activity Feedback

Primary authority:

```text
src/App.js
```

Related surfaces:

```text
src/components/Explorer.jsx
src/ai/panel/AiPanel.jsx
src/ai/panel/TranscriptPanel.jsx
```

Responsibilities:

* workspace busy state
* workspace busy label
* animated activity tick
* assistant pending text animation
* explorer scanning feedback

Current pattern:

* `App.js` owns activity state
* Explorer receives busy props
* AI panel receives `activityTick`
* assistant pending label is animated from shared activity state

---

# 3 Tool Runtime Architecture

## Tool Detection

File:

```text
src/ai/panel/AiPanel.jsx
```

Detects:

* JSON tool payloads
* XML tool payloads
* fenced tool blocks
* natural-language tool calls (fallback for weaker models)

Triggers runtime execution.

---

## Tool Runtime Wrapper

File:

```text
src/ai/tools/toolRuntime.js
```

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

```text
src/ai/tools/toolSchema.js
```

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

```text
src/ai/tools/handlers/index.js
```

Current tools:

* read_file
* write_file
* list_dir
* search_in_file
* mkdir

Filesystem layer:

```text
src/lib/fs.js
```

Ensures project-root safety.

---

# 3a Agent Runtime (Phase 4.10)

Files:

```text
src/ai/agent/agentRunner.js
src/ai/panel/AiPanel.jsx
```

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

```text
src/ai/tools/toolRuntime.js
```

---

# 3b Agent Hardening (Phase 4.10.1)

Phase 4.10.1 improved reliability when using weaker models.

Primary files:

```text
src/ai/panel/AiPanel.jsx
src/ai/agent/agentRunner.js
```

Improvements include:

* natural-language tool-call fallback parsing
* duplicate tool-call suppression
* injection of tool results into continuation prompts
* prevention of runaway directory exploration
* stricter consent handling for write operations
* transcript noise reduction

---

# 3c Preview Runner

Backend:

```text
src-tauri/src/preview.rs
```

Frontend bridge:

```text
src/runtime/previewRunner.js
```

UI:

```text
src/runtime/PreviewPanel.jsx
```

Capabilities:

* dependency installation
* dev server startup
* static preview server
* log streaming
* preview URL detection
* controlled process shutdown
* template detection
* registry-aware project identity detection

---

# 3d Template Registry / Scaffold System

Registry:

```text
src/runtime/templateRegistry.js
```

Backend:

```text
src-tauri/src/scaffold.rs
```

UI:

```text
src/runtime/PreviewPanel.jsx
```

Current templates:

* static-html
* vite-react
* nextjs
* expo-react-native

Scaffold commands:

* scaffold_static_html
* scaffold_vite_react
* scaffold_nextjs
* scaffold_expo_react_native

---

# 4 Command Runner Architecture

Backend:

```text
src-tauri/src/command_runner.rs
```

Frontend bridge:

```text
src/runtime/commandRunner.js
```

UI:

```text
src/runtime/CommandRunnerPanel.jsx
```

Capabilities:

* run shell commands inside project root
* stream stdout/stderr
* Windows compatibility (`cmd /C`)

Events:

```text
kforge://command/log
kforge://command/status
```

User-facing label:

**Terminal**

---

# 5 Service Integration Layer

Backend:

```text
src-tauri/src/service.rs
```

Frontend bridge:

```text
src/runtime/serviceRunner.js
```

Registry:

```text
src/runtime/serviceRegistry.js
```

UI:

```text
src/runtime/ServicePanel.jsx
```

Pattern:

```text
registry entry
+ adapter implementation
```

This allows integrations to plug into a **shared service execution pipeline**.

---

# 5a GitHub Adapter

Capabilities:

* detect Git repository
* detect remote
* publish repository
* open repository
* push changes
* pull changes
* GitHub import during project creation

Authentication handled via:

```text
GitHub CLI (gh)
```

---

# 5b Supabase Adapter

Capabilities:

* readiness inspection
* `.env` helpers
* client install
* client file generation
* Quick Connect
* read / insert example generation
* query helper generation

Generated artifacts:

```text
src/lib/supabase.js
src/examples/supabaseExample.js
src/examples/supabaseInsertExample.js
src/lib/supabaseQueries.js
```

---

# 5c Stripe Adapter

Capabilities:

* Stripe setup inspection
* `.env` helpers
* dashboard handoff
* docs handoff
* webhook-readiness guidance

Environment variables detected:

```text
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

---

# 5d OpenAI Adapter (Phase 5.3)

Primary implementation:

```text
src-tauri/src/service.rs
```

UI:

```text
src/runtime/ServicePanel.jsx
```

Frontend bridge:

```text
src/runtime/serviceRunner.js
```

Registry:

```text
src/runtime/serviceRegistry.js
```

Purpose:

Provide a **guided AI integration workflow**.

Path:

```text
Services
→ AI
→ OpenAI
```

Capabilities currently implemented:

* Check OpenAI setup
* Create `.env` file
* Install OpenAI SDK (`pnpm add openai`)
* Create OpenAI client file
* Create OpenAI example

Generated artifacts:

```text
src/lib/openai.js
src/examples/openaiExample.js
```

This allows projects to move from:

```text
AI idea
→ SDK installed
→ reusable OpenAI client
→ working AI API call
```

---

# 6 AI Capability Awareness System

Primary files:

```text
src/ai/capabilities/kforgeCapabilities.js
src/ai/capabilities/kforgeServiceWorkflows.js
src/ai/capabilities/kforgePreviewWorkflows.js
src/ai/capabilities/kforgeTerminalWorkflows.js
src/ai/capabilities/discoverCapabilities.js
src/ai/taskTemplates/buildKforgeTaskTemplateContext.js
```

Purpose:

Teach the AI about **real KForge workflows** and durable project-aware behavior.

AI can guide users toward:

* Services workflows
* Preview workflows
* Terminal workflows

Discovery sources:

```text
serviceRegistry.js
templateRegistry.js
```

---

# 7 Layout / Dock Architecture

Dock controller:

```text
src/layout/DockShell.jsx
```

Modes:

```text
bottom
full
```

Meaning:

```text
bottom → dock below workspace
full → focus mode
```

Focus mode is a **surface promotion**.

Current active composition:

```text
src/App.js
→ top toolbar
→ explorer/editor workspace
→ DockShell
→ AiPanel
```

Important UI debugging lesson:

When debugging transcript or chat layout, check:

* `src/App.js`
* `src/layout/DockShell.jsx`
* `src/ai/panel/AiPanel.jsx`
* `src/ai/panel/TranscriptPanel.jsx`

in that order.

---

# 8 Operational Flow Map

## Standard Dev Flow

```text
Open folder
→ Generate template (optional)
→ Install
→ Preview
→ Open
→ Iterate
```

---

## AI Editing Flow

```text
Open folder
→ prompt AI
→ AI edits files
→ preview / rerun
```

---

## Agent Flow

```text
Open folder
→ prompt AI
→ AI requests tools
→ tools execute
→ AI continues reasoning
→ final answer
```

---

## Backend Flow

```text
Open folder
→ Services
→ Backend → Supabase
→ guided setup
```

---

## Payments Flow

```text
Open folder
→ Services
→ Payments → Stripe
→ guided setup
```

---

## AI Integration Flow

```text
Open folder
→ Services
→ AI → OpenAI
→ check setup
→ create .env
→ install SDK
→ create client
→ generate example
```

---

# 9 Recent UI Findings Worth Remembering

## Transcript Layout / Missing Clear Button

Files involved:

```text
src/App.js
src/ai/panel/AiPanel.jsx
src/ai/panel/TranscriptPanel.jsx
```

Key finding:

A control can be **fully rendered** and still appear “missing” when the wrong surface owns scroll or height.

Practical lesson:

When transcript controls vanish or the transcript content leaks under the header, inspect:

* parent flex height
* parent overflow ownership
* child scroll ownership
* sticky header assumptions
* whether Transcript mode and Chat mode are using different container rules

---

## Help Menu Placement Search

Files and shell layers discovered during investigation:

```text
src-tauri/tauri.conf.json
src-tauri/src/lib.rs
src/App.js
src/ai/panel/AiPanel.jsx
src/layout/TabsBar.js
```

Useful conclusions:

* the native **KForge title** at the very top is from Tauri window config, not React
* the white **Help** strip is the native Tauri menu bar from `src-tauri/src/lib.rs`
* `src/layout/TabsBar.js` is not the current live authority for the app shell
* the practical React-owned home for a styled Help dropdown is the AI panel header in `src/ai/panel/AiPanel.jsx`

This map should save a lot of future time when deciding:

* whether something belongs in native chrome
* whether it belongs in the native menu bar
* or whether it should live in the React app shell

---

# 10 Stable Milestone Summary

Current milestone includes:

* AI message architecture
* tool runtime
* agent runtime
* preview runner
* scaffold system
* command runner
* terminal panel
* service integration layer
* GitHub adapter
* deploy guidance
* Supabase integration
* Supabase Developer Assist
* Stripe adapter
* Stripe webhook-readiness guidance
* OpenAI adapter
* OpenAI SDK installation
* OpenAI client generation
* OpenAI example generation
* per-service log isolation
* AI capability-awareness system
* workflow-aware AI guidance
* transcript layout hardening
* workspace activity indicators
* animated activity feedback
* AI-panel Help dropdown placement

---

# 11 Next Architecture Lane

Next roadmap phases:

```text
Phase 5.4 — Future Template Expansion
```

Possible future integrations:

* Firebase
* Clerk
* Auth0
* Vercel API integration
* Netlify API integration

Longer term:

```text
Phase 6 — Model Routing & Guidance
```

---

```
```
