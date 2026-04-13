
# 🧭 KForge — PROJECT SNAPSHOT (Internal Canonical State)

Location:
D:\kforge\docs-internal\PROJECT-SNAPSHOT.md

Last Updated: **April 13th, 2026**

Phase: **6.4 — Agent workflows + UI hardening follow-up**
Status: **active hardening / polish checkpoint — workflow architecture stable, transcript layout fixed, Help menu relocated into the AI header, documentation catch-up in progress**

Stable restore tags now available:

* `phase-4.10-agent-loop-stable`
* `phase-4.10.1-agent-hardening-stable`
* `phase-5.2-awareness-stable`
* `phase-5.2-supabase-dev-assist-midtest`
* `phase-5.2-supabase-dev-assist-polish`
* `routing-hardening-2026-04-03`
* `phase-5.3-openai-adapter-foundation`
* `phase-5.4-expo-preview-flow-checkpoint`
* `phase-6.3-task-templates-stable`
* `phase-6.4-transcript-clear-restored`

---

This file is the authoritative operational reference.

If anything conflicts with:

• chat memory  
• assumptions  
• scattered notes  

This file wins.

Not user-facing.

---

# 🟠 1️⃣ Project Overview

KForge is a desktop-first developer workspace built around:

• a GPT-clean AI surface  
• secure filesystem access  
• explicit, consent-gated tooling  
• calm, attention-disciplined UI  
• workflow-aware assistant routing  
• truthful service / preview / terminal handoff  

KForge is **chat-first**, not tool-first.

KForge is also **workflow-aware**, not merely file-edit aware.

That means the product now has two equally important truths:

• ordinary in-project implementation should still feel direct and code-first  
• when a real KForge workflow already exists, the assistant should know about it and guide users there truthfully

---

# 🟣 2️⃣ Current Architectural Reality

## 🧠 Execution Authority

AI execution still lives primarily in:

`src/App.js`

This file owns:

• canonical message state  
• AI request building  
• context injection  
• patch instruction injection  
• retry logic  
• project lifecycle control  
• workspace root management  
• TranscriptBubble definition  
• workspace busy state  
• activity animation tick  
• top toolbar rendering  
• overall React layout composition  
• AI panel docking / focus promotion inputs  

If AI behaves incorrectly → start here.

If project-root state behaves incorrectly → start here.

If top-level layout behaves incorrectly → start here.

---

# 💬 Single Message Store (Critical Rule)

There is exactly one message array:

`messages` (owned by `App.js`)

Everything renders from this.

Structure:

`id, role, content, ts, optional action metadata`

No duplicate message systems exist.

This remains one of the most important architecture rules in KForge.

---

# 🧩 Rendering Surfaces

Two projections of the same message store.

## Chat View (GPT-clean)

File:

`src/ai/panel/AiPanel.jsx`

Shows:

• assistant messages  
• AI messages  
• relevant tool messages  
• consent prompts  
• animated pending assistant text  

Important rule:

Chat view is a **filtered projection**.

It intentionally hides some system noise.

---

## Transcript View

File:

`src/ai/panel/TranscriptPanel.jsx`

Full system log.

Contains:

• user / assistant / system / tool messages  
• Retry control  
• Clear control  
• consent actions  

Architectural rule:

Chat = filtered projection  
Transcript = complete system log

---

## Transcript Layout Lesson (now important canonical knowledge)

Recent real debugging proved:

A missing control can be **fully rendered but still visually disappear** if the wrong surface owns height / scroll / sticky behavior.

The “missing Clear button” investigation taught:

• the problem was not missing logic  
• the problem was not missing prop wiring  
• the problem was not button text or button size  
• the real culprit was transcript layout ownership between `AiPanel.jsx` and `TranscriptPanel.jsx`

Current lesson to remember:

When transcript controls vanish or transcript content leaks under / above the header:

1. verify the control is still rendered  
2. verify the prop is still being passed  
3. inspect parent flex height and overflow ownership  
4. inspect whether Transcript mode and Chat mode are using different scroll surfaces  
5. only then touch header layout

This is now a durable debugging lesson.

---

# 🪟 2a Window / Shell Area Reality

This section exists because recent Help-menu work proved we were losing time by not naming shell areas clearly.

---

## Native OS Window Chrome / Title Bar

Visual area:

• the very top strip where the **KForge** title text appears  
• the same area as the native minimize / maximize / close buttons  

Current ownership:

• **not rendered by React**
• **not owned by `src/App.js`**
• owned by native window chrome through Tauri + the operating system

Primary config source:

`src-tauri/tauri.conf.json`

Important reality:

The visible topmost **KForge** title text is not currently coming from a React component.

It comes from Tauri window configuration and is then rendered by native OS window chrome.

---

## Native Tauri Menu Bar

Visual area:

• the white strip below the native title bar  
• the strip that contains the native **Help** menu  

Current ownership:

• **not a React toolbar**
• native Tauri menu surface

Primary file:

`src-tauri/src/lib.rs`

Responsibilities:

• native menu creation  
• Help submenu creation  
• documentation link routing  
• native menu event handling  

Important reality:

This is distinct from both:

• native OS window chrome  
and  
• the React top toolbar in `src/App.js`

---

## React App Top Toolbar

Visual area:

