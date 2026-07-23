[← Docs home](index.md)

---

# KForge User Guide — Beta V1

Welcome to KForge.

KForge is a project-aware coding workspace that combines AI chat, file editing, preview tooling, terminal access, and guided service integrations in one desktop app.

This guide is written for early beta testers. It is designed to help you get started quickly, understand the layout, choose providers and models, work with files, preview projects, and use KForge’s built-in workflows with confidence.

> **Beta note**
>
> This guide matches the current beta as closely as possible, but some labels, providers, and settings may still evolve.
>
> **Important: KForge is not itself an AI brain**
>
> KForge includes built-in routes, safeguards, and guided workflows that try to send common requests down logical paths without adding extra cost for users. This helps with app starters, Preview, Services, model choice, recovery, and safe editing flows.
>
> Even so, KForge can still route a request or workflow incorrectly. If the response does not match what you expected, try rephrasing your request more clearly.
>
> **Follow the visible workflow choices**
>
> KForge works best when you follow the choices shown in the chat, such as **Preview worked**, **Preview failed**, **Back to chat**, **Stop**, **Status**, or **Continue editing**.
>
> When KForge is inside an active workflow, it keeps that workflow context so it can route the next reply safely. For example, if KForge has just asked whether Preview succeeded or failed, it will treat the next reply as a Preview result. If you change topic inside that active workflow, KForge may misunderstand the new request or give an inconsistent response.
>
> If you want to change direction, use **Back to chat** or **Stop** first. If the conversation still feels confused, reset or reopen the workspace and start again from a fresh state.
>
> **Service words can be context**
>
> Words such as deployment, Supabase, Stripe/payments, OpenAI, GitHub, repo, or repository do not always mean “open Services now”. KForge may ask a controlled confirmation, tell you which Services path to use, or treat the wording as planning context. It should not claim a service was connected, deployed, pushed, published, or configured unless a real action reports success.
>
> KForge is not an AI brain. It routes common workflows through guarded, logical paths, but it can still misunderstand requests when the current workflow context and the next message do not match.
>
> For more flexible planning or coding help, connect one of your chosen AI models and use the AI-assisted route. Model quality varies, and weak/test-only or unverified models may produce poor code or unreliable tool requests, so choose a model that matches the task.
>
> Future versions such as KForge V2 / KForge Pro are expected to improve this with more robust routing and workflow intelligence.

---

# Table of Contents

1. What KForge is
2. The main layout at a glance
3. Focus mode and workspace views
4. First setup: providers and models
5. Settings: configuring providers securely
6. Change Provider/Model: daily model switching
7. Help topics, labels, and model colors
8. Opening, creating, and closing projects
9. The main toolbar
10. Explorer and file editing
10a. Workspace Awareness
11. The AI panel
12. Chat vs Transcript
13. Prompt box and AI settings
14. Preview
15. Generate
16. Install, Preview, Stop, and Open
17. Mobile apps with Expo
18. Terminal
19. Services
20. Memory
21. Common beginner workflows
22. Troubleshooting
23. Current beta limitations

---

# 1) What KForge is

KForge is not just a chat box.

It is a project workspace that combines:

* an AI assistant
* a file explorer
* a code editor
* a project preview runner
* a built-in terminal
* guided integrations for common developer services

KForge is designed to feel:

* calm
* explicit
* guided
* project-aware
* truthful about workflow limits

That last point matters.

If something belongs in a better surface than chat, KForge should guide you there instead of pretending everything happens inside one message.

Examples:

* project integrations belong in **Services**
* running projects belongs in **Preview**
* shell commands belong in **Terminal**
* provider/API key setup belongs in **Settings**

---

# 2) The main layout at a glance

When KForge opens, you will usually see four main areas.

## A. Native window title bar

At the very top is the normal desktop window bar.

This includes:

* the KForge title
* minimize
* maximize
* close

This is part of the operating system window, not the editable workspace.

## B. Top toolbar

Directly below it is the main KForge toolbar.

In the current beta, it includes:

* Focus / Exit Focus
* New Project
* Open Folder
* Reset Workspace
* Refresh
* Close Folder
* Save
* Memory
* Settings
* Hide AI
* current folder status such as `No folder opened`

## C. Workspace area

This is where Explorer and the editor appear when a folder is open.

