
# User Guide Notes (development capture)

Last Updated: **March 28th, 2026**

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

index.html

KForge automatically runs a **static preview server**.

Workflow:

Open Folder
Preview
Open

No dependency installation is required.

Example static project:

```
index.html
styles.css
script.js
```

For static-only projects the **Install** step is skipped.

---

## Framework Projects

Framework projects use a **development server**.

Typical indicator:

package.json

Workflow:

Open Folder
Install
Preview
Open

Typical commands executed:

```
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

---

## Static HTML Template

Creates a simple project:

```
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

```
pnpm dlx create-vite@latest . --template react --no-interactive
```

Dependencies are installed later using **Install**.

---

## Next.js Template

Command executed:

```
pnpm create next-app@latest . --yes
```

Next.js installs dependencies during generation.

Generation therefore takes longer than other templates.

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

Preview starts the project runtime.

Static → internal static server
Framework → pnpm dev

Preview logs stream into the Preview Runner panel.

---

# Open

Open launches the running preview in the browser.

Example URLs:

[http://localhost:3000](http://localhost:3000)
[http://127.0.0.1:4173](http://127.0.0.1:4173)

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

Deploy guidance is now aware of the detected project type.

Current examples:

### Static HTML

Project type:
Static HTML

Recommendation:
Good fit: Netlify or Vercel

### Vite + React

Project type:
Vite + React

Recommendation:
Good fit: Netlify or Vercel

### Next.js

Project type:
Next.js

Recommendation:
Recommended: Vercel

This is guidance, not a restriction.

Users can still choose either provider.

---

# Services → Backend → Supabase

Supabase provides:

* hosted database
* authentication
* storage
* API services

KForge helps connect a project to Supabase through **guided setup assistance**.

Workflow:

Open Folder
Services
Backend
Supabase

---

# Supabase Quick Connect

KForge now includes **Supabase Quick Connect**.

Quick Connect performs a guided setup check and helps prepare the project for Supabase usage.

Quick Connect verifies:

* environment variables
* Supabase client library
* Supabase configuration
* client file presence

If issues are detected, the panel suggests the next step required.

This allows beginners to connect Supabase **without remembering the full setup process**.

---

# Supabase Setup Assistant

The Supabase panel acts as a **guided checklist**.

Typical actions available:

* Quick Connect
* Check Supabase setup
* Create `.env` file
* Install Supabase client
* Create Supabase client file
* Open Supabase dashboard

---

# What the Supabase check looks for

When Quick Connect or **Check Supabase setup** runs, KForge inspects the project for:

* environment files such as `.env`, `.env.local`, `.env.development`, `.env.example`
* whether `SUPABASE_URL` has a value
* whether `SUPABASE_ANON_KEY` has a value
* whether `VITE_SUPABASE_URL` has a value
* whether `VITE_SUPABASE_ANON_KEY` has a value
* local Supabase configuration (`supabase/config.toml`)
* Supabase client library presence in `package.json`
* existence of a client file such as `src/lib/supabase.js`

Empty values such as:

```
SUPABASE_URL=
```

are treated as **not configured**.

---

# Cloud vs Local Supabase

KForge supports both:

### Cloud Supabase

Typical project URL:

[https://your-project.supabase.co](https://your-project.supabase.co)

Connection values are copied from the Supabase dashboard.

---

### Local Supabase

Local development may use:

[http://127.0.0.1:54321](http://127.0.0.1:54321)

If a local Supabase project is detected, KForge recognizes the configuration automatically.

---

## Starting a Local Supabase Stack

Local Supabase projects are usually created with the **Supabase CLI**.

To start the local development stack, run:

```
npx supabase start
```

This command launches the local Supabase services using Docker.

When the stack starts, the CLI prints important connection values such as:

* API URL
* Studio URL
* Database connection string
* anon public key

Example output:

```
API URL: http://127.0.0.1:54321
Studio URL: http://127.0.0.1:54323
anon key: eyJhbGciOiJIUzI1NiIs...
```

These values are what your application should place into the `.env` file.

---

# Supabase Environment Variables

## SUPABASE_URL

The address of the Supabase project.

Cloud example:

[https://your-project.supabase.co](https://your-project.supabase.co)

Local example:

[http://127.0.0.1:54321](http://127.0.0.1:54321)

---

## SUPABASE_ANON_KEY

Public API key used by frontend applications.

For cloud projects this key is copied from the Supabase dashboard.

For local projects the key is printed when running:

```
npx supabase start
```

---

## VITE_SUPABASE variables

Vite-based frontend apps typically use:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

These variables are exposed to the browser by Vite.

KForge checks for both naming styles.

---

# .env.example and .env help

KForge helps with both files.

### .env.example

If `.env.example` does not exist, KForge can generate one with Supabase placeholders.

### Create `.env` file

If `.env` does not exist:

KForge copies `.env.example` → `.env`.

If `.env` already exists, it is not overwritten.

---

# Install Supabase client

The panel includes:

Install Supabase client

This runs:

```
pnpm add @supabase/supabase-js
```

The installation is executed through a shell path designed to work reliably on Windows.

---

# Create Supabase client file

The panel can generate a client file:

```
src/lib/supabase.js
```

Example:

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

If the file already exists, KForge leaves it unchanged.

---

# Supabase Activity Log

Supabase actions write to the **Supabase service log**.

Log behavior:

* actions start a visible log section
* sections are separated visually
* timestamps are included
* commands are easier to distinguish

This improves readability when running multiple setup actions.

---

# Supabase Dashboard

The panel includes:

Open Supabase

This opens the Supabase dashboard where users normally copy:

* project URL
* anon key

---

# New Project

New Project supports:

* creating a local project
* importing from GitHub

Import from GitHub clones the selected repository into the chosen parent folder and opens it automatically in KForge.

---

# AI Models and Provider Behavior

KForge supports multiple AI providers.

Different models have **different strengths and behaviors**.

Some models are optimized for reasoning and tool use, while others are optimized for speed and conversation.

---

## Why Groq / Llama / Mixtral still matter

### Speed (Groq’s strength)

Groq models are extremely fast.

Typical latency:

| Provider | Typical Speed            |
| -------- | ------------------------ |
| Groq     | ⚡ 20–50 tokens/sec       |
| OpenAI   | ~5–15 tokens/sec         |
| Claude   | slower but very accurate |

This makes Groq excellent for:

* brainstorming
* code explanations
* UI ideas
* quick conversations
* rapid iteration

---

### Cost and accessibility

Groq is often:

* free
* extremely inexpensive

This makes it useful for:

* beginners
* experimentation
* fast iteration
* non-critical tasks

---

### Model diversity

Different models are good at different tasks.

Example:

| Model type      | Best use                 |
| --------------- | ------------------------ |
| GPT-4o / Claude | tool-driven agents       |
| Groq Llama      | fast chat                |
| Mixtral         | reasoning                |
| small models    | inexpensive autocomplete |

KForge becomes more powerful when **multiple models are available**.

---

## Practical KForge usage guidance

For best results:

| Task                     | Suggested provider |
| ------------------------ | ------------------ |
| Chat / brainstorming     | Groq               |
| Tool-based agent actions | OpenAI / Claude    |
| Code reasoning           | either             |

This allows users to balance:

* speed
* cost
* reliability

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