• the main in-app toolbar below native shell surfaces  

Current file:

`src/App.js`

Responsibilities include:

• Focus  
• New Project  
• Open Folder  
• Reset Workspace  
• Refresh  
• Close Folder  
• Save  
• Memory  
• Settings  
• Hide AI  
• folder path display  
• workspace busy badge  

Important reality:

This is the live React-controlled top toolbar.

It is not the native title bar.
It is not the native Help menu bar.

---

## AI Header Area

Visual area:

• top strip inside the AI panel  
• provider/model selector  
• transcript toggle  
• Help dropdown home  
• other compact AI header controls  

Primary file:

`src/ai/panel/AiPanel.jsx`

Important recent conclusion:

The best live React-owned home for a styled Help dropdown is the AI panel header area, beside the provider/model control.

This is where the Help UI now belongs in the live app shell.

---

## Legacy / Non-Authority UI Files

The following files may still exist, but they are **not the current live shell authority**:

• `src/layout/TabsBar.js`  
• `src/layout/AppLayout.js`  
• `src/layout/AssistantPane.js`  
• `src/layout/EditorPane.js`  
• `src/components/Chat.jsx`  

These can still hold useful history or stubs, but future maintainers should not assume they own the live shell.

Current live shell authority remains:

`src/App.js`

This lesson matters because recent Help-menu searching lost time by looking in surfaces that are no longer live authorities.

---

# 🟢 3️⃣ Layout & Dock Architecture

## DockShell

File:

`src/layout/DockShell.jsx`

Supports two layout modes.

### Bottom Mode (default)

`dockMode = "bottom"`

Dock sits under main workspace.

---

### Focus Mode

`dockMode = "full"`

Dock replaces main layout.

Focus mode is a **surface promotion**, not a resized dock.

---

## Current live composition

The active shell composition is now best thought of as:

`App.js`
→ top toolbar  
→ explorer / editor workspace  
→ `DockShell.jsx`  
→ `AiPanel.jsx`  

That mental model is more accurate than older “classic layout” language.

---

# 🔵 4️⃣ Tool Runtime Pipeline

## Tool Detection

File:

`src/ai/panel/AiPanel.jsx`

Handles:

• tool payload parsing  
• JSON/XML tool formats  
• natural-language fallback parsing for weaker models  
• deduplication  
• consent gating  
• execution dispatch  
• agent continuation handoff  

---

## Tool Runtime Wrapper

File:

`src/ai/tools/toolRuntime.js`

Responsibilities:

• consent enforcement  
• lifecycle messages  
• transcript logging  
• error formatting  

Runtime flow:

detect tool  
→ consent request  
→ handler execution  
→ append result  

---

## Tool Schemas

File:

`src/ai/tools/toolSchema.js`

Responsibilities:

• exposes model-facing tool descriptions  
• defines available tool names and parameters  
• keeps model-visible tool inventory aligned with real handlers  

Current model-visible tools:

• read_file  
• list_dir  
• search_in_file  
• write_file  
• mkdir  

---

## Tool Handlers

File:

`src/ai/tools/handlers/index.js`

Tools currently available:

• read_file  
• list_dir  
• write_file  
• search_in_file  
• mkdir  

Filesystem authority:

`src/lib/fs.js`

App.js sets project root.  
fs.js enforces safety.

---

## Agent Loop

Files:

`src/ai/agent/agentRunner.js`  
`src/ai/panel/AiPanel.jsx`

Phase 4.10 introduced a real **tool-calling agent loop**.

Core flow:

model  
→ tool request  
→ consent/runtime execution  
→ tool result fed back to model  
→ continued reasoning  
→ final answer  

This loop sits **above** the existing tool runtime and does **not bypass** it.

Important rule:

All tool execution still flows through:

`src/ai/tools/toolRuntime.js`

This preserves explicit consent behavior and transcript visibility.

---

## Agent Loop Hardening

Phase 4.10.1 added hardening for weaker and more inconsistent models.

Improvements include:

• duplicate tool-call detection  
• prevention of repeated identical tool executions  
• support for natural-language tool-call recovery such as `list_dir(.)`  
• bounded inspection guidance for workspace-analysis tasks  
• write tools no longer treated as safe automatic actions  
• local tool-result injection so the continuation model sees fresh results immediately  
• calmer transcript behavior during duplicate suppression  

Read-only tools that may auto-run:

• read_file  
• list_dir  
• search_in_file  

Write tools now require consent:

• write_file  
• mkdir  

This change remains critical because weaker models can otherwise attempt unwanted file creation during inspection flows.

---

# 🟤 4b Preview Runtime

Backend:

`src-tauri/src/preview.rs`

Frontend bridge:

`src/runtime/previewRunner.js`

UI surface:

`src/runtime/PreviewPanel.jsx`

Preview runner provides:

• dependency installation  
• development server startup  
• static site preview  
• log streaming  
• URL detection  
• controlled process stop  
• preview log persistence  
• project-type detection  
• registry-aware template identification  
• Expo-specific external preview guidance  

---

## Preview Detection Model

Detection now works in two stages.

### Stage 1 — coarse project kind

Backend command:

`preview_detect_kind`

Current kinds include:

• static  
• package  

### Stage 2 — registry-aware template identification

Frontend logic:

