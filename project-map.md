# **Project Map (v0)**

*Baseline topology & file-finding playbook*

---

## **Purpose**

This document is a **living map of the current implemented structure** of the KForge repository.

It exists to answer, quickly and reliably:

* *Where is the thing I need to change?*
* *Where is this behavior wired?*
* *Where do I safely intervene without breaking the app?*

This is **snapshot-only** documentation.
No future plans. No speculation. No design intent.

---

## **Scope & Versioning Rule**

* This document reflects **current reality only**
* When **entry points or responsibilities move**, update this file **in the same commit**
* This is **v0** (baseline before major UX evolution)

---

## **Quick Index — “Where is X?”**

| Question / Task        | Primary File(s)                                            | Notes                             |
| ---------------------- | ---------------------------------------------------------- | --------------------------------- |
| React entry point      | `src/index.js`                                             | App bootstraps here               |
| Main app layout wiring | `src/App.js`                                               | Current source of truth           |
| Layout primitives      | `src/layout/*`                                             | Present, but wired via `App.js`   |
| Sidebar / tabs         | `src/layout/Sidebar.js`, `src/layout/TabsBar.js`           | Layout building blocks            |
| Explorer tree          | `src/components/Explorer.jsx`                              | Folder/file tree UI               |
| Editor UI              | `src/components/Editor.jsx`, `src/components/EditorPane.*` | Editing surface                   |
| Tabs UI                | `src/components/Tabs.jsx`                                  | Tabs behavior                     |
| Command palette        | `src/components/CommandPalette.*`                          | Command UI                        |
| Commands registry      | `src/commands/commands.js`                                 | Command definitions               |
| AI panel root          | `src/ai/panel/AiPanel.jsx`                                 | AI UI mount                       |
| AI panel sub-panels    | `src/ai/panel/*`                                           | Prompt / Output / System / Params |
| AI client (JS)         | `src/ai/client.js`                                         | Frontend glue                     |
| Local model presets    | `src/ai/modelPresets.js`                                   | Built-in presets                  |
| Remote presets         | `src/ai/remotePresets.js`                                  | Fetch / cache / merge             |
| AI tools runtime       | `src/ai/tools/toolRuntime.js`                              | Tool execution                    |
| Tool handlers          | `src/ai/tools/handlers/*`                                  | Tool implementations              |
| Project Memory UI      | `src/components/project-memory-panel.jsx`                  | Memory panel                      |
| Project Memory logic   | `src/brains/project-memory.*`                              | Persistence logic                 |
| Tauri FS adapter       | `src/brains/tauri-fs-adapter.*`                            | JS ↔ Tauri bridge                 |
| File I/O helpers       | `src/lib/fs.js`                                            | Open / save / paths               |
| Tauri entry            | `src-tauri/src/main.rs`                                    | Rust entry point                  |
| Tauri wiring & menus   | `src-tauri/src/lib.rs`                                     | Central Rust wiring               |
| Rust AI commands       | `src-tauri/src/ai/commands.*`                              | Command layer                     |
| Rust AI providers      | `src-tauri/src/ai/providers/*`                             | Provider impls                    |
| Tauri permissions      | `src-tauri/capabilities/default.json`                      | FS / opener permissions           |

---

## **High-Level Folder Map**

### **Root**

* `project-map.md` — this document
* `README.md`, `PROJECT-SNAPSHOT.md`, `PORTABILITY*.md` — project notes
* `.kforge/` — runtime data (do **not** commit)
* `docs/` — reference documentation
* `scripts/` — backup / restore helpers
* `public/` — static assets
* `src/` — React UI + frontend logic
* `src-tauri/` — Rust backend + Tauri config

---

### **`src/` — Frontend**

* `App.js` — main UI wiring
* `components/` — Explorer, Editor, Tabs, Settings, Memory panel
* `layout/` — layout primitives (sidebar, panes, tabs bar)
* `ai/` — AI client, panels, presets, tools
* `brains/` — continuity logic (Project Memory, adapters)
* `lib/` — utilities (filesystem helpers)

---

### **`src-tauri/` — Backend**

* `src/main.rs` — entry point
* `src/lib.rs` — commands, setup, menus, shell opener
* `src/ai/` — AI commands, types, providers
* `capabilities/` — permissions model
* `tauri.conf.json` — app configuration

---

## **Core Flows (v0)**

### **App Boot**

`src/index.js` → mounts `src/App.js`

---

### **Explorer → Edit → Save**

* UI: `Explorer.jsx`, `Editor.jsx`
* Helpers: `src/lib/fs.js`
* Adapter (if Tauri FS): `tauri-fs-adapter.*`
* Permissions: `src-tauri/capabilities/default.json`

---

### **Commands & Command Palette**

* Registry: `src/commands/commands.js`
* UI: `CommandPalette.*`

---

### **AI Send Flow (Frontend)**

* Root: `AiPanel.jsx`
* Panels: `src/ai/panel/*`
* Client: `src/ai/client.js`
* Presets: `modelPresets.js`, `remotePresets.js`
* Tools: `toolRuntime.js`, `handlers/*`

---

### **Project Memory**

* UI: `project-memory-panel.jsx`
* Logic: `project-memory.*`
* Runtime data: `.kforge/project-memory.json` (ignored)

---

### **Tauri Backend**

* Entry: `main.rs`
* Wiring: `lib.rs`
* AI commands/providers: `src/ai/*`
* Permissions: `capabilities/default.json`

---

## **File-Finding Playbook (PowerShell)**

> Use these **before browsing folders manually**.

---

### **Find where a component is mounted**

```powershell
Select-String -Path "src\App.js" `
  -Pattern "Explorer|Editor|AiPanel|CommandPalette|project-memory" -List
```

---

### **Find where a component is defined**

```powershell
Select-String -Path "src\**\*.js","src\**\*.jsx" `
  -Pattern "function Explorer|const Explorer|export default function Explorer" -List
```

---

### **Trace a command from UI to implementation**

```powershell
Select-String -Path "src\commands\commands.js","src\components\**\*.jsx" `
  -Pattern "CommandPalette|commands\." -List
```

---

### **Find AI preset usage**

```powershell
Select-String -Path "src\ai\**\*.js","src\ai\**\*.jsx" `
  -Pattern "modelPresets|remotePresets|presets" -List
```

---

### **Find Tauri command boundaries**

```powershell
Select-String -Path "src-tauri\src\**\*.rs" `
  -Pattern "command|invoke_handler|tauri::command" -List

Select-String -Path "src\**\*.js","src\**\*.jsx" `
  -Pattern "invoke\(" -List
```

---

### **Find permissions / capability issues**

```powershell
Get-ChildItem -Path "src-tauri\capabilities" -File

Select-String -Path "src-tauri\capabilities\**\*.json" `
  -Pattern "fs:allow|opener:|dialog:" -List
```

---

### **Find external link opening (frontend + Rust)**

```powershell
Select-String -Path "src\**\*.js","src\**\*.jsx" `
  -Pattern "http|https|open\(" -List

Select-String -Path "src-tauri\src\**\*.rs" `
  -Pattern "shell|open\(" -List
```

---

## **Project Law Notes (Map Edition)**

* This map documents **current implemented structure only**
* Update `project-map.md` when **entry points move**
* Prefer **search-first** over conceptual hunting
* Keep documentation filenames lowercase
* Do not commit runtime data (`.kforge/`)

---

## **End of Document**

