
# User Guide Notes (development capture)

Last Updated: March 25th, 2026

Location:
D:\kforge\docs-internal\user-guide-notes.md

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

index.html  
styles.css  
script.js

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

pnpm install  
pnpm dev

Currently recognized framework templates include:

Vite + React  
Next.js

---

# Generate

Generate creates a **starter template project** inside the opened workspace folder.

Current templates supported:

Static HTML/CSS/JS  
Vite + React  
Next.js

Template generation is driven by the **Template Registry**.

---

## Static HTML Template

Creates a simple project:

index.html  
styles.css  
script.js

Workflow:

Generate  
Preview  
Open

No dependency installation required.

---

## Vite + React Template

Command executed:

pnpm dlx create-vite@latest . --template react --no-interactive

Dependencies are installed later using **Install**.

---

## Next.js Template

Command executed:

pnpm create next-app@latest . --yes

Next.js installs dependencies during generation.

Generation therefore takes longer than other templates.

---

# Install

Install installs project dependencies.

Command used:

pnpm install

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

http://localhost:3000  
http://127.0.0.1:4173

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

The panel is task-first and only shows one active provider at a time.

This keeps the surface calmer as integrations expand.

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

KForge does not expose advanced hosting dashboards inside the app.

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

## Provider Hint Style

Deploy hint text stays short and calm.

Examples:

* Good fit for static sites.
* Good fit for this project.
* Recommended for Next.js projects.
* Next.js usually fits best on Vercel.

This keeps KForge helpful without turning the deploy surface into a hosting tutorial.

---

# Services → Backend → Supabase

Supabase is a backend platform that can provide a hosted database, authentication, storage, and API services for your project.

In KForge, the Supabase panel is designed to help a beginner connect a project without having to remember every file and value manually.

The current Supabase workflow is:

Open Folder  
Services  
Backend  
Supabase

From there, KForge provides **guided setup assistance**.

---

# Supabase Setup Assistant

The Supabase panel now acts as a **guided checklist**.

Instead of only reporting diagnostics, KForge helps users complete the next steps required to connect their app.

Typical actions available:

* Check Supabase setup
* Create `.env` file
* Install Supabase client
* Create Supabase client helper file
* Open Supabase dashboard

---

# What the Supabase check looks for

When the user runs:

**Check Supabase setup**

KForge checks the current project for common Supabase connection signs.

Current checks include:

* environment files such as `.env`, `.env.local`, `.env.development`, `.env.example`
* `SUPABASE_URL`
* `SUPABASE_ANON_KEY`
* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`
* local Supabase config at `supabase/config.toml`
* Supabase client library presence in `package.json`
* existence of a helper file such as `src/lib/supabase.js`

This gives the user a quick picture of whether the project is ready to connect.

---

# Supabase Environment Variables

## SUPABASE_URL

`SUPABASE_URL` is the address of your Supabase project.

Cloud example:

https://your-project.supabase.co

Local example:

http://127.0.0.1:54321

---

## SUPABASE_ANON_KEY

`SUPABASE_ANON_KEY` is the public API key your frontend uses to talk to Supabase.

This key is normally copied from the Supabase dashboard.

---

## VITE_SUPABASE variables

For **Vite-based frontend projects**, browser code usually reads:

```

VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

```

These are environment variables exposed to the browser by Vite.

KForge now checks for these as well.

---

# .env.example and .env help

KForge helps with both files.

### .env.example

If `.env.example` does not exist, KForge can generate one containing Supabase connection placeholders.

### Create .env file

The panel includes:

Create `.env` file

If `.env` does not exist, KForge copies `.env.example` to `.env`.

If `.env` already exists, KForge leaves it unchanged.

This removes a common beginner friction point.

---

# Install Supabase client

The panel includes:

**Install Supabase client**

This runs:

pnpm add @supabase/supabase-js

This installs the official Supabase JavaScript client used by frontend applications.

---

# Create Supabase client file

The panel also includes:

**Create Supabase client file**

This generates a helper file such as:

```

src/lib/supabase.js

```

Example content:

```

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;

const supabaseAnonKey =
import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

```

If the file already exists, KForge leaves it unchanged.

---

# Beginner Supabase Flow

A beginner-friendly connection flow is now:

1. Open the project in KForge
2. Services → Backend → Supabase
3. Click **Check Supabase setup**
4. Click **Create .env file** if needed
5. Copy connection values from Supabase
6. Paste values into `.env`
7. Click **Install Supabase client**
8. Click **Create Supabase client file**
9. Import the client into your app code

---

# Supabase Dashboard

The panel includes:

Open Supabase

This opens the Supabase dashboard in the browser.

This is where users normally copy:

* project URL
* anon key

---

# New Project

New Project supports both:

* create a local project
* import from GitHub

Import from GitHub clones the selected repository into the chosen parent folder and opens it automatically in KForge.

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
```

---

