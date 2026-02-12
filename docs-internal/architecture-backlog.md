# 🧱 Architecture Backlog

This file is the “parking bay” for anything we decide to do later.
Rule: if we say “later”, we write it here immediately with enough context to execute.

---

## Template (copy this)

### Title
Status: Shelved | Planned | In progress
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

------------------------------
### Project root authority lives in App.js

Status: In progress
Added: 2026-02-12

**Why**
- Avoid partial project state (root set in one place, UI elsewhere).
- Prevent “stuck state” after failures.

**Where**
- src/lib/fs.js: openProjectFolder, createNewProject, readFolderTree
- src/App.js: handleOpenFolder, handleNewProject

**Plan**
1) Make fs.js functions return values only (no root switching inside create/open).
2) App.js sets root + loads memory + reads tree, then commits UI state.
3) Make reads/writes always happen under the officially set root.

**Done when**
- New Project and Open Folder work without “forbidden path”.
- Errors do not leave the app in a broken state.
-------------------------------------


>>> not sure about these which I had before this update> ask GOT and see if we can use the template for them

## 🔁 Project Root Authority Refactor

Status: Shelved (post Phase 4)

Goal:
Make fs.js a pure utility layer.
App.js becomes the single authority for project state.

Why:
Avoid partial root state.
Avoid recovery lock issues.
Increase determinism.

---

## 🛡 Transactional Project State

Status: Planned

Goal:
Wrap project open/create flows in a transaction pattern:
- perform FS ops
- read tree
- then commit UI state

Never partially switch root.

---

## 🚨 Non-Blocking Error Surface

Status: Planned

Goal:
Replace AI test output error dumping with:
- Banner system
- Dismissible errors
- Clear recovery messaging

---

## 📁 Starter Templates Strategy

Status: Deferred

Goal:
Optional scaffolding system
Different templates per app type
Executed after folder is officially opened

---

## 🧠 AI Panel Runtime Separation

Status: Future Major Refactor

Goal:
Separate UI surface from tool runtime engine
AiPanel becomes UI-only
Tool runtime becomes isolated service

---
