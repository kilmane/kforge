# PROJECT_SNAPSHOT — kforge

## Overview

kforge is a desktop-first developer workspace with an AI assistant panel, multi-provider AI routing, and an editor-style UI shell.

The project is built with a clear separation of concerns:

- Backend abstracts AI providers, networking, and credentials
- Frontend handles UI, provider selection, gating, and user experience
- Credentials are never handled directly in the main AI panel

Current status:

Backend Phase 3.2.4 is complete and compiling; UI for providers and settings is now locked.

---

## Tech Stack

Frontend
- React (JavaScript / JSX)
- Tailwind CSS
- CRA-based structure (react-scripts)
- pnpm package manager

Desktop
- Tauri (Rust backend, secure OS-level storage)

Backend integration
- OpenAI-compatible provider abstraction
- Secure API key storage via Tauri invokes

---

## Repository Structure (High Level)

Root
- src/                 React frontend
- src-tauri/           Tauri backend (Rust)
- docs/                Documentation
- scripts/             Backup / restore helpers
- public/              Static assets
- package.json, pnpm-lock.yaml, tailwind.config.js

src/
- ai/                  AI client bridge and request types
- commands/            Command palette commands
- components/          Reusable UI components
- components/settings/ Settings modal (providers, keys, endpoints)
- layout/              Application shell and panes (legacy / experimental)
- lib/                 Shared utilities
- App.js               App root (current UI authority)
- index.js             React entry point

---

## UI Layout (Current Authority)

The active UI is owned by:

- src/App.js

Layout structure:
- Top: Toolbar (open folder, save, status)
- Left: Explorer (file tree)
- Center: Editor (tabs + editor pane)
- Right: AI panel (collapsible)

Notes:
- layout/AppLayout.js exists but is not the active shell
- All provider logic and AI panel UI live in App.js for now

---

## Command Palette

Commands are defined in:
- src/commands/commands.js

Relevant commands:
- toggle-chat (Ctrl/Cmd + J)
- toggle-explorer (Ctrl/Cmd + B)

CommandPalette expects a context object containing:
- toggleChat
- toggleExplorer

The context is supplied by App.js.

---

## Provider Strategy

### Phase 3.1 — Cloud-Native Providers
- OpenAI (native)
- Gemini (native)
- Claude (native)

### Phase 3.2 — OpenAI-Compatible Providers
- DeepSeek
- Groq
- OpenRouter
- Hugging Face (treated as OpenAI-compatible)
- Custom Endpoint (RunPod / DataCrunch / generic OpenAI-compatible)

### Phase 3.3 — Local Runtimes (UI prep)
- Ollama (local & remote)
- LM Studio (UI only, runtime not wired yet)
- Mock (development/testing)

---

## Provider UI Rules (LOCKED)

- Provider dropdown always shows all providers
- Providers are disabled until an API key exists, except:
  - ollama
  - lmstudio
  - mock
- Custom Endpoint and Hugging Face require:
  - API key
  - endpoint URL
- Hugging Face follows the same rules as Custom unless an endpoint is prefilled
- Disabled providers cannot be used to send requests
- Selecting a disabled provider routes the user to Settings
- No credential inputs are allowed in the main AI panel

---

## Settings Modal (Single Source of Truth)

Location:
- src/components/settings/SettingsModal.jsx
- Mounted at App.js level

Responsibilities:
- API key management
- Endpoint configuration
- Provider status display
- Grouping providers by category

Provider grouping:
- Cloud (Native)
- OpenAI-Compatible
- Local Runtimes

Provider configuration rules:
- Key-only providers: API key input (save / clear)
- Custom + Hugging Face: API key + endpoint URL
- Ollama:
  - Local by default
  - Optional remote endpoint override
- LM Studio:
  - Endpoint field only
  - Marked clearly as “UI prep only”

API keys:
- Stored securely via Tauri backend
- Accessed through:
  - aiSetApiKey(provider_id)
  - aiClearApiKey(provider_id)
  - aiHasApiKey(provider_id)

Endpoints:
- Stored UI-side (localStorage)
- Managed exclusively through the Settings modal

---

## AI Panel Behavior

- AI panel is collapsible
- Toggle methods:
  - Toolbar button
  - Keyboard shortcut: Ctrl/Cmd + J
- When collapsed:
  - Right panel is hidden
- When expanded:
  - Provider dropdown
  - Model input
  - Prompt + system fields
  - Parameters
  - Output
- AI panel never shows:
  - API keys
  - Endpoint inputs

Helper text:
- Under provider dropdown:
  - “If a provider is disabled, open Settings to add its API key (and endpoint where required).”
- Disabled providers show:
  - Inline notice indicating missing configuration

---

## Development Commands (Current State)

Desktop development (Tauri + CRA):
- pnpm dev

Web-only development (browser):
- pnpm dev:web

Production build (bundled desktop app):
- pnpm build

Notes:
- pnpm dev runs tauri dev, and Tauri launches the CRA dev server via beforeDevCommand
- pnpm build runs tauri build, and Tauri runs the CRA production build via beforeBuildCommand
- If port 3000 is busy, CRA may fail to start; stop the other process first
- Tauri bundle identifier has been updated to avoid ending with .app (macOS bundle extension conflict)

---

## Encoding Note

Some UI strings previously contained encoding artifacts (e.g. â€¦).

Rule:
- All user-visible text must be valid UTF-8
- Use … instead of â€¦
- Use proper emoji characters where intended

---

## KForge Project Rule (Project Laws)

1. Major milestones → start a new chat
2. Keep one objective per chat (focused, not rushed)
3. If stuck after 3–4 attempts:
   STOP → REVERT / ROLLBACK → COMMIT last known-good → NEW CHAT + CONTEXT SUMMARY
4. Prefer safe, small, surgical changes (avoid big rewrites unless explicitly agreed)
5. Learning-first:
   - Assume I’m learning (not a pro dev)
   - Explain terms and “why” by default, in simple language
   - Define new tools or technologies the first time they appear (e.g. Vite, Tauri, Docker, Node, React)
6. Copy–paste safety:
   - When modifying a file, provide the FULL file contents to paste
   - Ask to see the current file before modifying it
   - Avoid partial snippets for core or config files unless diffs are explicitly requested
7. Captain controls risk:
   - If changes get risky or confusing, pause and propose a safe checkpoint or commit
8. Markdown files rule:
   8.1 All .md files (README.md, PROJECT_SNAPSHOT.md, and future markdown files) must be Notepad-friendly
   8.2 No triple backticks are allowed inside markdown file content itself
   8.3 Content must be ready to paste directly into a .md file
   8.4 Content needs to be wrapped correctly so the user gets the Copy code button

---

## Usage of This Snapshot

This file is the canonical project context.

At the start of a new chat, paste this file and say:

Context: see PROJECT_SNAPSHOT.md below

Update this file whenever:
- Architecture decisions change
- Provider strategy changes
- UI rules are locked or modified
- Development workflow is finalized

This snapshot complements git history by capturing intent, rules, and structure.
