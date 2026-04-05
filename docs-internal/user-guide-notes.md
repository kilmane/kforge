
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

# Install

Install installs project dependencies.

Command used:

```text
pnpm install
```

Not required for static projects.

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

Services → GitHub
Shows only GitHub activity.

Services → Supabase
Shows only Supabase activity.

Switching between providers does **not mix logs**.

Returning to a service restores its previous log history.

This behavior was introduced in **Phase 4.9.1 — ServicePanel log isolation**.

---

# Supabase in Services

Supabase in KForge is a **guided backend onboarding flow** for projects that already exist.

Typical journey:

Build app first
→ open **Services → Backend → Supabase**
→ connect Supabase step by step
→ adapt generated examples to the real app

---

# OpenAI in Services

OpenAI in KForge provides a **guided AI integration flow** for projects that already exist.

The flow mirrors the Supabase developer assist workflow.

Typical journey:

Build an application first
→ open **Services → AI → OpenAI**
→ connect OpenAI step by step
→ generate working AI code

---

## OpenAI Integration Steps

The OpenAI helper currently provides:

* Check OpenAI setup
* Create `.env` file
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

without needing to manually configure the SDK.

---

## OpenAI `.env` File

KForge can generate:

```
.env
```

containing:

```
OPENAI_API_KEY=
```

The user pastes their API key from the OpenAI dashboard.

---

## Install OpenAI SDK

KForge installs the official OpenAI Node SDK:

```
pnpm add openai
```

---

## OpenAI Client File

KForge generates:

```
src/lib/openai.js
```

Example:

```javascript
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
});
```

Purpose:

* centralize OpenAI setup
* provide a reusable client
* reduce repeated configuration in application code

---

## OpenAI Example

KForge can generate a minimal working AI example:

```
src/examples/openaiExample.js
```

Example:

```javascript
import { openai } from "../lib/openai";

async function runExample() {
  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: "Write a one sentence description of KForge."
  });

  console.log(response.output[0].content[0].text);
}

runExample();
```

Purpose of this example:

* confirm the OpenAI connection works
* demonstrate a minimal API call
* provide a copyable starting pattern

This verifies that:

* the API key is valid
* the SDK is installed
* the OpenAI client works
* the application can successfully call the OpenAI API

Developers can then adapt this pattern for real features.

---

# Deploy in Services

Deploy currently supports:

* Vercel
* Netlify

Deploy actions open provider flows in the browser.

The typical deploy path is:

Local project
→ GitHub
→ Deploy

---

# AI Guidance Inside KForge

KForge AI increasingly guides users toward **native KForge workflows** instead of doing everything in chat.

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

```

---


