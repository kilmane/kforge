\# PROJECT\_SNAPSHOT — kforge



\## Overview



kforge is a desktop-first developer workspace with an AI assistant panel, multi-provider AI routing, and an editor-style UI shell.



The project is built with a clear separation of concerns:

\- Backend abstracts AI providers and credentials

\- Frontend handles UI, provider selection, gating, and user experience

\- Credentials are never handled directly in the main UI



Current status:

Backend Phase 3.2.4 is complete; we are now refining UI only.



---



\## Tech Stack



Frontend

\- React (JavaScript / JSX)

\- Tailwind CSS

\- Vite-style structure (CRA-like files still present)

\- pnpm package manager



Desktop

\- Tauri (Rust backend, secure OS-level storage)



Backend integration

\- OpenAI-compatible provider abstraction

\- Secure API key storage via Tauri invokes



---



\## Repository Structure (High Level)



Root

\- src/               React frontend

\- src-tauri/         Tauri backend

\- docs/              Documentation

\- scripts/           Dev / build scripts

\- public/            Static assets

\- package.json, pnpm-lock.yaml, tailwind.config.js



src/

\- ai/                AI client bridge and request types

\- commands/          Command palette commands

\- components/        Reusable UI components

\- layout/            Application shell and panes

\- lib/               Shared utilities (planned: settings store, provider registry)

\- App.js             App root

\- index.js           React entry point



---



\## UI Layout



Application shell lives in:

\- src/layout/AppLayout.js



Layout structure:

\- Left: Sidebar (56px)

\- Center: Editor area (tabs + editor)

\- Right: Assistant / AI chat pane (320px, collapsible)



Key UI components:

\- AssistantPane: src/layout/AssistantPane.js

\- Chat UI: src/components/Chat.jsx

\- Sidebar: src/layout/Sidebar.js

\- Command Palette: src/components/CommandPalette.jsx



Planned UI behaviors:

\- Assistant (AI chat) panel must be collapsible

\- Collapse is controlled by a shared UI state and command palette command

\- Collapsing must not destroy chat state



---



\## Command Palette



Commands are defined in:

\- src/commands/commands.js



Relevant commands:

\- toggle-chat (Ctrl/Cmd + J)

\- toggle-explorer (Ctrl/Cmd + B)



CommandPalette expects a context object containing:

\- toggleChat

\- toggleExplorer



The context is supplied by the app shell / root component.



---



\## Provider Strategy



\### Phase 3.1 — Cloud-Native Providers

\- OpenAI (native)

\- Gemini (native)

\- Claude (native)



\### Phase 3.2 — OpenAI-Compatible Providers

\- DeepSeek

\- Groq

\- OpenRouter

\- Custom Endpoint (RunPod / DataCrunch compatible)

\- Hugging Face (treated as OpenAI-compatible, same UI rules as Custom)



\### Phase 3.3 — Local Runtimes (upcoming)

\- Ollama (local and remote)

\- LM Studio

\- Mock (development/testing)



---



\## Provider UI Rules (Locked)



\- Provider dropdown always shows all providers

\- Providers are disabled until an API key exists, except:

&nbsp; - ollama

&nbsp; - mock

\- Custom Endpoint requires:

&nbsp; - API key

&nbsp; - endpoint URL

\- Hugging Face follows the same rule as Custom unless an endpoint is prefilled

\- API keys and endpoints live ONLY in the Settings modal

\- No credential inputs are allowed in the main panel

\- Selecting a disabled provider must route the user to Settings (“Configure in Settings”)

\- Assistant panel must be collapsible



---



\## Credential Storage



API keys

\- Stored securely via Tauri backend

\- Accessed through:

&nbsp; - aiSetApiKey(provider\_id)

&nbsp; - aiClearApiKey(provider\_id)

&nbsp; - aiHasApiKey(provider\_id)

\- Implemented in src/ai/client.js



Endpoints

\- Stored UI-side (localStorage) unless backend endpoint storage is added later

\- Managed exclusively through the Settings modal



---



\## Settings Modal (Locked Layout)



\- Single modal, mounted at app-shell level

\- Default tab: Providers



Providers tab

\- Providers grouped by:

&nbsp; - Cloud (Native)

&nbsp; - OpenAI-Compatible

&nbsp; - Local Runtimes

\- Each provider row shows status:

&nbsp; - Configured

&nbsp; - Missing API key

&nbsp; - Missing endpoint

&nbsp; - Not reachable (optional, local only)



Provider configuration panel:

\- Key-only providers: API key input (reveal + clear)

\- Custom / Hugging Face: API key + endpoint URL

\- Ollama:

&nbsp; - Local by default

&nbsp; - Optional remote toggle + endpoint

\- LM Studio:

&nbsp; - Endpoint URL (OpenAI-compatible local server)



---



\## Encoding Note



Some UI strings currently contain encoding artifacts (e.g. â€¦, garbled emoji).

All user-visible text must be valid UTF-8:

\- Use … instead of â€¦

\- Use proper emoji characters where intended



---



\## KForge Project Rule (Project Laws)



1\. Major milestones → start a new chat  

2\. Keep one objective per chat (focused, not rushed)  

3\. If stuck after 3–4 attempts:  

&nbsp;  STOP → REVERT / ROLLBACK → COMMIT last known-good → NEW CHAT + CONTEXT SUMMARY  

4\. Prefer safe, small, surgical changes (avoid big rewrites unless explicitly agreed)  

5\. Learning-first:

&nbsp;  - Assume I’m learning (not a pro dev)

&nbsp;  - Explain terms and “why” by default, in simple language

&nbsp;  - Define new tools or technologies the first time they appear (e.g. Vite, Tauri, Docker, Node, React)

6\. Copy–paste safety:

&nbsp;  - When modifying a file, provide the FULL file contents to paste

&nbsp;  - Ask to see the current file before modifying it

&nbsp;  - Avoid partial snippets for core or config files unless diffs are explicitly requested

7\. Captain controls risk:

&nbsp;  - If changes get risky or confusing, pause and propose a safe checkpoint or commit

8\. Markdown files rule:

&nbsp;  8.1 All .md files (README.md, PROJECT\_SNAPSHOT.md, and any future markdown files) must be provided in Notepad-friendly Markdown  

&nbsp;  8.2 No triple backticks are allowed inside the markdown file content itself  

&nbsp;  8.3 Content must be ready to paste directly into a .md file without modification  

&nbsp;  8.4 Content needs to be wrapped correctly so that the user gets the Copy code button on the right



---



\## Usage of This Snapshot



This file is the canonical project context.



At the start of a new chat, paste this file and say:

Context: see PROJECT\_SNAPSHOT.md below



Update this file whenever:

\- Architecture decisions change

\- Provider strategy changes

\- UI rules are locked or modified



This snapshot complements git history by capturing intent, rules, and structure.



