

# Full File Replacement

`D:\kforge\docs-internal\user-guide-notes.md`

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

## Static Projects

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

## Framework Projects

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

```

Vite + React
Next.js

```

---

# Generate

Generate creates a **starter template project** inside the opened workspace folder.

Current templates supported:

```

Static HTML/CSS/JS
Vite + React
Next.js

```

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

```

Generate
Preview
Open

```

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

```

Static → internal static server
Framework → pnpm dev

```

Preview logs stream into the Preview Runner panel.

---

# Open

Open launches the running preview in the browser.

Example URLs:

```

[http://localhost:5173](http://localhost:5173)
[http://127.0.0.1:56566/](http://127.0.0.1:56566/)

```

---

# Stop

Stops the running preview server.

---

# Clear

Clears preview logs.

---

# Terminal

KForge includes a **Terminal panel**.

Runs commands in the active project root.

Examples:

```

node -v
git status
dir

```

---

# Services

KForge includes a **Services panel** for connecting projects to external tools.

Mental model:

```

Services = guided infrastructure setup

```

Not a full DevOps dashboard.

---

# Services Panel Layout

Services are grouped by **task**.

```

Code
Deploy
Backend
Payments

```

Example structure:

```

Code → GitHub
Deploy → Vercel / Netlify
Backend → Supabase
Payments → Stripe

```

Only **one service panel is visible at a time**.

---

# GitHub Integration

GitHub is currently the first fully implemented service.

Capabilities:

```

Publish repository
Push changes
Pull latest
Open on GitHub
Import repository

```

---

# GitHub Publishing

Used when a project exists locally and should be published to GitHub.

Workflow:

```

Open folder
Services → Code → GitHub
Enter repository name
Choose visibility
Click Publish

```

KForge runs:

```

git init
git add .
git commit
git branch -M main
gh repo create
git push

```

Requirements:

```

git installed
GitHub CLI (gh)
gh auth login

```

---

# GitHub Service Actions

### Publish

Create a new GitHub repository from the local project.

```

Local → GitHub

```

---

### Push changes

Upload local commits.

```

Computer → GitHub

```

---

### Pull latest

Download remote changes.

```

GitHub → Local project

```

---

### Open on GitHub

Opens the repository webpage.

---

# Import From GitHub

Used when the project does **not yet exist locally**.

Workflow:

```

New Project
Select Import from GitHub
Paste repo URL
Choose location
Project opens automatically

```

---

# Deploying a Project

KForge now supports **guided deployment entry points**.

Location:

```

Services → Deploy

```

Available providers:

```

Vercel
Netlify

```

Deployment requires the project to already be connected to GitHub.

Typical workflow:

```

Create or open project
Publish to GitHub
Push changes
Services → Deploy
Choose provider

```

KForge opens the provider import page.

---

## Deploy with Vercel

When selecting **Deploy → Vercel**, KForge opens:

```

[https://vercel.com/new/clone](https://vercel.com/new/clone)

```

The GitHub repository is pre-selected.

Typical steps on Vercel:

```

Confirm repo
Choose framework preset
Click Deploy

```

Vercel automatically detects frameworks such as:

```

Next.js
Vite
React

```

---

## Deploy with Netlify

When selecting **Deploy → Netlify**, KForge opens:

```

[https://app.netlify.com/start](https://app.netlify.com/start)

```

Typical steps:

```

Import existing project
Choose GitHub
Select repository
Deploy

```

---

## Push Before Deploying

If the repository exists but **has no commits yet**, KForge shows a hint:

```

Push changes before deploying

```

This ensures the deploy platform has code available.

---

# Services Panel Persistence

The Services panel remembers temporary state such as:

```

repository name input
service logs
active service tab

```

State resets when the workspace changes.

---

# Panel Behavior

Preview, Terminal, and Services share the runtime area.

Only one is visible at a time.

```

Open Preview → others close
Open Terminal → others close
Open Services → others close

```

---

# New Project

Two creation paths exist.

### Create Local Project

```

New Project
Enter name
Choose location

```

---

### Import From GitHub

```

New Project
Choose Import
Paste repo URL

```

---

# Tip

If preview does not update:

```

Ensure preview is running
Ensure files are inside the opened project folder

```

KForge uses a **single project root** for:

```

AI edits
Preview
Filesystem tools
Explorer
Services

```

---

# Current User Mental Model

Preview:

```

Open folder
Preview
Open browser

```

Services:

```

Open folder
Services
Choose task
Run guided action

```

GitHub:

```

Started locally → Publish
Already connected → Push / Pull
Need browser → Open on GitHub
Have remote repo → Import

```

Deploy:

```

Publish to GitHub
Push code
Services → Deploy
Choose Vercel or Netlify

```

---

# User Guide Direction

These notes will become the **first official KForge user guide**.

Major sections likely needed:

```

Project creation
Template generation
Preview workflow
Terminal usage
Services panel
GitHub workflows
Deployment workflows

```

This document currently acts as the **source material for that guide**.
```

---