`src/runtime/previewRunner.js`

Uses:

• templateRegistry hints  
• package.json dependency inspection  
• compatible template lookup  

Current recognized template identities include:

• Static HTML  
• Vite + React  
• Next.js  
• Expo React Native  

Important implementation note:

Next.js detection is explicitly prioritized ahead of generic React/Vite matching so that Next.js is not misidentified as Vite + React.

Expo detection is based on package dependency signals and template hints rather than on a browser URL.

---

## Expo Preview Reality

Expo / React Native preview is now treated as a **truthful external mobile-preview workflow**, not a normal in-KForge web preview.

Important product rules now proven:

• KForge does **not** render mobile preview inside the app  
• Expo's localhost dev endpoint must **not** be presented as a beginner-facing app preview URL  
• Preview for Expo shows a guidance surface instead of pretending there is a browser preview inside KForge  
• Open button remains disabled for Expo projects  

Current PreviewPanel behavior for Expo:

• detects Expo React Native project identity  
• suppresses preview URL promotion from Expo logs  
• shows compact external-preview instructions  
• supports expandable / dismissible guidance  
• points users to a **system terminal outside KForge**  
• includes `pnpm dev`  
• includes tunnel fallback `pnpm dev -- --tunnel`  
• includes optional browser-preview note for `pnpm run web` with extra dependency hint  
• includes Android / iOS notes with setup caveats  

Important truth discovered in real testing:

KForge Terminal can now run long-lived Expo commands, but it still does **not** surface a beginner-usable QR-code rendering path.

For phone preview, the recommended path remains:

system terminal outside KForge  
→ run Expo command  
→ scan QR in Expo Go

This exception must continue to live in both product behavior and AI-awareness rules.

---

# 🧱 4c Scaffold System

Backend:

`src-tauri/src/scaffold.rs`

Frontend trigger:

`src/runtime/PreviewPanel.jsx`

Registry:

`src/runtime/templateRegistry.js`

Registered scaffold commands:

`scaffold_static_html`  
`scaffold_vite_react`  
`scaffold_nextjs`  
`scaffold_expo_react_native`  

Templates supported:

• Static HTML  
• Vite + React  
• Next.js  
• Expo React Native  

Scaffolds generate **directly into the workspace root**.

Expo scaffold additions include:

• `create-expo-app` blank template generation  
• post-scaffold patch to ensure `package.json` contains:

`"dev": "expo start"`

This guarantees the Preview / Terminal guidance can rely on:

`pnpm dev`

Developer reminder exists in:

`src/runtime/templateRegistry.js`

When new templates are added, future maintainers are reminded to also review:

• `src/runtime/previewRunner.js`  
• `src/runtime/PreviewPanel.jsx`  
• `src/runtime/ServicePanel.jsx`  

so detection, preview behavior, and deploy guidance remain in sync.

---

# 🖥 4d Command Runner

Backend:

`src-tauri/src/command_runner.rs`

Frontend bridge:

`src/runtime/commandRunner.js`

UI:

`src/runtime/CommandRunnerPanel.jsx`

Capabilities:

• run shell commands in project root  
• stream stdout/stderr logs  
• one command session at a time  
• Windows compatibility using:

`cmd /C <command>`

• persistent long-running dev session support  
• tracked child PID for active command  
• explicit Stop button for running command  

Events emitted:

`kforge://command/log`  
`kforge://command/status`  

Preview and Terminal panels are **mutually exclusive collapsibles**.

User-facing surface name is:

**Terminal**

Path:

AI Panel  
→ Terminal

---

## Command Runner Improvement in Expo follow-up

The command runner was upgraded during Expo preview testing because the earlier implementation behaved like a one-shot command executor and blocked poorly on long-running dev servers.

Fixes now include:

• parallel stdout/stderr streaming threads  
• tracked active child PID  
• `command_stop` backend command  
• frontend Stop button  
• better handling of long-running processes such as Expo dev servers  

This makes the Terminal more professional and more correct for dev-session behavior.

However:

Expo QR rendering still does not surface in a beginner-usable way inside KForge Terminal.

So the current product truth remains:

• Terminal is improved and operational  
• Stop works  
• long-running Expo commands run  
• phone-preview QR flow should still be done via **system terminal outside KForge**

---

# 🔌 4e Service Integration Layer

Backend:

`src-tauri/src/service.rs`

Frontend bridge:

`src/runtime/serviceRunner.js`

Registry:

`src/runtime/serviceRegistry.js`

UI:

`src/runtime/ServicePanel.jsx`

Panel host:

`src/ai/panel/AiPanel.jsx`

Registered commands include:

`service_setup`  
`github_detect_repo`  
`github_open_repo`  
`github_pull`  
`github_push`  
`github_clone_repo`  
`supabase_create_env_file`  
`supabase_install_client`  
`supabase_create_client_file`  
`supabase_create_read_example`  
`supabase_create_insert_example`  
`supabase_create_query_helper`  
`supabase_quick_connect`  
`stripe_create_env_file`  
`openai_create_env_file`  
`openai_install_sdk`  
`openai_create_client_file`  
`openai_create_example`  
`open_url`  

---

## Service Layer Purpose

Provides a unified architecture for **external service integrations**.

Instead of building custom subsystems for each service, KForge now uses:

