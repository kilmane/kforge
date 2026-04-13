
# User Guide Notes (development capture)

Last Updated: **April 13th, 2026**

Location:
`D:\kforge\docs-internal\user-guide-notes.md`

These notes capture **user-facing behavior during development**.

Sections will later become part of the official user guide.

---

# Window Areas / Navigation Mental Model

KForge currently has several different visible top-level areas.

This matters because not everything visible at the top of the window belongs to the same system.

## Native window title area

The very top strip is the **native OS window chrome**.

This is where users see:

* the KForge window title
* minimize
* maximize
* close

This area is **not a normal in-app React toolbar**.

---

## Native Help menu bar

Below the native title area, KForge may show a native **Help** menu bar.

This is a **native Tauri menu surface**.

It is separate from the app’s internal React layout.

---

## In-app top toolbar

Below the native shell surfaces, KForge shows its normal in-app toolbar.

This is where users see actions such as:

* Focus
* New Project
* Open Folder
* Reset Workspace
* Refresh
* Close Folder
* Save
* Memory
* Settings
* Hide AI

This is the main React-controlled workspace toolbar.

---

## AI header area

Inside the AI panel, KForge has a compact header area.

This area contains:

* provider / model selector
* transcript toggle
* Help dropdown access

This is now the preferred in-app home for Help-style controls.

---

# Preview Runner

Behavior:

Opening a project folder automatically disables **Focus Mode** so the **Explorer becomes visible**.

This allows users to navigate the project tree.

When the user clicks **Preview**, KForge may switch back to **Focus Mode** so the Preview Runner panel is clearly visible.

User mental model:

```text
Open Folder → Explore files
Preview → Focus on running app
````

---

# Preview Runner Controls

The Preview Runner manages the runtime used to run the current project.

---

# Preview Workflow

The workflow depends on the **project type**.

KForge automatically inspects the opened folder and determines how it should be previewed.

Detection currently works in two stages:

```text
Project structure → coarse project type
package.json signals → framework identification when possible
```

This allows KForge to both:

* decide the correct preview workflow
* show a more human-readable project detection result when possible

---

# Static Projects

If a project contains:

```text
index.html
```

KForge automatically runs a **static preview server**.

Workflow:

```text
Open Folder
Preview
Open
```

No dependency installation is required.

Example static project:

```text
index.html
styles.css
script.js
```

For static-only projects the **Install** step is skipped.

---

# Framework Projects

Framework projects use a **development server**.

Typical indicator:

```text
package.json
```

Workflow:

```text
Open Folder
Install
Preview
Open
```

Typical commands executed:

```text
pnpm install
pnpm dev
```

Currently recognized framework templates include:

* Vite + React
* Next.js

---

# Mobile Projects (Expo / React Native)

KForge also supports generating **mobile applications** using **Expo React Native**.

Mobile apps behave differently from web apps.

A mobile application **cannot run inside the KForge interface**.

Instead, the app runs on:

* a real phone
* a simulator
* an emulator
* or an optional browser preview

Because of this, KForge Preview for mobile projects provides **guided instructions rather than running the app directly inside KForge**.

---

# Expo Mobile Preview Workflow

Typical workflow for a mobile project:

```text
Open Folder
Generate Expo template
Install
Preview (shows guidance)
Run commands in system terminal
Open app on phone
```

The **Preview button explains how to launch the mobile preview outside KForge**.

---

# Phone Preview (Recommended)

The most common way to preview a mobile app is using **Expo Go on a real phone**.

Steps:

1. Install **Expo Go** from the App Store or Google Play.
2. Open your **system terminal outside KForge**.
3. Navigate to the project folder.
4. Run:

```text
pnpm dev
```

Your terminal will display a **QR code**.

Scan the QR code with Expo Go to launch the app.

---

# Tunnel Mode (Fallback)

Sometimes a phone cannot connect to the development server due to network restrictions.

In that case run:

```text
pnpm dev -- --tunnel
```

Tunnel mode allows the phone to connect even if it is on a different network.

Tunnel mode is slower but very reliable.

---

# Browser Preview (Optional)

Expo can also run the mobile project in a web browser.

Some projects require installing additional dependencies first:

```text
npx expo install react-dom react-native-web
```

Then run:

```text
pnpm run web
```

This launches a browser preview.

Browser preview is useful for quick testing but **does not fully replicate real device behavior**.

---

# Android Emulator Preview

Android preview can run inside an Android emulator.

Requirements:

* Android Studio
* Android emulator configured

Command:

```text
pnpm run android
```

---

# iOS Simulator Preview

iOS preview requires:

* macOS
* Xcode installed

Command:

```text
pnpm run ios
```

This launches the iOS simulator.

---

# Important Note About Terminals

KForge includes a built-in **Terminal panel**.

However, **Expo mobile preview commands should currently be run in a system terminal outside KForge**.

Examples of system terminals:

* PowerShell
* Windows Terminal
* macOS Terminal
* Linux terminal

This is because Expo uses advanced terminal features, especially **QR rendering**, that are not yet fully supported in a beginner-friendly way inside the KForge terminal.

The KForge terminal remains useful for:

```text
pnpm install
git commands
package installs
general project commands
```

---

# Generate

Generate creates a **starter template project** inside the opened workspace folder.

Current templates supported:

* Static HTML/CSS/JS
* Vite + React
* Next.js
* Expo React Native

Template generation is driven by the **Template Registry**.

Generate is available from the **Preview** panel.

Typical flow:

```text
Open Folder
Preview
Generate
Install (if needed)
Preview
Open
```

If no folder is open, Generate is blocked.

Important distinction:

**Preview runs an existing project.**
**Generate creates a new starter project.**

---

# Install

Install installs project dependencies.

Command used:

```text
pnpm install
```

Not required for static projects.

---

# Preview

Preview starts the project runtime **or displays preview guidance** depending on the project type.

Behavior:

```text
Static → internal static server
Framework → pnpm dev
Mobile → guided external preview workflow
```

Preview logs stream into the Preview Runner panel when applicable.

---

# Open

Open launches the running preview in the browser.

Example URLs:

```text
http://localhost:3000
http://127.0.0.1:4173
```

For mobile projects the Open button is disabled.

---

# Terminal

KForge includes a built-in **Terminal** panel inside the AI panel.

The Terminal allows users to run commands directly inside the current project workspace.

Typical usage:

```text
AI Panel
→ Terminal
→ enter command
→ Run
```

Commands run in the **workspace root folder**.

Example commands:

```text
pnpm install
pnpm dev
git status
git add .
```

Terminal logs appear inside the panel and stream in real time.

Long-running commands are supported more reliably than before, and users can now stop a running terminal command.

Important reminder:

For **Expo phone preview**, the recommended user-facing path is still a **system terminal outside KForge**.

---

# Services

The Services panel is a guided integration surface for project-connected tasks.

Current groups:

* Code
* Deploy
* Backend
* Payments
* AI

Current providers visible in development include:

* GitHub
* Vercel
* Netlify
* Supabase
* Stripe
* OpenAI

The panel is **task-first** and only shows one active provider at a time.

---

# Services Activity Logs

Each service now maintains **its own activity history**.

Example:

```text
Services → GitHub
Shows only GitHub activity.