When nothing is open, you may see empty-state messages such as:

* `No file open`
* `No folder opened.`
* `Click a file in the Explorer to open it`

## D. AI area

The AI section includes:

* the provider/model button
* the Help dropdown
* Transcript access
* Preview
* Terminal
* Services
* the prompt box
* Send and Test connection buttons

---

# 3) Focus mode and workspace views

Focus changes how much of the window is given to the AI area versus the file workspace.

## When Focus is off

When the toolbar button says **Focus**:

* Explorer and editor space are visible
* KForge behaves more like a traditional project workspace
* the AI area stays docked below

This is usually better for:

* browsing folders
* opening files
* editing code
* inspecting project structure

## When Focus is on

When the toolbar button says **Exit Focus**:

* the AI area takes over more of the window
* Preview, Terminal, Services, and AI prompting become the main working surface

This is usually better for:

* AI-first work
* guided workflows
* previewing and service tasks

## Simple rule

* **Focus off** = file-first work
* **Focus on** = AI-first work

---

# 4) First setup: providers and models

Before you can use KForge fully, you usually need to configure at least one AI provider.

## Provider vs model

A **provider** is the company, local runtime, or endpoint that powers KForge chat.

A **model** is the specific AI model you choose from that provider.

In the current UI, the active pair is shown in the green AI header button, for example:

```text
openai / gpt-4o-mini
```

## The two places you should know

KForge separates setup from everyday switching:

* **Settings** = configure providers, keys, and endpoints
* **Change Provider/Model** = choose what you want to use right now

That separation is useful.

Secrets stay in Settings, while fast model switching happens in the AI area.

## Good beginner approach

Start with:

* one provider you already have access to
* one reliable model
* Test connection
* a simple first prompt

Use faster models for routine work and stronger models for harder debugging or planning.

---

# 5) Settings: configuring providers securely

Open **Settings** from the top toolbar.

This is the correct place to configure providers.

The current beta UI makes the intention very clear:

> Configure providers here. The main panel must not show API keys or endpoints.

That means API keys and similar secrets should not be typed into the main chat surface.

## What Settings shows

In the current beta, Settings includes:

* a left sidebar of providers
* grouped provider categories
* a right-side details panel for the selected provider
* configuration status such as `Configured`
* API key fields where relevant
* Save and Clear buttons
* a note that keys are stored securely in the OS keychain via Tauri

## Provider groups

The current build shows providers grouped into categories such as:

* **Cloud (Native)**
* **OpenAI-Compatible**
* **Local**

Examples visible in the current build include:

### Cloud (Native)

* OpenAI
* Gemini
* Claude
* Ollama Cloud

Use **Ollama Cloud** for direct Ollama hosted API access. It requires an Ollama API key.

### OpenAI-Compatible

* DeepSeek
* Groq
* Mistral
* OpenRouter

### Local runtimes and endpoints

* Ollama endpoint
* LM Studio

Use **Ollama endpoint** for the local Ollama app, a remote/self-hosted Ollama endpoint, or Ollama cloud models through the local app after `ollama signin`.

There may be additional providers lower in the list depending on the build.

## Configured badge

When a provider is ready, KForge shows it as **Configured**.

That makes it easy to see which providers are ready before switching to them.

---

# 6) Change Provider/Model: daily model switching

The provider/model button in the AI header opens the **Change Provider/Model** dialog.

This is the faster day-to-day switching surface.

## What it includes

In the current beta, the dialog includes:

* provider selector
* provider label such as `Stable`
* `Configure in Settings` shortcut
* model filter such as `All`
* a help link: `What do these labels mean?`
* `My Models`
* an input to **Add model ID (saved per provider)**

## Saved per provider

This is an important detail.

Saved models are stored **per provider**.

That means you can keep a different preferred list for OpenAI, OpenRouter, Groq, or any other provider.

## Manual model entry

You can also type a model ID manually.

Example shown in the current screenshot:

```text
gpt-4o-mini
```

This is useful when:

* you know the exact model name
* the model is not already in a visible preset list
* you want to keep your own preferred set of model IDs

## Everyday workflow

A simple daily pattern is:

1. configure the provider once in Settings
2. use Change Provider/Model whenever you want to switch models quickly

---

# 7) Help topics, labels, and model colors

KForge includes an in-app **Help** dropdown beside the provider/model button.