registry entry + adapter implementation

This creates a consistent runtime lane for integrations.

---

## Service Registry

File:

`src/runtime/serviceRegistry.js`

Current services:

• GitHub  
• Supabase  
• Stripe  
• OpenAI  

Deploy providers are currently represented through the task-first Services UI and fallback provider mapping in the Services panel:

• Vercel  
• Netlify  

Fields include:

• id  
• name  
• description  
• status  
• envVars  
• setupCommand  

---

## Reusable Installer Helper

File:

`src-tauri/src/service.rs`

A reusable helper now exists:

`install_pnpm_package(...)`

This helper centralizes shared pnpm installer behavior for service adapters, including:

• checking `package.json`  
• checking `pnpm` availability  
• running `pnpm add`  
• emitting install logs  

OpenAI and Supabase package installers now use this helper.

Rule for future SDK-install actions:

Prefer reusing `install_pnpm_package(...)` instead of duplicating package-install logic.

---

# 🟣 GitHub Integration (Phase 4.6)

Primary implementation:

`src-tauri/src/service.rs`

Primary UI:

`src/runtime/ServicePanel.jsx`

Runtime bridge:

`src/runtime/serviceRunner.js`

GitHub support now includes:

• publish local project to a new GitHub repository  
• detect whether current folder is already a Git repo  
• detect whether a remote exists  
• open current repository on GitHub in browser  
• pull latest changes into an existing local repo  
• push local changes to GitHub  
• import an existing GitHub repository during New Project flow  

Authentication remains delegated to GitHub CLI:

`gh auth login`

---

# 🚀 Deploy Pipeline (Phase 4.7 / 4.7b)

Deploy providers:

• Vercel  
• Netlify  

KForge does **not** try to become a hosting dashboard.

Instead, KForge provides **guided deploy shortcuts** for GitHub-connected projects.

Smart deploy guidance is now template-aware.

Current mapping examples:

• Static HTML → Good fit: Netlify or Vercel  
• Vite + React → Good fit: Netlify or Vercel  
• Next.js → Recommended: Vercel  
• Expo React Native → do not treat as a normal beginner web deploy target

Important source of truth:

Project identity is shared from the preview/template detection path.

Primary files:

• `src/runtime/templateRegistry.js`  
• `src/runtime/previewRunner.js`  
• `src/runtime/PreviewPanel.jsx`  
• `src/runtime/ServicePanel.jsx`  

---

# 🟩 4.8 / 4.9 Supabase Integration + Quick Connect + Developer Assist

Primary files:

• `src-tauri/src/service.rs`  
• `src-tauri/src/lib.rs`  
• `src/runtime/serviceRunner.js`  
• `src/runtime/ServicePanel.jsx`  
• `src/runtime/serviceRegistry.js`  
• `src/ai/capabilities/kforgeServiceWorkflows.js`  

Capabilities now include:

• readiness inspection  
• `.env.example` generation  
• `.env` creation  
• Vite-aware env guidance  
• local Supabase config detection  
• client install  
• client file generation  
• Quick Connect  
• read example generation  
• insert example generation  
• query helper generation  
• calmer log grouping and quoted action highlighting  

Generated files include:

• `src/lib/supabase.js`  
• `src/examples/supabaseExample.js`  
• `src/examples/supabaseInsertExample.js`  
• `src/lib/supabaseQueries.js`  

Important historical bug found and fixed:

The example/helper backend commands existed in `service.rs` but were not initially registered in the Tauri invoke handler in `lib.rs`.

That is now fixed.

---

# 🟨 5.1 Stripe Adapter + Webhook Readiness

Primary route:

Services  
→ Payments  
→ Stripe

Primary files:

• `src-tauri/src/service.rs`  
• `src-tauri/src/lib.rs`  
• `src/runtime/serviceRunner.js`  
• `src/runtime/serviceRegistry.js`  
• `src/runtime/ServicePanel.jsx`  
• `src/ai/capabilities/kforgeServiceWorkflows.js`  

Capabilities now include:

• readiness inspection  
• `.env.example` generation / update  
• `.env` creation helper  
• dashboard/docs handoff  
• webhook docs handoff  
• detection of:

`STRIPE_SECRET_KEY`  
`STRIPE_PUBLISHABLE_KEY`  
`STRIPE_WEBHOOK_SECRET`

KForge remains intentionally narrow here:

guided setup, not billing-dashboard sprawl.

---

# 🟦 5.3 OpenAI Adapter

Primary route:

Services  
→ AI  
→ OpenAI

Primary files:

• `src-tauri/src/service.rs`  
• `src-tauri/src/lib.rs`  
• `src/runtime/serviceRunner.js`  
• `src/runtime/ServicePanel.jsx`  
• `src/runtime/serviceRegistry.js`  
• `src/ai/capabilities/kforgeServiceWorkflows.js`  

The OpenAI lane now supports:

• check setup  
• create `.env`  
• install SDK  
• create client file  
• create example file  

Commands added across the lane:

• `openai_create_env_file`  
• `openai_install_sdk`  
• `openai_create_client_file`  
• `openai_create_example`

Generated files:

• `src/lib/openai.js`  
• `src/examples/openaiExample.js`

Important product truth:

This lane is for adding OpenAI to the user’s project.