Services → Supabase
Shows only Supabase activity.
```

Switching between providers does **not mix logs**.

Returning to a service restores its previous log history.

This behavior was introduced in:

**Phase 4.9.1 — ServicePanel log isolation**

---

# Supabase in Services

Supabase in KForge is a **guided backend onboarding flow** for projects that already exist.

Typical journey:

```text
Build app first
→ Services → Backend → Supabase
→ connect Supabase step by step
→ adapt generated examples
```

Current helper actions include:

* Check Supabase setup
* Create `.env`
* Install Supabase client
* Create Supabase client file
* Create read example
* Create insert example
* Create query helper

This flow is meant to feel like **developer assist**, not full backend automation.

---

# OpenAI in Services

OpenAI in KForge provides a **guided AI integration flow** for projects that already exist.

Typical journey:

```text
Build app first
→ Services → AI → OpenAI
→ connect OpenAI step by step
→ generate working AI code
```

---

# OpenAI Integration Steps

The OpenAI helper currently provides:

* Check OpenAI setup
* Create `.env`
* Install OpenAI SDK
* Create OpenAI client file
* Create OpenAI example

These steps help developers move from:

```text
AI idea
```

to

```text
AI working inside the application
```

without manual SDK configuration.

Important note:

This is for adding OpenAI to the user’s project.

It is **not** the same thing as choosing which provider powers KForge chat itself.

---

# Deploy in Services

Deploy currently supports:

* Vercel
* Netlify

Typical deploy path:

```text
Local project
→ GitHub
→ Deploy
```

Deploy guidance is template-aware.

Examples:

* Next.js projects may recommend Vercel more strongly
* Expo mobile projects are not treated like normal beginner web deploy targets

---

# GitHub in Services

GitHub in KForge is for actions on the **current open local project**.

Typical path:

```text
Services → Code → GitHub
```

Current GitHub actions include:

* publish
* push
* pull
* open repository

Important distinction:

Importing an existing GitHub repo is **not** a Services action.

Import path:

```text
New Project → Import from GitHub
```

---

# AI Guidance Inside KForge

KForge AI increasingly guides users toward **native KForge workflows** instead of doing everything in chat.

Examples:

```text
Supabase setup → Services → Backend → Supabase
OpenAI setup → Services → AI → OpenAI
GitHub actions → Services → Code → GitHub
Create starter app → Preview → Generate
Import GitHub repo → New Project → Import from GitHub
Run commands → AI Panel → Terminal
```

Special case:

For **Expo mobile preview**, AI should guide users to run commands in a **system terminal outside KForge**.

---

# Transcript View

Transcript is the fuller, system-style view of the conversation.

It includes:

* user messages
* assistant messages
* system messages
* tool events

Transcript also includes:

* Retry
* Clear

Recent development testing showed that transcript controls are sensitive to **layout and scroll ownership**.

User-facing takeaway:

If transcript behavior looks visually wrong, the issue may be layout-related rather than the control actually being gone.

---

# Activity Indicators

KForge now uses clearer activity feedback in several places.

Examples include:

* folder opening / scanning feedback
* Explorer busy wording
* animated assistant pending wording in chat/transcript

The goal is to help users notice that KForge is actively doing work without turning the UI into a noisy loader-heavy experience.

---

# Help Access

KForge currently has more than one Help-related surface.

Examples include:

* native Help menu in the Tauri menu bar
* in-app Help access in the AI header area

Important user-facing idea:

Help access should feel close to the AI workflow, not buried in unrelated layout surfaces.

This is why the AI header is now an important in-app Help location.

---

# User-Facing Design Principles

KForge should feel:

* calm
* explicit
* guided
* low-noise
* project-aware
* truthful about workflow limits

KForge should avoid:

* hidden actions
* noisy debug-heavy surfaces
* overwhelming dashboards
* provider-specific complexity walls
* fake “all inside KForge” claims when a workflow really needs an external surface

---

```
```