This keeps help close to the AI workflow.

## Current Help topics

From the screenshot, the Help menu includes topics such as:

* User Guide
* Windows Setup Guide
* Providers and Models
* Models Color + Labels
* Terminology
* What is Prompt ...
* Custom Providers ...
* Portability ...
* Presets Inventory ...

## What this means for users

You do not need to leave the AI area to understand:

* which provider to choose
* what different labels mean
* what model colors are trying to tell you
* what “custom provider” means

## How to think about colors and labels

Treat model colors and labels as guidance, not as strict guarantees.

A good beginner rule is still:

* use faster/lighter models for quick edits and routine prompts
* use stronger models for debugging, planning, and harder reasoning

---

# 8) Opening, creating, and closing projects

KForge works best when a project folder is open.

## Open Folder

Use **Open Folder** when you already have a local project.

Examples:

* a React app
* a Next.js project
* a static web project
* a folder you want to build inside

## New Project

Use **New Project** when you want to start fresh or import an existing GitHub repository.

Current beta choices may include:

* **1 — Create local project**
* **2 — Import from GitHub by URL**
* **3 — Browse my GitHub repos**

Use **Import from GitHub by URL** when you already have the repository URL.

Use **Browse my GitHub repos** when GitHub CLI is installed and signed in on your computer. KForge will ask GitHub CLI for your repositories, show a numbered list, then clone the selected repository into the folder you choose.

## Close Folder

Use **Close Folder** when you want to leave the current project and return to a neutral workspace.

## Reset Workspace

Use **Reset Workspace** when you want a cleaner UI state.

---

# 9) The main toolbar

The top toolbar controls the workspace.

## Focus / Exit Focus

Changes layout emphasis between workspace-first and AI-first modes.

## New Project

Starts a new project flow.

## Open Folder

Opens a local folder into KForge.

## Reset Workspace

Resets the workspace UI state.

## Refresh

Refreshes the current workspace view.

Useful when KForge needs to rescan or redraw its state.

## Close Folder

Closes the current project folder.

## Save

Saves current work where applicable.

## Memory

Opens memory-related controls.

## Settings

Opens provider and app configuration.

## Hide AI

Hides the AI panel so the file workspace can take more attention.

## Folder status

The toolbar also shows the current folder state, such as:

```text
No folder opened
```

This is a quick visual confirmation of whether KForge is attached to a real project folder.

---

# 10) Explorer and file editing

When a folder is open, KForge can show the project tree and editor workspace.

A good beginner flow is:

1. open a folder
2. browse the file tree
3. open a file
4. ask KForge for help on that file
5. save your changes
6. preview the project if needed

## Good file-aware prompts

Examples:

* “Explain this file.”
* “Add a settings page.”
* “Refactor this component.”
* “Find where the login form is defined.”
* “Fix the bug in this file.”

KForge works best when the relevant project folder is open and the active file is clear.

## Workspace Awareness

KForge can use the already-loaded project tree to understand the shape of the current project.

This helps it prefer existing folders and files, suggest likely inspection targets, and avoid inventing project structure.

Workspace Awareness is based on visible project structure, not automatic reading of every file.

If KForge needs file contents to make a safe edit, it should inspect the relevant file first.

For more detail, see [Workspace Awareness](workspace-awareness.md).

---

# 11) The AI panel

The AI panel is where you talk to KForge and access AI-related workflows.

It includes:

* the provider/model button
* Help
* Transcript access
* Preview
* Terminal
* Services
* the prompt box
* Send and Test connection

The AI panel is not only for conversation.

It is also the place where KForge guides you toward the correct native workflow.

Examples:

* “Set up Supabase” → KForge may guide you to **Services → Backend → Supabase**
* “Add OpenAI to this app” → KForge may guide you to **Services → AI → OpenAI**
* “This app will need deployment later” → KForge may ask whether this is context or whether you want **Services → Deploy** now
* “Connect GitHub” → use **Services → Code → GitHub** for the current project, or **New Project → Import from GitHub by URL / Browse my GitHub repos** when importing an existing repository
* “Create a starter app” → KForge may guide you to **Preview → Generate**
* “Run git status” → KForge may guide you to **Terminal**

## Planning features before editing

For larger or unclear feature requests, KForge may produce a **Feature Blueprint** before editing files.

