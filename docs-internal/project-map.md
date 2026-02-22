
# 🗺 KForge Project Map

**Version:** v2
**Updated:** 22/02/2026
**Purpose:** Architectural topology & execution responsibility map

---

# 1️⃣ Core Application Architecture

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

# 2️⃣ AI System Architecture

## 🔹 2.1 Single Message Store (Critical Rule)

### Canonical State

```js
messages = [{ id, role, content, ts, action?, actionLabel? }]
```

📍 Defined in: `src/App.js`

There is **only one message store**.

Everything renders from it.

---

## 🔹 2.2 Message Rendering Surfaces

### 🧩 TranscriptBubble

Defined in:

```
src/App.js
```

Injected downward:

```
App.js → AiPanel → TranscriptPanel
```

There are **no duplicate bubble implementations**.

---

### 🧠 Chat View (GPT-style Surface)

📍 `src/ai/panel/AiPanel.jsx`

* Renders assistant-only messages
* Clean surface
* No system/tool noise
* No duplicate state

Filter:

```js
role === "assistant" || role === "ai"
```

---

### 📜 Transcript View

📍 `src/ai/panel/TranscriptPanel.jsx`

* Renders full message stream
* Includes:

  * user
  * assistant
  * system
  * tool events
* Contains Retry / Clear controls
* Renders consent buttons

---

### 🧭 Architectural Rule

> Chat View is a filtered projection of Transcript.
> Transcript is the full system log.
> There is only one message store.

Prevents:

* UI drift
* Bubble prop mismatch bugs
* State duplication
* Ghost rendering bugs

---

# 3️⃣ Tool Runtime Architecture

## 🔍 3.1 Tool Detection & Coordination

📍 `src/ai/panel/AiPanel.jsx`

Responsibilities:

* Detect model-initiated tool calls
* Parse:

  * ```tool fences
    ```
  * ```json fences
    ```
  * XML tool calls
  * Bare JSON tool calls
* Deduplicate payloads (`processedKeysRef`)
* Trigger `runToolCall`
* Gate execution behind consent

This file is both:

* UI controller
* Runtime coordinator

---

## ⚙ 3.2 Tool Runtime Wrapper

📍 `src/ai/tools/toolRuntime.js`

Handles:

* Consent enforcement
* Tool lifecycle state
* Transcript-visible system messages
* Success/error formatting
* Invocation coordination

---

## 🧰 3.3 Tool Handlers (Execution Layer)

📍 `src/ai/tools/handlers/index.js`

Maps:

```
tool name → implementation
```

Current tools:

* `read_file`
* `list_dir`
* `write_file`
* `search_in_file`

---

# 4️⃣ Filesystem Layer

📍 `src/lib/fs.js`

Responsibilities:

* Safe path resolution
* Project root enforcement
* Memory loading/saving
* File operations
* Folder tree building

Important rule:

> App.js is the only authority that sets project root.

These functions:

* `openProjectFolder()`
* `createNewProject()`

Do NOT mutate global state.

If file creation fails → check here.

---

# 5️⃣ Layout & Dock Architecture

## 🔹 DockShell (Layout Controller)

📍 `src/layout/DockShell.jsx`

This component controls:

* Main layout surface
* Dock positioning
* Height behavior

---

## 🔹 Dock Modes (Phase 4.2i)

### 1️⃣ Bottom Dock Mode (default)

```js
dockMode="bottom"
```

* Main layout occupies space
* Dock panel capped at `max-h-[55vh]`
* Used when Focus OFF

---

### 2️⃣ Full Surface Mode (Focus)

```js
dockMode="full"
```

* Dock panel replaces main layout
* Occupies full height under top bar
* Used when Focus ON

---

### Architectural Principle

> Focus Mode is not a resized dock.
> It is a surface promotion of the dock panel.

Eliminates:

* Height fighting
* 50/50 splits
* Artificial max-height caps
* Dock centering bugs

---

# 6️⃣ AI UI Panels (Surface Components)

📍 `src/ai/panel/`

| File                        | Responsibility                         |
| --------------------------- | -------------------------------------- |
| `AiPanel.jsx`               | AI surface + tool runtime coordination |
| `PromptPanel.jsx`           | Prompt input UI                        |
| `SystemPanel.jsx`           | System (optional) field                |
| `ParametersPanel.jsx`       | Temperature + tokens                   |
| `TranscriptPanel.jsx`       | Transcript rendering                   |
| `PatchPreviewPanel.jsx`     | Diff preview                           |
| `ProviderControlsPanel.jsx` | Provider/model selection               |

---

# 7️⃣ System Field Flow

UI:

```
SystemPanel.jsx
```

Data flow:

```
SystemPanel
→ AiPanel
→ App.js
→ buildInputWithContext()
→ sent to provider as `system`
```

---

# 8️⃣ Consent Rendering

Consent buttons are created using:

```js
appendMessage("system", ..., { actions: [...] })
```

Rendered in:

```
TranscriptPanel.jsx
```

If consent UI breaks → inspect:

* AiPanel
* TranscriptPanel

---

# 9️⃣ Dev Tools (Development Only)

Hidden in production.

Enabled via:

```
Ctrl + Shift + T
```

Persisted:

```
localStorage: kforge:devToolsEnabled
```

Located in:

* `AiPanel.jsx`
* `TranscriptPanel.jsx`

---

# 🔟 Quick Navigation (“Where is X?”)

| Task                       | File                                  |
| -------------------------- | ------------------------------------- |
| Modify AI request payload  | `src/App.js`                          |
| Change tool detection      | `src/ai/panel/AiPanel.jsx`            |
| Add a new tool             | `src/ai/tools/handlers/index.js`      |
| Change filesystem behavior | `src/lib/fs.js`                       |
| Modify dock behavior       | `src/layout/DockShell.jsx`            |
| Modify chat rendering      | `src/App.js`                          |
| Modify transcript UI       | `TranscriptPanel.jsx`                 |
| Modify consent behavior    | `AiPanel.jsx` + `TranscriptPanel.jsx` |

---

# ⚠ Sensitive Runtime Files

Edit carefully:

* `src/App.js`
* `src/ai/panel/AiPanel.jsx`
* `src/lib/fs.js`
* `src/ai/tools/toolRuntime.js`
* `src/layout/DockShell.jsx`

These files coordinate multiple systems.

---

# 📦 Runtime Data (Not Committed)

```
.kforge/
```

---

# 🧭 Law for Future Changes

When adding:

* **New tool** → update handlers + toolRuntime + Project Map
* **New AI parameter** → update SystemPanel / ParametersPanel / App.js
* **New consent behavior** → update AiPanel + TranscriptPanel
* **New file interaction** → update fs.js
* **New layout mode** → update DockShell + Project Map

> Always update this map in the same commit as architectural changes.

---

# 🧠 Architectural Summary

KForge is built around:

* One canonical message store
* One AI execution authority (App.js)
* One surface promoted via DockShell
* One tool runtime pipeline
* Strict separation of UI projection vs runtime state

No duplicate message systems.
No duplicated bubble renderers.
No split dock logic.

---