It is **not** the same thing as choosing the provider that powers KForge chat itself.

---

# 🟧 5.4 Template Expansion + Expo Preview Flow

Phase 5.4 extended the template and preview architecture into **mobile app generation** with Expo / React Native.

Primary files:

• `src/runtime/templateRegistry.js`  
• `src/runtime/previewRunner.js`  
• `src/runtime/PreviewPanel.jsx`  
• `src-tauri/src/scaffold.rs`  
• `src-tauri/src/lib.rs`  
• `src-tauri/src/command_runner.rs`  
• `src/runtime/commandRunner.js`  
• `src/runtime/CommandRunnerPanel.jsx`  
• `src/ai/capabilities/kforgePreviewWorkflows.js`  

New template:

Expo React Native

Registry entry:

`expo-react-native`

New scaffold command:

`scaffold_expo_react_native`

Key truths now proven:

• no fake mobile preview inside KForge  
• Preview for Expo is guidance-first  
• Open stays disabled for Expo  
• phone preview should go through a system terminal outside KForge  
• `pnpm dev` is the preferred default  
• `pnpm dev -- --tunnel` is the fallback when same-network discovery fails

---

# 🟪 6.0+ Workflow Awareness, Routing, and Task Templates

Recent work after the adapter/template phases has moved heavily into **AI behavior hardening**.

This includes:

• workflow-aware guidance  
• manual bypass handling  
• no-project vs empty-folder handling  
• truthful post-tool follow-up  
• prompt-size reduction through relevance filtering  
• durable task-template guidance  
• workflow vs implementation request separation  

Primary files now important here include:

• `src/App.js`  
• `src/ai/panel/AiPanel.jsx`  
• `src/ai/capabilities/kforgeCapabilities.js`  
• `src/ai/capabilities/kforgeServiceWorkflows.js`  
• `src/ai/capabilities/kforgePreviewWorkflows.js`  
• `src/ai/capabilities/kforgeTerminalWorkflows.js`  
• `src/ai/capabilities/discoverCapabilities.js`  
• `src/ai/taskTemplates/buildKforgeTaskTemplateContext.js`

---

## Routing bucket lesson

Stable AI behavior depends on classifying requests into a small number of durable routing buckets, not endlessly stacking one-off prompt patches.

Current canonical buckets include:

• project open vs no project open  
• empty folder vs real project  
• KForge workflow request vs normal implementation request  
• manual bypass vs KForge-managed path  
• successful tool writes vs failed tool writes  
• gratitude / closing turn vs active work request  

When behavior feels wrong, classify the bug into one of these buckets first.

---

## Durable task-template lesson

Chat-level prompts should carry durable behavioral rules, not brittle technical recipes likely to age badly.

What belongs in task-template / guidance layers:

• routing behavior  
• workflow truthfulness  
• tool safety  
• no-project / empty-folder behavior  
• manual-bypass behavior  
• implementation-vs-workflow separation  

What should **not** be fossilized too early in chat guidance:

• fragile framework-specific recipes  
• rapidly changing technical setup steps  
• narrow operational details better owned by product surfaces like Preview, Services, or Terminal

This remains a key architectural rule for KForge work going forward.

---

# 🟢 6.3 / 6.4 Current Hardening Findings

Recent work produced several important product findings that now need to stay documented.

---

## Help menu placement findings

Files / surfaces investigated:

• `src-tauri/tauri.conf.json`  
• `src-tauri/src/lib.rs`  
• `src/App.js`  
• `src/ai/panel/AiPanel.jsx`  
• `src/layout/TabsBar.js`

Conclusions now considered reliable:

• the topmost **KForge** title beside native window controls belongs to native OS window chrome, not React  
• the white Help strip is the native Tauri menu bar from `src-tauri/src/lib.rs`  
• the old `TabsBar.js` Help area is not the current live shell authority  
• the correct React-owned home for the live Help dropdown is the AI panel header in `src/ai/panel/AiPanel.jsx`

Practical value:

This should save a lot of future time when adding/removing shell controls.

---

## Transcript / Clear-button debugging findings

Files involved:

• `src/App.js`  
• `src/ai/panel/AiPanel.jsx`  
• `src/ai/panel/TranscriptPanel.jsx`

What happened:

• `Clear` looked missing  
• prop wiring still existed  
• render logic still existed  
• multiple header-only changes did not solve it  
• transcript content leakage hinted that layout ownership, not logic, was wrong  

Real fix lesson:

The transcript view depends on correct parent flex / overflow behavior in `AiPanel.jsx`, not only on header markup in `TranscriptPanel.jsx`.

This is now a durable debugging lesson.

---

## Workspace / AI activity indicator findings

Primary file:

`src/App.js`

Related surfaces:

• `src/components/Explorer.jsx`  
• `src/ai/panel/AiPanel.jsx`  
• `src/ai/panel/TranscriptPanel.jsx`

Current behavior now includes:

• workspace busy state for folder opening / scanning  
• busy label display in toolbar  
• busy label display in Explorer  
• animated assistant pending wording  
• shared activity tick driving visible motion / ellipsis behavior

Lesson:

Activity feedback works best when the state is centralized in `App.js` and passed down into surfaces, rather than each panel inventing its own loading state.

---