A blueprint is a planning step. It should describe:

* the likely files involved
* the implementation steps
* risks or assumptions
* how to preview or check the result

A blueprint should not claim files were changed. From there, you can choose to start implementation or refine the plan.

## App brief planning before generating a starter

When a project folder is empty, KForge can recommend a starter before any files are generated.

For clear app requests, KForge may recommend the starter directly. For vague new-app requests, KForge may first show starter choices such as:

* **Simple website / landing page**
* **Interactive web app**
* **Backend / accounts / database app**
* **Supabase app**
* **Mobile app**
* **Not sure**
* **Use AI-assisted plan**

When you choose one of these options, KForge may show a visible chat anchor such as `Choice: Backend / accounts / database app`. These `Choice:` anchors make menu decisions visible in the normal chat while the transcript still keeps the deeper workflow history.

Some menus also include **Show starter options again** and **Back to chat** so you can recover from a wrong choice without restarting the whole workspace.

If a non-empty project is already open and you ask a broad “build an app” request, KForge may first ask whether you want to:

* plan the app first
* start implementation in the current project
* use an AI-assisted plan
* go **Back to chat**
* **Stop**

The planning path should stay project-aware. It should not pretend the folder is empty, and it should not claim files were changed. If it asks for a numbered starter choice, the answer should stay inside that workflow instead of falling into a generic unclear-workflow menu.

Typical starter guidance is:

* normal interactive apps, todo apps, dashboards, and forms → **Vite + React**
* backend, login, accounts, saved data, admin dashboard, full-stack, SEO, or server-style apps → **Next.js**
* explicit Supabase requests → **Vite + React** first, then **Services → Backend → Supabase** later
* mobile, phone, Expo, or React Native apps → **Expo/mobile starter**
* static sites, landing pages, brochures, and portfolios → **Static HTML/CSS/JS**

KForge may show two planning paths:

* **Free starter plan** — uses built-in starter guidance. No AI model call or AI credits are used. This is the default beginner path.
* **AI-assisted app plan** — optional. Uses the current configured AI model and provider for a more detailed plan. Provider/API costs may apply, and quality depends on the selected model.

For normal app building, serious implementation, complex changes, multi-step
logic, or work where correctness matters, choose a model labelled **Project
builder**. Models labelled **Test-mode editing** can continue only through the
guarded test-mode choice. **Chat and planning** models do not automatically edit
projects, and **Unclassified** models cannot silently enter the normal builder
route.

The prompt area keeps **Working mode** visible. **Test mode** starts with a
lower-cost approved test model where available. **Project builder** suggests an
approved builder. You may choose a different model at any time; the working mode
does not change that model's approved capability.

The AI-assisted path is still planning-only. It should not edit files, request tools, preview, deploy, or claim anything was created.

To choose or change the model first, use **Change Provider/Model** in the AI header.

After choosing a starter, use **Preview → Generate**, then **Preview → Install**, then return to chat to continue the build.

## Controlled app-build flow

For larger app-building requests, KForge may use a guarded build loop instead of changing many files at once.

You may see buttons such as:

* **Start implementation in this project** — confirms you want KForge to build inside the open project.
* **Continue implementation** — starts the guarded build path after the model reminder.
* **Continue controlled implementation** — continues after KForge has inspected project files. No files were changed during inspection.
* **Approve write_file** — lets you review and approve one file write.
* **Continue app-build implementation** — appears when the first write created only part of the app, such as source markup without matching styles.

Before a controlled app-build starts, KForge may ask you to choose a **visual direction**. This is a pre-build choice, not a finished-app restyle. It helps steer the generated app's look and feel, such as palette, background treatment, card style, density, spacing, and typography feel.

Common visual direction choices include:

* **Use inferred default**
* **Light / airy**
* **Dark / premium**
* **Colourful / playful**
* **Minimal / professional**
* **Warm / editorial**
* **High-contrast dashboard**

This is normal. KForge is trying to inspect first, write one file at a time, and avoid claiming Preview, build, tests, deployment, or service setup unless those actions actually ran.

## After KForge edits files

After KForge completes an implementation edit, it may show:

* **Changed** — the files KForge recorded as changed
* **Verification** — what has or has not been checked
* suggested next action buttons

Common suggested actions include:

