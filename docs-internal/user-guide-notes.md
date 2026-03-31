

# User Guide Notes (development capture)

Last Updated: **March 31st, 2026**

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

```
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

```
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

```
http://localhost:3000
http://127.0.0.1:4173
```

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