# 🟡 5️⃣ Stable Development Loop

Canonical workflow:

Open folder  
Generate (optional)  
Install  
Preview  
Open  
Stop  
Iterate  

AI workflow:

Open folder  
Prompt AI  
AI edits files  
Install  
Preview  
Hot reload  

Agent workflow:

Open folder  
Prompt AI  
AI requests tools  
Tools execute through consent/runtime  
AI continues reasoning  
AI returns final answer  

Service workflow:

Open folder  
Open Services  
Publish to GitHub  
Push changes  
Deploy via Vercel or Netlify  
Configure Supabase if needed  
Configure Stripe if needed  
Configure OpenAI if needed  
Continue development  

Import workflow:

New Project  
Choose local create or GitHub import  
Open project automatically  
Continue development  

Workflow-aware AI guidance:

User asks for a capability  
→ AI maps request to an existing KForge workflow if one exists  
→ AI guides user to KForge-first path  
→ AI only continues in chat if the user explicitly chooses to bypass KForge  

Terminal-aware AI guidance:

User asks to run commands, install packages, or use shell workflow  
→ AI prefers AI Panel → Terminal if that matches the request  
→ AI remains advisory only  

Expo exception:

User asks to preview Expo mobile app on a phone  
→ AI should not treat KForge Terminal as the primary beginner path  
→ AI should guide to Preview guidance + system terminal outside KForge  

Conceptual-help rule:

User asks for explanation / conceptual help / manual-only guidance  
→ AI answers normally  
→ no unnecessary tool calls  
→ no forced KForge workflow unless the user is clearly asking to use one  

Routing-bucket rule:

When behavior feels wrong, first classify the case into:

• project-open state  
• empty-folder state  
• workflow request vs implementation request  
• manual-bypass state  
• tool success vs tool failure  
• gratitude / closing turn  

before adding more steering text.

---

# 🟢 6️⃣ Filesystem Guarantees

Filesystem layer ensures:

• writes scoped to project root  
• parent folders auto-created  
• invalid paths blocked  
• clear surfaced errors  

Explorer refreshes after:

• AI file writes  
• directory creation  
• scaffold generation  

Service adapters must follow the same project-root restriction.

---

# 🟠 7️⃣ UI Philosophy

KForge is not a debug console.

KForge is:

A calm reasoning-first coding surface.

Principles:

• chat is primary  
• tools are explicit  
• diagnostics optional  
• human-readable errors first  
• no hidden side effects  
• guided integrations, not dashboard sprawl  
• workflow truth before workflow hype  

Important rule:

• AI may guide  
• AI may recommend  
• AI may hand off to real workflows  
• AI must not hijack UI state  

Important Expo truthfulness rule:

• KForge must not pretend mobile preview happens inside KForge  
• KForge must be explicit when a workflow requires an external surface  
• Expo localhost output must not be promoted as a beginner-facing app preview URL  

Important shell/UI lesson:

Not every visible strip is a React surface.

Always identify first whether a UI element belongs to:

• native OS window chrome  
• native Tauri menu bar  
• React top toolbar  
• AI panel header  
• legacy dead/stub layout files  

before editing.

---

# 🧠 8️⃣ Current Stability State

As of **Phase 6.4 — Agent workflows + UI hardening follow-up**:

• AI surface stable  
• canonical single message store intact  
• filesystem tools validated  
• preview runner stable  
• scaffold system operational  
• template registry working  
• command runner upgraded for long-running processes  
• command stop flow implemented  
• Terminal panel awareness implemented for AI guidance  
• service integration layer operational  
• GitHub workflow implemented  
• GitHub import implemented  
• Services UX architecture stabilized  
• Deploy pipeline implemented  
• Vercel deploy shortcut working  
• Netlify deploy shortcut working  
• template-aware deploy guidance working  
• Next.js deploy recommendation working  
• Expo deploy de-emphasis working  
• Supabase adapter implemented  
• `.env.example` generation working  
• `.env` creation assist working  
• Supabase client install working  
• Supabase client file creation working  
• Supabase read example generation working  
• Supabase insert example generation working  
• Supabase query helper generation working  
• missing Supabase developer-assist Tauri command registration fixed  
• Supabase setup messaging duplication fixed  
• Supabase example/helper wording improved  
• Supabase log grouping working  
• Supabase Quick Connect working  
• Stripe adapter implemented  
• Stripe setup inspection working  
• Stripe `.env.example` generation/update working  
• Stripe `.env` creation assist working  
• Stripe dashboard/docs handoff working  
• Stripe webhook readiness guidance working  
• OpenAI adapter foundation implemented  
• OpenAI setup inspection working  
• OpenAI `.env` creation assist working  
• OpenAI SDK install action working  
• OpenAI client file generation working  
• OpenAI example generation working  
• reusable pnpm installer helper established in service layer  
• per-service Services log isolation working  
• tool schema layer working  
• tool-calling agent loop working  
• duplicate tool-call protection working  
• weak-model fallback parsing working  
• write-tool consent tightening working  
• stale tool-result continuation fix working  
• AI workflow-awareness manifests implemented  
• Preview workflow guidance tightened for existing projects vs new template generation  
• Preview template workflow awareness implemented  
• GitHub import-vs-service distinction captured for AI guidance  
• KForge-first handoff behavior implemented for guided workflows  
• capability relevance filtering implemented  
• capability self-discovery from service registry implemented  
• capability self-discovery from template registry implemented  
• service-route discovery aligned more closely to real task-grouped paths  
• tool-emission guardrails tightened for explanations and manual-only requests  
• no-project vs empty-folder routing hardening implemented  
• manual-bypass routing tightened  
• truthful post-tool success/failure follow-up behavior improved  
• gratitude / closing-turn workflow restraint added  
• Expo React Native template generation working  
• Expo package patch for `pnpm dev` working  
• Expo guidance-only Preview UX working  
• Expo Open button suppression working  
• Expo phone preview validated via system terminal + tunnel mode  
• Help dropdown moved into the AI header successfully  
• native Help menu ownership clarified  
• transcript Clear button restored  
• transcript sticky/header vs scroll ownership lesson now documented  
• workspace activity indicators working  
• animated assistant activity wording working  

