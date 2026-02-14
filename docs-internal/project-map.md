# **Project Map (v1)**            Updated: 12/02/2026

*Baseline topology & execution responsibility map*

---

## **Purpose**

This document reflects the **actual implemented structure** of KForge as of the current AI + Tool runtime phase.

It answers:

* Where does AI execution really happen?
* Where is consent handled?
* Where are tools detected?
* Where does “System (optional)” flow?
* Where are tool handlers implemented?

This version corrects omissions from v0.

---

## 🔥 Critical Runtime Flows (Authoritative)

---

### 🧠 AI Request Execution (Core Brain)

**Primary File:**

src/App.js

This file contains the real AI execution logic.

Key functions:

* `sendWithPrompt`
* `handleSendChat`
* `handleRetryLast`
* `buildAiRequest`
* `runAi(...)`
* `buildInputWithContext`
* Patch instruction injection
* Tool instruction injection

Also owns project lifecycle flows:

* `handleOpenFolder`
* `handleNewProject`
* `handleRefreshTree` (manual Explorer refresh)

If AI behavior is wrong → start here.

---

### 🛡 Tool Detection + Consent Runtime

**Primary File:**


src/ai/panel/AiPanel.jsx


Responsibilities:

* Detect model-initiated tool calls
* Parse:

  * ```tool fences
    ```
  * ```json fences
    ```
  * XML tool calls
  * Bare JSON tool calls
* Deduplicate tool payloads (`processedKeysRef`)
* Trigger `runTool`
* Handle consent gating (`requestConsent`)
* Coordinate tool execution through `runToolCall`

This file is both UI and runtime coordinator.

---

### 🧾 Tool Execution Layer

**Runtime Wrapper**


src/ai/tools/toolRuntime.js


Handles:

* Transcript-visible tool events
* Consent enforcement
* Tool invocation lifecycle
* Status bubbles

---
### 🧰 Dev tools (development-only)

“Dev tools strip” (Tool OK / Tool Err) is hidden in production builds.

In development builds, it can be enabled via keyboard shortcut: Ctrl+Shift+T

Persisted with localStorage key: kforge:devToolsEnabled

Code location: src/ai/panel/AiPanel.jsx and src/ai/panel/TranscriptPanel.jsx


---

### 🧰 Tool Handlers

**Dispatcher**


src/ai/tools/handlers/index.js


Maps tool names → implementation functions.

Current tools:

* `read_file`
* `list_dir`
* `write_file`
* `search_in_file`

---

### 📁 Filesystem Layer


src/lib/fs.js


Responsibilities:

* Project root resolution + safety enforcement (`resolvePathWithinProject`)
* Project root setters (explicit, App-controlled): `setProjectRoot`
* Project memory helpers: `loadProjectMemoryForCurrentRoot`, `saveProjectMemoryForCurrentRoot`
* File operations: `openFile`, `saveFile`, `makeDir`
* Tree building: `readFolderTree`

Important behavior:

* `openProjectFolder()` only returns the chosen folder (no root side-effects)
* `createNewProject()` only creates the folder and returns its path (no root side-effects)
* `App.js` is the authority that sets project root, loads memory, and commits UI state

If files aren’t created → check here.

---

### 💬 AI Panels (UI Surfaces)

All located in:

src/ai/panel/


| File                        | Responsibility                          |
| --------------------------- | --------------------------------------- |
| `AiPanel.jsx`               | Tool runtime + AI orchestration surface |
| `PromptPanel.jsx`           | User prompt input                       |
| `SystemPanel.jsx`           | “System (optional)” input               |
| `ParametersPanel.jsx`       | Temperature + max tokens                |
| `TranscriptPanel.jsx`       | Renders chat bubbles + action buttons   |
| `PatchPreviewPanel.jsx`     | Diff preview                            |
| `ProviderControlsPanel.jsx` | Provider + model selection              |

---
### 💬 AI Panels (UI Gating)

* Advanced settings toggle + gating lives in: src/ai/panel/AiPanel.jsx
  (it controls visibility of SystemPanel / ParametersPanel / OutputPanel / Prompt advanced toggles)

* Vibe-language labels for prompt controls live in: src/ai/panel/PromptPanel.jsx
 (this is where “Send current file…” and “Suggest edits (preview)” wording is owned) 
 
---

### 🧾 “System (optional)” Flow

UI:

src/ai/panel/SystemPanel.jsx

Data flow:

SystemPanel → `aiSystem` prop →
`App.js` → `buildAiRequest()` →
sent to provider as `system` field.

---

### 🔄 Consent Rendering

Consent buttons are created via:

```js
appendMessage("system", ..., { actions: [...] })


Buttons are rendered inside:

src/ai/panel/TranscriptPanel.jsx

If approval UI is broken → inspect TranscriptPanel.


🧩 Quick Navigation — “Where is X?”


| Task                                | File                                  |
| ----------------------------------- | ------------------------------------- |
| Change AI request payload           | `src/App.js`                          |
| Modify tool detection               | `src/ai/panel/AiPanel.jsx`            |
| Add new tool                        | `src/ai/tools/handlers/index.js`      |
| Change filesystem behavior          | `src/lib/fs.js`                       |
| Create a new project                | `src/App.js` + `src/lib/fs.js`        |
| Refresh Explorer tree               | `src/App.js`                          |
| Modify consent UI                   | `AiPanel.jsx` + `TranscriptPanel.jsx` |
| Modify “System (optional)” behavior | `SystemPanel.jsx` + `App.js`          |


------------------------------------

⚠ Known Sensitive Areas

These files contain multi-layer runtime logic and should be edited carefully:

src/App.js

src/ai/panel/AiPanel.jsx

src/lib/fs.js

src/ai/tools/toolRuntime.js

-----------------------------------------------

📌 Runtime Data

Not committed:

.kforge/

---------------------------------

🧭 Law for Future Changes

When adding:

A new tool → update handlers + toolRuntime + Project Map

A new AI field → update SystemPanel / ParametersPanel / App.js

A new consent behavior → update AiPanel + TranscriptPanel

A new file interaction → update fs.js

Always update this map in the same commit