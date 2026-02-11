
# **Project Map (v1)**            Updated: 11/02/2026


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

```
src/App.js
```

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

If AI behavior is wrong → start here.

---

### 🛡 Tool Detection + Consent Runtime

**Primary File:**

```
src/ai/panel/AiPanel.jsx
```

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

```
src/ai/tools/toolRuntime.js
```

Handles:

* Transcript-visible tool events
* Consent enforcement
* Tool invocation lifecycle
* Status bubbles

---

### 🧰 Tool Handlers

**Dispatcher**

```
src/ai/tools/handlers/index.js
```

Maps tool names → implementation functions.

Current tools:

* `read_file`
* `list_dir`
* `write_file`
* `search_in_file`

---

### 📁 Filesystem Layer

```
src/lib/fs.js
```

Responsibilities:

* Project root resolution
* Path safety enforcement
* Tauri FS integration
* `resolvePathWithinProject`
* `openFile`
* `saveFile`
* `readFolderTree`

If files aren’t created → check here.

---

### 💬 AI Panels (UI Surfaces)

All located in:

```
src/ai/panel/
```

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

### 🧾 “System (optional)” Flow

UI:

```
src/ai/panel/SystemPanel.jsx
```

Data flow:

SystemPanel → `aiSystem` prop →
`App.js` → `buildAiRequest()` →
sent to provider as `system` field.

---

### 🔄 Consent Rendering

Consent buttons are created via:

```js
appendMessage("system", ..., { actions: [...] })
```

Buttons are rendered inside:

```
src/ai/panel/TranscriptPanel.jsx
```

If approval UI is broken → inspect TranscriptPanel.

---

## 🧩 Quick Navigation — “Where is X?”

| Task                                | File                                  |
| ----------------------------------- | ------------------------------------- |
| Change AI request payload           | `src/App.js`                          |
| Modify tool detection               | `src/ai/panel/AiPanel.jsx`            |
| Add new tool                        | `src/ai/tools/handlers/index.js`      |
| Change filesystem behavior          | `src/lib/fs.js`                       |
| Modify consent UI                   | `AiPanel.jsx` + `TranscriptPanel.jsx` |
| Modify “System (optional)” behavior | `SystemPanel.jsx` + `App.js`          |

---

## ⚠ Known Sensitive Areas

These files contain multi-layer runtime logic and should be edited carefully:

* `src/App.js`
* `src/ai/panel/AiPanel.jsx`
* `src/lib/fs.js`
* `src/ai/tools/toolRuntime.js`

---

## 📌 Runtime Data

Not committed:

```
.kforge/
```

Contains:

* project-memory.json
* local runtime state

---

## 🧭 Law for Future Changes

When adding:

* A new tool → update handlers + toolRuntime + Project Map
* A new AI field → update SystemPanel / ParametersPanel / App.js
* A new consent behavior → update AiPanel + TranscriptPanel
* A new file interaction → update fs.js

Always update this map in the same commit.

---

# End of Document