Supported workflows now include:

AI editing  
Project scaffolding  
Dev server preview  
Static site preview  
In-app terminal commands  
GitHub repository publishing  
GitHub repo push / pull / open  
GitHub repository import during project creation  
Deploy handoff to Vercel  
Deploy handoff to Netlify  
Template-aware deploy recommendation inside Services  
Supabase setup inspection  
Supabase Quick Connect  
Supabase environment file preparation  
Supabase client install guidance  
Supabase client file generation  
Supabase read example generation  
Supabase insert example generation  
Supabase query helper generation  
Stripe setup inspection  
Stripe environment file preparation  
Stripe dashboard/docs handoff  
Stripe webhook-readiness guidance  
OpenAI setup inspection  
OpenAI environment file preparation  
OpenAI SDK installation guidance  
OpenAI client file generation  
OpenAI example generation  
Expo React Native template generation  
Expo external mobile-preview guidance  
Expo phone preview via system terminal  
per-service persistent activity logs in Services  
tool-based AI inspection and reasoning  
agent-style read/inspect/explain loops  
workflow-aware AI guidance to existing KForge features  
Preview-driven template generation guidance  
Preview-first guidance for already-open projects  
Terminal-aware command guidance  
KForge-first handoff for supported product workflows  
capability-aware conversational behavior with reduced prompt bloat  
routing-bucket-aware AI hardening for common workflow states  
truthful post-tool follow-up behavior  
AI-header Help access

---

# 🏗 Extensibility Lanes

KForge now has six extensibility/runtime systems:

Template Registry  
Service Registry  
Preview Runtime  
Command Runtime  
Agent Runtime  
AI Capability Awareness  

These lanes allow new capabilities to be added without redesigning the architecture.

Future integrations should attach adapters rather than creating new subsystems.

Current AI-awareness maintenance discipline:

• new service workflow → update `src/ai/capabilities/kforgeServiceWorkflows.js` when AI-specific guidance is needed  
• new non-service guided workflow → add/update a manifest under `src/ai/capabilities/`  
• discovered runtime services come from `src/runtime/serviceRegistry.js`  
• discovered templates come from `src/runtime/templateRegistry.js`  
• top-level formatting and filtering live in `src/ai/capabilities/kforgeCapabilities.js`  
• routing-state hardening and post-tool truthfulness frequently involve `src/App.js` and `src/ai/panel/AiPanel.jsx`  

Important addition:

When a new template changes the **real preview truth**, update not only template discovery but also the AI’s handoff logic and workflow exceptions.

Expo proved that template discovery alone is not enough.

The assistant must also know when a template changes:

• preview expectations  
• terminal guidance  
• deploy guidance  
• beginner workflow truths  

Possible future integration lanes:

• Firebase  
• Clerk  
• Auth0  
• Vercel project-assist beyond deploy handoff  
• Netlify project-assist beyond deploy handoff  

Possible future backend / AI improvements:

• environment variable manager  
• template-aware backend scaffolding  
• richer Supabase code generation guidance  
• lightweight Supabase connection test action  
• richer model-routing between fast chat models and stronger tool-driving models  
• better QR / device-link surfacing for mobile preview flows  
• stronger AI exception handling for template-specific preview paths  

---

# ⚓ Captain’s Law — Safe Editing Workflow

These workflow rules exist to keep development **fast, safe, and predictable** across all ships.

They apply to all future phases unless explicitly overridden.

---

## 1 — Locate Before Editing

Always locate the relevant code first using:

