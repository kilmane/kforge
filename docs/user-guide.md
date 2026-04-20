# KForge User Guide — Beta V1

Welcome to KForge.

KForge is a project-aware coding workspace that combines AI chat, file editing, preview tooling, terminal access, and guided service integrations in one desktop app.

This guide is written for early beta testers. It is designed to help you get started quickly, understand the layout, choose providers and models, work with files, preview projects, and use KForge’s built-in workflows with confidence.

> **Beta note**
>
> This guide matches the current beta as closely as possible, but some labels, providers, and settings may still evolve.

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
11. The AI panel
12. Chat vs Transcript
13. Prompt box and advanced AI controls
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

Examples visible in the current screenshots include:

### Cloud (Native)

* OpenAI
* Gemini
* Claude

### OpenAI-Compatible

* DeepSeek
* Groq
* Mistral
* OpenRouter

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

Use **New Project** when you want to start fresh.

Depending on the build, this may also include import flows such as importing from GitHub.

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
* “Create a starter app” → KForge may guide you to **Preview → Generate**
* “Run git status” → KForge may guide you to **Terminal**

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

# 13) Prompt box and advanced AI controls

The prompt box sits at the bottom of the AI area.

It includes:

* the main prompt field
* Send
* Test connection

The current advanced area also shows several useful AI controls.

## System (optional)

There is a field for:

```text
Optional system instruction
```

This is for higher-level assistant guidance.

Use it for stable behavioral direction, not for every one-off request.

## Parameters

The visible parameter shown in the screenshot is:

* **Temperature**

The example value shown is:

```text
0.2
```

### Temperature explained

Lower temperature usually means:

* more direct
* more predictable
* safer for coding and precise edits

Higher temperature usually means:

* more varied
* more creative
* sometimes less consistent

For implementation work, low or moderate values are usually the best starting point.

## Output area

The advanced area also shows an output region labeled:

```text
Output will appear here...
```

This suggests KForge can surface output or preview-style results in that area for certain workflows.

## Prompt-related controls

Visible controls include:

* **Use current file**
* **Send current file with prompt**
* **Suggest edits (preview)**

### Use current file

This uses the currently open file as the active file context.

### Send current file with prompt

This includes the current file content with the request.

Useful when:

* you want code-aware help
* you want debugging based on exact file content
* you want the AI to explain or edit a specific file

### Suggest edits (preview)

This is useful when you want to review suggested changes before applying them.

A good beginner use case is cautious editing.

Turn it on when you want a review-first workflow instead of immediately acting on every suggestion.

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

## GitHub

Use **Services → Code → GitHub** for actions on the current local project.

Typical actions may include:

* publish
* push
* pull
* open repository

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

1. open your project
2. go to Services → Code → GitHub
3. use the relevant GitHub action

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