* **Preview the app** — use **Preview Panel → Preview** to run or view the project
* **Status** — check what KForge changed and what has or has not been verified
* **Show changes** — ask KForge to review the changed files it recorded
* **Start over with different look** — restore the files changed by the last controlled app-build, then choose a new visual direction and rebuild from the same original request
* **Continue editing** — describe the next change you want
* **No action needed** — leave the completed workflow alone

If KForge only completed part of a larger implementation, it may suggest **Continue implementation**, **Continue controlled implementation**, or **Continue app-build implementation** so the work can proceed in a guarded loop, often one source or style file at a time.

If **Start over with different look** appears, KForge has stored enough pre-app-build baseline information to attempt a safe restore of the files changed by that controlled app-build. If you choose it, KForge will ask you to confirm in chat, then request normal write approval for the restore writes. After the restore completes, KForge reopens the visual direction chooser so you can rebuild the same app request with a different look.

This is a safe start-over/rebuild route. It is not the same as true post-build restyling of an already generated app. Preview, build, and tests are not automatically run after the restore, and KForge should not claim they passed unless you run the relevant check.

If dependencies are missing, use **Preview Panel → Install** first.
When KForge hands you to Preview, it may ask you to reply with:

1. **Preview succeeded**
2. **Preview failed**

KForge should use that reply as a user-supplied Preview result. It should not claim chat itself ran Preview.

If you only say something vague such as “the app is broken,” KForge may ask what kind of problem it is before editing. For example, it may ask whether it is a Preview/runtime error, something visual, content/functionality, or something else.

If you ask KForge to change exact text and the inspected file does not contain that exact text, KForge should stop safely. It may offer to review the inspected file, search for the text, ask you for the exact text/path, or stop. It should not attempt a broad rewrite just because the target text was not found.

KForge should not pretend that chat itself has started the preview, run a build, or passed tests. The chat can guide you to the correct Preview workflow, but the Preview panel is where the project is actually run, opened, or guided.

## Test connection

The **Test connection** button is helpful during setup.

Use it when you want to check whether:

* the selected provider is configured correctly
* the chosen model is reachable
* the current credentials or endpoint appear valid

This is a good first troubleshooting step before assuming chat itself is broken.

---

# 12) Chat vs Transcript

KForge has both a normal chat view and a fuller transcript-style view.

## Chat

Chat is the calmer conversational surface.

Use it for:

* asking for features
* getting explanations
* debugging
* planning
* requesting edits

## Transcript

Transcript is the fuller system-style record.

It may include:

* user messages
* assistant messages
* system messages
* tool events
* utility actions such as Retry and Clear

## Simple rule

* **Chat** = cleaner conversation
* **Transcript** = fuller activity/system record

---

# 13) Prompt box and AI settings

The prompt box sits at the bottom of the AI area.

Directly above the prompt field, KForge shows the **Attach current file** control.

The prompt area includes:

* **Attach current file**
* the main prompt field
* **Send**
* **Test connection**

KForge keeps the normal AI panel focused on chat and controlled project work.

Provider configuration, project behaviour, and expert model controls are available in **Settings** instead of being mixed into the prompt area.

## Attach current file

Use **Attach current file** when the AI needs the exact contents of the file currently open in the editor.

The control sits directly above the prompt field, so it remains available without opening another menu.

When enabled, KForge includes the active file with the next prompt.

This is useful when:

* you want code-aware help
* you want debugging based on exact file content
* you want the AI to explain or modify a particular file
* the file contains details that are not visible from the project structure alone

The attached file appears beside the control.

Use **Remove** to stop attaching it.

If no file is open, the control is unavailable.

Attaching a file does not automatically change it. KForge’s normal controlled editing and tool-confirmation workflow still applies.

## Provider and model menu

The provider/model button at the top of the AI panel opens a small menu.

It contains:

* **Change Provider / Model**
* **Configure AI**

Use **Change Provider / Model** to select the AI provider and model used for requests.

Use **Configure AI** to open Settings directly on the current provider, where you can manage its API key and endpoint.

The normal provider/model menu no longer contains an Advanced settings surface.

## Settings → AI controls

Open **Settings** and select **AI controls** to configure:

* **Project behavior override**
* **Expert model controls**

Normal prompts and app iteration do not require these controls.

### Project behavior override