```text
rg -n "<search phrase>" <path>
````

Never edit based on memory or assumptions.

---

## 2 — Inspect Live Code Blocks

Before modifying a file, inspect the current code block using:

PowerShell example:

```text
Get-Content <file> | Select-Object -Skip <line> -First <count>
```

This prevents accidental edits against outdated assumptions.

---

## 3 — Prefer Full File Replacement (When Safe)

If a file is small enough to review comfortably:

Replace the **entire file**.

Advantages:

* fewer merge mistakes
* clearer changes
* easier verification

Large files should use **precise block replacement instead**.

---

## 4 — Replace Exact Blocks Only

When partial edits are required:

1. extract the exact current block
2. modify only that block
3. paste the corrected block back

Never guess surrounding code.

---

## 5 — Verify Immediately

After every edit, verify changes using:

```text
rg -n "<keyword>" <file>
```

Confirm the expected code is present and old code is gone.

---

## 6 — Commit Frequently

Stable progress should be committed regularly:

```text
git add .
git commit -m "<phase description>"
git push
```

---

## 7 — Create Restore Points

When reaching a stable milestone, create a tag:

```text
git tag <milestone-tag>
git push origin <milestone-tag>
```

This creates a reliable rollback point.

---

## 8 — One Step At A Time

Development proceeds **incrementally**.

Rules:

* no jumping ahead
* verify each change
* test before continuing

This discipline keeps KForge stable even during rapid iteration.

---

End of Captain’s Law.

---

# 🚢 Phase Boundary

Phase 4.10 introduced the first real **tool-calling agent loop**.

Phase 4.10.1 hardened that loop based on real model behavior, especially for weaker models.

Phase 5.0.1 explored **Intent-Driven Backend Setup**, but the UI-routing version was deliberately rolled back because auto-navigation and sticky state created instability.

Phase 5.0.2 rebuilt the useful part safely as **KForge service workflow awareness for AI guidance**.

Phase 5.0.3 expanded that foundation into **Global AI Capability Awareness**.

Post-phase testing then added a **routing hardening checkpoint** covering no-project state, empty-folder state, manual bypass, truthful post-tool follow-up behavior, and gratitude / closing-turn restraint.

Phase 5.1 converted Stripe from a placeholder into a real **Stripe Adapter** inside Services → Payments.

Phase 5.1.1 extended that lane with **Stripe Webhook Readiness** guidance.

Phase 5.2 returned to its actual purpose: **Supabase Developer Assist**. Real testing in a fresh project validated the generated helper flow, exposed missing Tauri command registration for the new Supabase example/helper actions, and improved the setup/example messaging so the feature is clearer for beginners and vibe coders.

Phase 5.3.0 established the **OpenAI Adapter foundation**, wiring OpenAI into the existing Services architecture and adding setup + env generation support.

Phase 5.3.1 added **Install OpenAI SDK**, validated the first package-manager install action for OpenAI, and confirmed the shared service pipeline now cleanly supports external dependency installation.

Phase 5.3.2 added **Generate OpenAI Client**, wiring guided creation of `src/lib/openai.js` through the same service pipeline.

Phase 5.3.3 added **Generate OpenAI Example**, wiring guided creation of `src/examples/openaiExample.js` through the same service pipeline and completing the full OpenAI onboarding lane.

Phase 5.4 expanded KForge’s template surface into **Expo React Native**, added the first mobile template, hardened Preview truthfulness for external mobile preview, improved the command runner for long-running dev sessions, and validated the first real phone-preview flow through Expo Go.

Phase 6.3 hardened durable task-template behavior so the assistant better separates:

• workflow routing
• normal implementation work
• no-project behavior
• empty-folder behavior
• manual-bypass behavior

Phase 6.4 has now added important UI / workflow hardening follow-up, including:

• Help-menu home clarified and moved into the AI header
• native shell area ownership clarified
• transcript Clear-button layout bug fixed
• transcript scroll/header ownership lesson discovered
• shared activity indicators strengthened

What this now proves:

• the Services layer can support beginner-friendly backend onboarding
• fast guided entry points reduce friction for vibe coders
• per-service history matters once multiple integrations live in one panel
• backend integrations can remain explicit, calm, and low-noise without turning into dashboard-heavy workflows
• AI integrations can use the same explicit service lane without needing a special subsystem
• KForge can support real agent-style reasoning without sacrificing consent-gated tooling
• weaker models can be made more usable with targeted runtime hardening
• AI can be taught real KForge workflows without hijacking the UI
• KForge product awareness can scale beyond Services into Preview, Terminal, and discovered runtime capabilities
• stable AI behavior depends on classifying requests into a small number of routing buckets
• post-tool follow-up messaging must be tied to actual tool success, not merely intended calls
• KForge can support a truthful external mobile-preview workflow without pretending mobile apps render inside KForge
• template expansion now affects preview truth, deploy guidance, terminal guidance, and AI-awareness rules together
• shell debugging becomes much easier once native chrome, native menu bar, React toolbar, and AI header are treated as distinct surfaces
• a rendered control can still appear missing when scroll/flex ownership is wrong

Current stable journey:

Local Project
→ GitHub
→ Smart Deploy Guidance
→ Vercel / Netlify
→ Supabase Quick Connect
→ guided Supabase setup
→ Supabase Developer Assist starter artifacts
→ Stripe setup and webhook-readiness guidance
→ OpenAI setup, SDK install, client generation, and example generation guidance
→ Expo React Native scaffold + external preview guidance
→ AI tool-calling agent workflow
→ KForge workflow-aware AI guidance
→ Global AI capability awareness across Services / Preview / Terminal / registry-discovered features
→ routing-bucket hardening for calmer, more truthful AI behavior
→ shell / transcript UI hardening for calmer, more reliable surfaces

Important warning for future work:

Do **not** return to intrusive UI-routing intent behavior.

Previously rejected:

• auto-opening Services
• auto-selecting providers from chat
• focus-mode side effects
• sticky recommendation state
• panel hijacking

Safe direction is:

AI-awareness only, not UI control.

```
```
