# KForge

**KForge** is a **local-first desktop AI IDE** focused on:
- explicit filesystem control
- predictable behavior
- a stable foundation for future AI features

Phase 2 establishes the **editor and filesystem core** on which all future phases will build.

---

## 🧭 Project Philosophy

- **Local-first** — your files stay on your machine
- **Explicit permissions** — no silent access, no hidden magic
- **Incremental phases** — each phase locks stability before moving forward
- **Documentation-first** — code is not complete without docs

---

## 🧱 Tech Stack

- **Tauri v2**
- **React (CRA, JavaScript)**
- **Tailwind CSS**
- **Monaco Editor**
- **Rust backend**
- **pnpm**

---

## 📁 Project Location

D:\kforge

---

## ▶️ How to Run (Development)

### Prerequisites

- Node.js (LTS recommended)
- pnpm
- Rust toolchain
- Tauri v2 system prerequisites

### Install dependencies

pnpm install

### Run the app

pnpm dlx @tauri-apps/cli dev

The desktop application will launch using **Tauri v2**.

---

## ✅ Phase 2 — What Was Achieved

Phase 2 focused entirely on the **local filesystem and editor foundation**.

### Filesystem

- Secure filesystem access via **Tauri v2 runtime scopes**
- Explicit fs_allow_directory configuration
- No global or unsafe permissions
- First-open edge case fixed correctly (no hacks)

### Explorer

- Folder tree view
- Click-to-open files
- Correct path resolution
- Stable behavior

### Editor

- Monaco Editor integration
- Tabbed file interface
- Dirty state tracking
- Save persistence confirmed
- Files open correctly on first click

### Stability

- No build warnings
- No runtime hacks
- No temporary fixes
- Git repository clean and stable

Phase 2 is complete and locked.

---

## 🏷️ Git Tag

The current commit is tagged as:

phase-2-complete

---

## 🚫 Out of Scope for Phase 2

- AI integration
- Chat panel
- MCPs
- Cloud or local model execution

---

## 🔒 Project Law

This project follows **Project Law (Portable v2)**.

- No breaking changes inside a locked phase
- No refactors during documentation steps
- Stability over speed

---

## 📌 Next Phase (Context Only)

Phase 3 — AI Integration

- Cloud AIs
- Local AIs (Ollama)
- Chat panel
- MCP integrations (GitHub, Supabase, Vercel, Netlify, etc.)

Phase 3 will begin in a new chat.

---

Phase 2 status: COMPLETE ✅