The **Project behavior override** is an optional higher-level instruction for the AI.

A normal prompt tells the AI what you want it to do now.

A project behavior override tells the AI how you want it to behave while helping with the current project.

It can be used for stable workflow preferences, tone, caution level, or response style.

Examples:

~~~text
Work one step at a time. Do not jump ahead. Wait for my result before continuing.
~~~

~~~text
Do not claim that you created, edited, saved, committed, pushed, or deleted any file unless the action actually happened through a tool or I confirmed it.
~~~

~~~text
Explain things for a beginner. Avoid jargon where possible. Use short steps.
~~~

The override is saved separately for each project.

When you reopen a project, KForge restores the override saved for that project.

Switching to another project loads that project’s own value. Clearing the field saves a blank override for the current project.

You must have a project open before editing this field.

Project behavior instructions can reduce confusion and improve consistency, but they do not guarantee perfect behaviour. Always check important commands, file changes, provider settings, and generated code yourself.

### How the project behavior override fits KForge guardrails

The **Project behavior override** is an extra user-provided instruction layer.

It is not a replacement for KForge’s built-in safety, workflow, and truthfulness guardrails.

Built-in guardrails should still prevent false tool claims, avoid pretending to inspect files that were not inspected, respect project-root safety, and keep guided workflows truthful.

For ready-made examples, use the **Behavior Templates** link beside the field, or open:

~~~text
https://kilmane.github.io/kforge/behavior-templates.html
~~~

## Expert model controls

The **Expert model controls** section contains optional generation settings for experienced users.

The defaults are suitable for normal KForge use.

### Temperature

Temperature controls how varied or predictable model responses may be.

Lower temperature usually means:

* more direct
* more predictable
* more consistent for coding and precise edits

Higher temperature usually means:

* more varied
* more creative
* sometimes less consistent

For implementation work, low or moderate values are usually the best starting point.

Some current models do not accept a custom temperature. KForge omits this setting for current Claude adaptive-thinking models so those presets do not fail with an invalid-parameter response.

### Max tokens

Max tokens limits the approximate maximum length of the model’s generated response.

A larger value allows longer answers or code output but may use more time or provider allowance.

A smaller value can keep responses shorter but may cause a long answer or implementation to stop early.

Leave the default in place unless you have a specific reason to change it.

## Removed legacy controls

The normal AI panel no longer shows:

* an **Advanced settings** window
* **Suggest edits (preview)**
* the old read-only **Patch Preview** panel
* the raw **Output** panel

Normal app iteration is chat-led and uses KForge’s controlled tools and workflow actions.

---
# 14) Preview

The Preview area is where KForge helps you run or inspect projects.

Preview is project-aware.

KForge inspects the open folder and chooses the preview workflow that fits the project.

Two important ideas:

* **Preview runs an existing project**
* **Generate creates a starter project**

---

# 15) Generate

Generate creates a starter template inside the open workspace folder.

Current template types may include:

* Static HTML/CSS/JS
* Vite + React
* Next.js
* Expo React Native

Typical flow:

1. open a folder
2. open Preview
3. choose Generate
4. choose a template
5. install dependencies if needed
6. preview the project
7. open it in a browser if supported

If no folder is open, Generate is blocked.

---

# 16) Install, Preview, Stop, and Open

## Install

Installs project dependencies.

Typical command behind the scenes:

```text
pnpm install
```

Static-only projects usually do not need this step.

## Preview

Starts the project runtime or shows preview guidance, depending on project type.

Typical behavior:

* static projects → internal static server
* framework projects → development server
* mobile projects → guided external workflow

## Stop

Stops the currently running preview process.

Useful when:

* restarting preview
* changing configuration
* freeing a running process
* freeing file locks before deleting or moving the project folder on Windows
* recovering from a stuck preview

## Open

Opens the running preview in a browser.

Typical examples:

* `http://localhost:3000`
* `http://127.0.0.1:4173`

For Expo mobile projects, Open is normally disabled because the workflow is different.

---

# 17) Mobile apps with Expo

Expo projects are special.

A mobile app does not run inside KForge the same way a web app does.

KForge can guide the workflow, but the real phone or simulator flow happens outside the normal in-app web preview model.

## Recommended phone preview

