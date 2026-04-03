
# User Guide Notes (development capture)

Last Updated: **April 3rd, 2026**

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
````

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

Current providers visible in development include:

* GitHub
* Vercel
* Netlify
* Supabase
* Stripe

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

This means KForge is not trying to hide Supabase behind a single magic button.

Instead, it helps the user move through setup in small understandable steps.

---

## Supabase Developer Assist

**Supabase Developer Assist** is the name used for the guided helper actions available in:

```text
Services
→ Backend
→ Supabase
```

These actions are meant to reduce friction for developers who want to connect an existing project to Supabase.

Current actions include:

* Check Supabase setup
* Create `.env` file
* Install Supabase client
* Create Supabase client file
* Create read example
* Create insert example
* Create query helper

The feature is designed to help with **integration work after the app already exists**.

Example workflow:

```text
Create or open app
→ build UI first
→ open Services → Backend → Supabase
→ create env + client
→ generate example queries
→ adapt examples to real schema
→ wire app to database
```

This is useful because many users can build a frontend, but still need help with the first backend connection steps.

---

## What “Check Supabase setup” Does

**Check Supabase setup** is a diagnostic and guidance action.

It checks the current project for things like:

* `.env` and `.env.example`
* expected Supabase environment variables
* local Supabase config
* installed Supabase client library
* generated helper/example files

The action then reports current state and suggests the next likely step.

Examples:

* create `.env`
* install the Supabase client
* create the client file

The goal is to make backend onboarding feel **explicit and calm**, not mysterious.

---

## `.env` and `.env.example`

KForge may create:

```text
.env.example
```

to document the expected Supabase variables for the project.

KForge may then create:

```text
.env
```

from that example file so the user has a local place to paste real values.

General mental model:

```text
.env.example = project documentation
.env = local working values / secrets
```

This follows normal developer conventions.

---

## Supabase Client File

KForge can generate:

```text
src/lib/supabase.js
```

This file creates a reusable Supabase client for the project.

The purpose is to give the app **one shared connection point** instead of repeating client setup in many places.

This is a good beginner-friendly step because it keeps the setup small and easy to understand.

---

## Read Example

KForge can generate:

```text
src/examples/supabaseExample.js
```

This is a **starter read example**.

Purpose:

* show the shape of a basic Supabase query
* give the user a copyable pattern
* help the user replace placeholder values with their real table name

This is intended as a learning bridge between:

```text
Supabase is installed
```

and

```text
my real app now reads data
```

---

## Insert Example

KForge can generate:

```text
src/examples/supabaseInsertExample.js
```

This is a **starter insert example**.

Purpose:

* show the shape of a basic insert operation
* provide a safe editable pattern
* help the user understand how rows are added

Like the read example, this file is not meant to be the final app architecture.

It is a starter pattern the user can adapt and copy into real app code.

---

## Query Helper

KForge can generate:

```text
src/lib/supabaseQueries.js
```

This file contains simple reusable helpers for common read and insert actions.

Purpose:

* reduce repeated query code
* give the project a small shared helper layer
* provide a cleaner path for slightly more structured app code

This helper is still simple, but it is conceptually a little more advanced than the read or insert example files.

That does **not** mean it should be removed.

It means documentation should explain clearly that:

```text
read/insert examples = easiest learning path
query helper = optional reusable helper path
```

---

## Local and Cloud Supabase

The Supabase flow is intended to support both:

* **Cloud Supabase**
* **Local Supabase**

KForge setup messaging may detect whether a local Supabase config is present.

If no local config is detected, cloud setup is still considered valid.

Generated client setup may also support both frontend-style and generic environment variable names such as:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
```

This allows the same guided flow to work across common project setups.

---

## Supabase Developer Assist Design Intent

The design intent is:

* do not force the user into raw backend setup immediately
* do not dump a giant scaffold into the project
* provide small helpful artifacts
* let the user move from setup → examples → real integration

This is meant to feel like **developer assist**, not full backend automation.

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

## Smart Deploy Guidance

Deploy guidance is aware of the detected project type.

Examples:

Static HTML → good fit for Netlify or Vercel
Vite + React → good fit for Netlify or Vercel
Next.js → recommended: Vercel

This is guidance, not a restriction.

---

# AI Guidance Inside KForge

KForge AI is becoming more aware of **real KForge workflows**.

The assistant should increasingly guide users toward KForge workflows instead of performing everything inside chat.

Examples:

Supabase setup →
Services → Backend → Supabase

GitHub actions →
Services → Code → GitHub

Create starter app →
Preview → Generate

Import GitHub repo →
New Project → Import from GitHub

Run commands →
AI Panel → Terminal

---

## AI Workflow Handoff Rule

If a workflow already exists in KForge, the assistant should:

1. guide the user to the KForge workflow first
2. avoid performing the workflow directly in chat
3. continue in chat **only if the user explicitly bypasses KForge**

This keeps KForge feeling like a **guided development environment**, not just a chatbot.

---

## AI Tool Usage Behavior

AI may request internal tools when a user explicitly asks for an action inside the project.

Examples:

* creating files
* modifying files
* running project operations

However, the assistant should **not emit tool actions** when the user is:

* asking conceptual questions
* asking for explanations
* requesting manual instructions
* explicitly bypassing KForge workflows

In those cases the assistant responds with normal chat guidance instead.

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

````

