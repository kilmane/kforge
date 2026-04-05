
# User Guide Notes (development capture)

Last Updated: **April 5th, 2026**

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

Open Folder → Explore files
Preview → Focus on running app

---

# Preview Runner Controls

The Preview Runner manages the runtime used to run the current project.

---

# Preview Workflow

The workflow depends on the **project type**.

KForge automatically inspects the opened folder and determines how it should be previewed.

Detection currently works in two stages:

Project structure → coarse project type
package.json signals → framework identification when possible

This allows KForge to both:

* decide the correct preview workflow
* show a more human-readable project detection result when possible

---

## Static Projects

If a project contains:

```text
index.html
```

KForge automatically runs a **static preview server**.

Workflow:

Open Folder
Preview
Open

No dependency installation is required.

Example static project:

```text
index.html
styles.css
script.js
```

For static-only projects the **Install** step is skipped.

---

## Framework Projects

Framework projects use a **development server**.

Typical indicator:

```text
package.json
```

Workflow:

Open Folder
Install
Preview
Open

Typical commands executed:

```text
pnpm install
pnpm dev
```

Currently recognized framework templates include:

* Vite + React
* Next.js

---

# Generate

Generate creates a **starter template project** inside the opened workspace folder.

Current templates supported:

* Static HTML/CSS/JS
* Vite + React
* Next.js

Template generation is driven by the **Template Registry**.

Generate is available from the **Preview** panel.

Typical flow:

Open Folder
Preview
Generate
Install (if needed)
Preview
Open

If no folder is open, Generate is blocked.

Important distinction:

**Preview runs an existing project.**
**Generate creates a new starter project.**

---

## Static HTML Template

Creates a simple project:

```text
index.html
styles.css
script.js
```

Workflow:

Generate
Preview
Open

No dependency installation required.

---

## Vite + React Template

Command executed:

```text
pnpm dlx create-vite@latest . --template react --no-interactive
```

Dependencies are installed later using **Install**.

---

## Next.js Template

Command executed:

```text
pnpm create next-app@latest . --yes
```

Next.js installs dependencies during generation.

Generation therefore takes longer than other templates.

---

# Install

Install installs project dependencies.

Command used:

```text
pnpm install
```

Not required for static projects.

If a template already installs dependencies during scaffold, Install may not be needed immediately.

KForge may also expose an **Install** button or joblet-style install action in places where dependency installation is the obvious next step.

This is intended to reduce terminal friction for beginners.

---

# Preview

Preview starts the project runtime.

Static → internal static server
Framework → `pnpm dev`

Preview logs stream into the Preview Runner panel.

---

# Open

Open launches the running preview in the browser.

Example URLs:

```text
http://localhost:3000
http://127.0.0.1:4173
```

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

The Terminal is useful for:

* installing packages
* running development servers
* running Git commands
* diagnosing project issues

Commands run independently and do not persist shell sessions.

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

This keeps the surface calmer as integrations expand.

---

# Services Activity Logs

Each service now maintains **its own activity history**.

Example:

Services → GitHub
Shows only GitHub activity.

Services → Supabase
Shows only Supabase activity.

Switching between providers does **not mix logs**.

Returning to a service restores its previous log history.

This behavior was introduced in **Phase 4.9.1 — ServicePanel log isolation**.

---

# GitHub in Services

GitHub currently supports actions for the **current open local project**.

GitHub currently supports:

* Publish
* Push changes
* Pull latest
* Open on GitHub

GitHub state shown in the panel includes:

* whether a git repo is detected
* whether a commit exists
* whether a remote exists
* current branch

Publishing requires a project folder to be open.

Important clarification:

**Services → Code → GitHub is not the GitHub import flow.**

It is used for GitHub actions on the project that is already open in KForge.

---

## Import from GitHub

If the user wants to bring an existing GitHub repository into KForge, the correct flow is:

New Project
→ Import from GitHub

This is separate from **Services → Code → GitHub**.

---

# Supabase in Services

Supabase in KForge is a **guided backend onboarding flow** for projects that already exist.

The intended user journey is:

Build app first
→ open **Services → Backend → Supabase**
→ connect Supabase step by step
→ adapt the generated examples to the real app

---

## Supabase Developer Assist

Actions available:

* Check Supabase setup
* Create `.env` file
* Install Supabase client
* Create Supabase client file
* Create read example
* Create insert example
* Create query helper

These actions help developers **connect an existing project to Supabase** without needing to leave the editor.

---

# OpenAI in Services

OpenAI in KForge provides a **guided AI integration flow** for projects that already exist.

The intent is similar to the Supabase developer assist flow.

Users typically:

Build an application first
→ open **Services → AI → OpenAI**
→ connect the OpenAI SDK step by step
→ generate a client and example code

The OpenAI helper actions currently include:

* Check OpenAI setup
* Create `.env` file
* Install OpenAI SDK
* Create OpenAI client file

These steps help developers move from:

```text
AI idea
```

to

```text
AI connected inside the app
```

without needing to manually configure the SDK.

---

## OpenAI `.env` File

KForge can generate:

```text
.env
```

containing:

```text
OPENAI_API_KEY=
```

The user pastes their API key from the OpenAI dashboard into this file.

---

## Install OpenAI SDK

KForge installs the official OpenAI Node SDK:

```text
pnpm add openai
```

This is executed through the **service pipeline**, which runs the command inside the project folder.

---

## OpenAI Client File

KForge can generate:

```text
src/lib/openai.js
```

This file initializes a reusable OpenAI client.

Example:

```javascript
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
});
```

Purpose:

* centralize OpenAI setup
* give the project a single reusable AI client
* reduce repeated configuration inside application code

Developers can then import the client anywhere in the project:

```javascript
import { openai } from "../lib/openai";
```

This file acts as the **connection layer between the application and the OpenAI API**.

---

# Deploy in Services

Deploy currently supports:

* Vercel
* Netlify

Deploy actions are lightweight handoffs to provider flows in the browser.

KForge does **not expose advanced hosting dashboards inside the app**.

The deploy workflow is intended to feel like:

Local project
→ GitHub
→ Deploy

---

## Deploy Preconditions

Deploy requires the current project to already be connected to GitHub.

If GitHub is not connected, the deploy action is blocked and the panel tells the user to connect GitHub first.

If the repository exists but changes have not yet been pushed, the panel may show:

Push changes before deploying.

---

# AI Guidance Inside KForge

KForge AI is becoming more aware of **real KForge workflows**.

The assistant should increasingly guide users toward KForge workflows instead of performing everything inside chat.

Examples:

Supabase setup →
Services → Backend → Supabase

OpenAI setup →
Services → AI → OpenAI

GitHub actions →
Services → Code → GitHub

Create starter app →
Preview → Generate

Import GitHub repo →
New Project → Import from GitHub

Run commands →
AI Panel → Terminal

---

# User-Facing Design Principles Captured So Far

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