1. open or generate an Expo project
2. install dependencies
3. read the Preview guidance
4. open a **system terminal outside KForge**
5. go to the project folder
6. run:

```text
pnpm dev
```

7. scan the QR code with Expo Go on your phone

## Tunnel fallback

If your phone cannot connect on the same network:

```text
pnpm dev -- --tunnel
```

## Optional browser preview

Some Expo web previews require extra packages first:

```text
npx expo install react-dom react-native-web
pnpm run web
```

## Android emulator

```text
pnpm run android
```

## iOS simulator

Requires macOS and Xcode:

```text
pnpm run ios
```

## Important note

For Expo phone preview, the recommended path is still a **system terminal outside KForge**.

KForge’s built-in terminal is useful for many project commands, but Expo phone preview is more beginner-friendly in a normal system terminal.

---

# 18) Terminal

KForge includes a built-in **Terminal** panel in the AI area.

Use it for normal project commands.

Examples:

```text
pnpm install
git status
git add .
pnpm dev
```

Commands run in the current workspace root.

Output appears in the terminal panel and can stream live while the command runs.

Use the built-in terminal for:

* package installs
* git commands
* general development commands
* workspace-root shell work

For Expo phone preview specifically, prefer a system terminal outside KForge.

---

# 19) Services

Services is KForge’s guided integration area for project-connected tasks.

Current service groups may include:

* Code
* Deploy
* Backend
* Payments
* AI

Current provider examples include:

* GitHub
* Vercel
* Netlify
* Supabase
* Stripe
* OpenAI

## Mental model

* **Chat** helps you think and ask
* **Services** helps you perform guided project integrations

Mentioning a service during planning is not always the same as asking KForge to open or run that service now. For contextual wording, KForge may show choices such as **Open service now**, **Keep planning / editing the app**, **Back to chat**, or **Stop**. The chat should remain truthful: it has not connected, deployed, pushed, published, installed, or configured anything unless the matching KForge action actually reports success.

## GitHub

Use **Services → Code → GitHub** for actions on the current local project.

Before using GitHub publishing from KForge, your computer needs:

* **Git for Windows** for normal Git repository commands
* **GitHub CLI** for GitHub account connection and repository publishing
* one successful GitHub CLI sign-in with `gh auth login`

For beginner installation steps, see the [Windows Setup Guide](windows-setup.md).

Typical GitHub actions may include:

* **Publish** — initialise Git if needed, create a GitHub repository, set the `origin` remote, create the first commit, and push the project
* **Push changes** — commit and push local changes to GitHub after the project is already connected
* **Pull latest** — pull the latest changes from the connected GitHub repository
* **Open on GitHub** — open the connected repository in your browser

Important distinction:

* use **Services → Code → GitHub** for the current local project
* use **New Project → Import from GitHub by URL** when importing an existing GitHub repository from a pasted URL
* use **New Project → Browse my GitHub repos** when you want KForge to list repositories from your signed-in GitHub CLI account

## Deploy

Use **Services → Deploy** for deployment workflows.

Common targets include:

* Vercel
* Netlify

## Supabase

Use **Services → Backend → Supabase** for guided backend setup in an existing project.

Typical helper actions may include:

* check setup
* create `.env`
* install client
* create client file
* create read example
* create insert example
* create query helper

## Stripe

Use **Services → Payments → Stripe** for payment-related setup where available in the current build.

## OpenAI

Use **Services → AI → OpenAI** when you want to add OpenAI to your app’s code.

Typical helper actions may include:

* check setup
* create `.env`
* install OpenAI SDK
* create OpenAI client file
* create OpenAI example

## Important distinction

Adding OpenAI to your project through Services is **not** the same as choosing the provider/model that powers KForge chat itself.

Those are two separate things.

---

# 20) Memory

The **Memory** control is there to help with longer-running context and recurring preferences.

Depending on the build, memory can help KForge remember stable information that is useful across ongoing work.

Good candidates for memory:

* durable workflow preferences
* stable project rules
* repeated standing instructions

Less useful candidates:

* one-off experiments
* short-lived details
* temporary context that will not matter soon

---

# 21) Common beginner workflows

## A) I want to open an existing project

1. click Open Folder
2. browse the project in Explorer
3. open a file
4. ask KForge for help
5. save changes
6. preview if needed

## B) I want to start a new web project

