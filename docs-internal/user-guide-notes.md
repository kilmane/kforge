
# User Guide Notes (development capture)

Last Updated: **April 8th, 2026**

Location:
`D:\kforge\docs-internal\user-guide-notes.md`

These notes capture **user-facing behavior during development**.

Sections will later become part of the official user guide.

---

# Preview Runner

Behavior:

Opening a project folder automatically disables **Focus Mode** so the **Explorer becomes visible**.

This allows users to navigate the project tree.

When the user clicks **Preview**, KForge may switch back to **Focus Mode** so the Preview Runner panel is clearly visible.

User mental model:

```
Open Folder → Explore files
Preview → Focus on running app
```

---

# Preview Runner Controls

The Preview Runner manages the runtime used to run the current project.

---

# Preview Workflow

The workflow depends on the **project type**.

KForge automatically inspects the opened folder and determines how it should be previewed.

Detection currently works in two stages:

```
Project structure → coarse project type
package.json signals → framework identification when possible
```

This allows KForge to both:

* decide the correct preview workflow
* show a more human-readable project detection result when possible

---

# Static Projects

If a project contains:

```
index.html
```

KForge automatically runs a **static preview server**.

Workflow:

```
Open Folder
Preview
Open
```

No dependency installation is required.

Example static project:

```
index.html
styles.css
script.js
```

For static-only projects the **Install** step is skipped.

---

# Framework Projects

Framework projects use a **development server**.

Typical indicator:

```
package.json
```

Workflow:

```
Open Folder
Install
Preview
Open
```

Typical commands executed:

```
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

```
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

```
pnpm dev
```

Your terminal will display a **QR code**.

Scan the QR code with Expo Go to launch the app.

---

# Tunnel Mode (Fallback)

Sometimes a phone cannot connect to the development server due to network restrictions.

In that case run:

```
pnpm dev -- --tunnel
```

Tunnel mode allows the phone to connect even if it is on a different network.

Tunnel mode is slower but very reliable.

---

# Browser Preview (Optional)

Expo can also run the mobile project in a web browser.

Some projects require installing additional dependencies first:

```
npx expo install react-dom react-native-web
```

Then run:

```
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

```
pnpm run android
```

---

# iOS Simulator Preview

iOS preview requires:

* macOS
* Xcode installed

Command:

```
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

This is because Expo uses advanced terminal features (such as QR rendering) that are not yet fully supported inside the KForge terminal.

The KForge terminal remains useful for:

```
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

```
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

```
pnpm install
```

Not required for static projects.

---

# Preview

Preview starts the project runtime **or displays preview guidance** depending on the project type.

Behavior:

```
Static → internal static server
Framework → pnpm dev
Mobile → guided external preview workflow
```

Preview logs stream into the Preview Runner panel when applicable.

---

# Open

Open launches the running preview in the browser.

Example URLs:

```
http://localhost:3000
http://127.0.0.1:4173
```

For mobile projects the Open button is disabled.

---

# Terminal

KForge includes a built-in **Terminal** panel inside the AI panel.

The Terminal allows users to run commands directly inside the current project workspace.

Typical usage:

```
AI Panel
→ Terminal
→ enter command
→ Run
```

Commands run in the **workspace root folder**.

Example commands:

```
pnpm install
pnpm dev
git status
git add .
```

Terminal logs appear inside the panel and stream in real time.

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

```
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

```
Build app first
→ Services → Backend → Supabase
→ connect Supabase step by step
→ adapt generated examples
```

---

# OpenAI in Services

OpenAI in KForge provides a **guided AI integration flow** for projects that already exist.

Typical journey:

```
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

```
AI idea
```

to

```
AI working inside the application
```

without manual SDK configuration.

---

# Deploy in Services

Deploy currently supports:

* Vercel
* Netlify

Typical deploy path:

```
Local project
→ GitHub
→ Deploy
```

---

# AI Guidance Inside KForge

KForge AI increasingly guides users toward **native KForge workflows** instead of doing everything in chat.

Examples:

```
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

# User-Facing Design Principles

KForge should feel:

* calm
* explicit
* guided
* low-noise
* project-aware

KForge should avoid:

* hidden actions
* noisy debug-heavy surfaces
* overwhelming dashboards
* provider-specific complexity walls

---
