# 🧱 Architecture Backlog

This file is the “parking bay” for anything we decide to do later.  
Rule: if we say “later”, we write it here immediately with enough context to execute.

---

## Template (copy this)

### Title
Status: Shelved | Planned | In progress | Completed
Added: YYYY-MM-DD

**Why**
- …

**Where**
- File: …
- Function(s): …
- Notes: …

**Plan**
1) …
2) …
3) …

**Risks / gotchas**
- …

**Done when**
- …

---

### Project root authority lives in App.js
Status: **Completed**
Added: 2026-02-12

**Why**
- Avoid partial project state (root set in one place, UI elsewhere).
- Prevent “stuck state” after failures.
- Make behavior deterministic: create/open → allow scope → set root → load memory → read tree → then commit UI state.

**Where**
- `src/lib/fs.js`
  - `openProjectFolder()` returns only the chosen folder (no root side-effects)
  - `createNewProject()` creates folder only (no root side-effects)
  - `readFolderTree()` reads within the currently set root (no auto-switching)
  - `setProjectRoot()`, `loadProjectMemoryForCurrentRoot()` remain explicit
- `src/App.js`
  - `handleOpenFolder()`
  - `handleNewProject()`

**Plan**
1) Make fs.js functions return values only (no root switching inside create/open).
2) App.js sets root + loads memory + reads tree, then commits UI state.
3) Keep failure handling “non-destructive” (don’t destroy the previous project state on error).

**Risks / gotchas**
- If App.js forgets to call `setProjectRoot(folder)` before `readFolderTree(folder)`, `resolvePathWithinProject()` will throw “forbidden path”.
- Allow-scope is best-effort; tree read must handle forbidden paths and show a friendly message.

**Done when**
- New Project and Open Folder work without “forbidden path”.
- Errors do not leave the app in a broken state (no restart required).

---

### Manual Explorer refresh
Status: **Completed**
Added: 2026-02-12

**Why**
- New projects can be empty → tree shows empty (correct) but feels broken.
- Files added externally won’t appear without refresh (no file watcher yet).
- Users need a recovery action that doesn’t require restarting the app.

**Where**
- `src/App.js`
  - `handleRefreshTree()`
  - Top bar “Refresh” button next to New Project / Open Folder

**Plan**
1) Add Refresh action to re-read folder tree for current project root.
2) Keep it safe: if refresh fails, show message; do not break state.

**Risks / gotchas**
- Without watchers, users must click refresh to see external file changes.
- Later watchers may reduce reliance on this button (but keeping it is still fine).

**Done when**
- Creating a file in the project folder + clicking Refresh shows it in Explorer.

---

### Transactional project open/create flows
Status: Planned
Added: 2026-02-12

**Why**
- Even with App.js authority, we want a consistent “transaction pattern” everywhere:
  do work → verify → commit UI state.
- Prevent any future partial state updates.

**Where**
- `src/App.js`
  - `handleOpenFolder()`
  - `handleNewProject()`
  - any future “clone repo”, “import project”, etc.

**Plan**
1) Standardize a helper pattern inside App.js:
   - allow scope (best-effort)
   - set root
   - load memory
   - read tree
   - commit state
2) Ensure all new “project entry points” use the same pattern.

**Risks / gotchas**
- Devs might copy/paste and forget one step (root/memory/tree order matters).

**Done when**
- All project-opening flows follow the same safe pattern.

---

### Non-blocking error surface
Status: Planned
Added: 2026-02-12

**Why**
- Errors currently go into `aiTestOutput`, which is not an obvious UX location.
- Vibe coders need clear “what happened” + “what can I do now” messages.

**Where**
- `src/App.js` (or wherever global UI state lives)
- Possibly a new `src/components/Toast.jsx` or `ErrorBanner.jsx`

**Plan**
1) Add a small banner/toast system for app-level errors.
2) Show actionable messaging (Retry / Dismiss / Refresh).
3) Keep `aiTestOutput` for AI/provider diagnostics only.

**Risks / gotchas**
- Too many banners becomes noisy; keep it calm and dismissible.

**Done when**
- Folder open/create failures are surfaced clearly without breaking the UI.

---

### Starter templates strategy
Status: Deferred
Added: 2026-02-12

**Why**
- Starter files can help empty projects feel alive, but may not match user intent.
- If implemented, should be optional and template-based.

**Where**
- `src/lib/fs.js` (file creation helpers)
- `src/App.js` (flow + UI checkbox “Add starter files”)
- Future: template definitions folder (e.g. `src/templates/`)

**Plan**
1) If we add it, do it after project is officially opened and allowed in scope.
2) Offer a simple checkbox (“Add starter files”) default ON or OFF based on testing.

**Risks / gotchas**
- Writing files before allow-scope can trigger “forbidden path” issues again.
- Templates might confuse users if they don’t match their project type.

**Done when**
- Optional templates exist and are created safely only after project is opened.

---

### AI panel runtime separation
Status: Shelved
Added: 2026-02-12

**Why**
- `AiPanel.jsx` mixes UI + runtime orchestration.
- Separation would reduce accidental re-runs and make changes safer.

**Where**
- `src/ai/panel/AiPanel.jsx`
- `src/ai/tools/toolRuntime.js`

**Plan**
1) Extract tool detection + orchestration into a dedicated module/service.
2) Keep `AiPanel` as a UI surface.

**Risks / gotchas**
- Bigger refactor; only do when feature churn stabilizes.

**Done when**
- UI changes in AiPanel cannot accidentally retrigger tool execution logic.