1. prepare or open an empty folder
2. go to Preview
3. choose Generate
4. choose a template such as Static, Vite, or Next.js
5. install dependencies if needed
6. preview
7. open in browser

## C) I want to build a mobile app

1. open a folder
2. generate an Expo template
3. install dependencies
4. read the Preview guidance
5. use a system terminal outside KForge
6. run `pnpm dev`
7. scan the QR code with Expo Go

## D) I want to connect GitHub

For the current local project:

1. make sure Git for Windows is installed
2. if you want KForge to publish/push to GitHub, also install GitHub CLI and sign in once with `gh auth login`
3. open your project
4. go to Services → Code → GitHub
5. use the relevant GitHub action

To import an existing GitHub repository:

1. click New Project
2. choose **2 — Import from GitHub by URL** if you already have the repository URL
3. choose **3 — Browse my GitHub repos** if GitHub CLI is installed and signed in
4. choose the destination folder
5. KForge clones the repository and opens it as the current project

For setup steps, see the [Windows Setup Guide](windows-setup.md).

## E) I want to add backend support with Supabase

1. build or open your app first
2. go to Services → Backend → Supabase
3. follow the helper steps in order

## F) I want to add AI to my app

1. build or open your app first
2. go to Services → AI → OpenAI
3. follow the guided helper steps

## G) I want to run commands

1. open the AI panel
2. open Terminal
3. run the command in the workspace root

---

# 22) Troubleshooting

## Nothing useful is happening in chat

Check that:

* a project folder is open
* the right file is selected
* your provider is configured
* the correct model is selected
* Test connection succeeds

## Preview is not working

Check:

* whether the folder contains a real project
* whether dependencies were installed
* whether the project is static, framework, or mobile
* whether the workflow actually belongs outside KForge for mobile preview
If Preview fails, KForge should ask for concrete evidence before changing files. Useful evidence includes Preview panel logs, browser console errors, page error text, or screenshot text. KForge should inspect before editing and should not claim it reproduced the failure unless it actually has evidence.

## I cannot delete or rename my project folder

Stop Preview first.

While a preview or development server is running, Windows may keep files in the project folder locked. Use **Preview → Stop**, wait for Preview to return to idle, then delete, rename, or move the folder.

## Open is disabled

This can be normal for Expo/mobile projects.

## I cannot see Explorer

Check Focus mode or open a folder.

## My model/provider is not working

Try:

* opening Settings
* checking whether the provider is marked Configured
* switching model
* using Test connection
* reviewing the Help topics for provider/model guidance

## My Expo app is not opening on phone

Try:

* using a system terminal outside KForge
* running `pnpm dev -- --tunnel`
* checking that Expo Go is installed
* confirming you are in the correct project folder

## I am confused about where something belongs

Use this quick rule:

* ask questions in **Chat**
* inspect fuller activity in **Transcript**
* run projects in **Preview**
* run shell commands in **Terminal**
* connect services in **Services**
* configure providers in **Settings**

---

# 23) Current beta limitations

As an early beta product, some behavior may still evolve.

Examples:

* wording in settings may change
* provider lists may change
* model presets and labels may change
* help topics may expand
* some workflows may still be refined
* mobile preview remains different from normal web preview

The most important thing to remember is this:

KForge tries to guide you to the truthful workflow.

If something cannot happen entirely inside chat, KForge should guide you to the right surface instead of pretending otherwise.

---

# Quick reference

## Use Chat when you want to

* ask for features
* get explanations
* debug with AI help
* plan work
* ask what changed after an implementation

## Use Transcript when you want to

* inspect the fuller conversation/system record
* retry or clear with more visibility

## Use Preview when you want to

* generate a starter template
* run a project
* open a running web preview

## Use Terminal when you want to

* run commands in the project root
* check git state
* install packages

## Use Services when you want to

* connect GitHub
* deploy
* add Supabase
* add Stripe
* add OpenAI to your app

## Use Settings when you want to

* configure providers
* save API keys securely
* set up endpoints where required

---

# Final note

This guide is intended to help beta testers get productive quickly.

As KForge evolves, the exact labels and supported providers may change, but the core mental model should remain stable:

* open a project
* choose the right provider/model
* use chat for guidance
* use the right KForge surface for the job
* let KForge help you stay in the truthful workflow
---

[← Docs home](index.md)
