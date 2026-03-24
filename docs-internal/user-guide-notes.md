
### `docs-internal/user-guide-notes.md`

```markdown
# User Guide Notes (development capture)

Last Updated: March 24th, 2026

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


