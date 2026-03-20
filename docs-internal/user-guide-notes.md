
# User Guide Notes (development capture)

Last Updated: March 20th, 2026

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

## Static Projects

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

When detected, KForge may display wording such as:

```text
Static HTML/CSS/JS project detected
```

or a similar static-project message.

For static-only projects, the **Install** action should not be shown as part of the normal workflow.

---

## Framework Projects

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

Currently recognized framework-oriented templates include:

```text
Vite + React
Next.js
```

If KForge can identify the framework from project signals, it may display a message such as:

```text
Next.js project detected
```

If the framework cannot be identified precisely, KForge still falls back to the broader package-project workflow.

Additional frameworks may be added in future versions.

---

# Generate

Generate creates a **starter template project** inside the opened workspace folder.

Current templates supported:

```text
Static HTML/CSS/JS
Vite + React
Next.js
```

Template generation is driven by the **Template Registry**, which acts as the source of truth for available templates and their metadata.

This allows KForge to grow template support without hardcoding generation logic everywhere in the UI.

---

## Static HTML/CSS/JS Template

This template creates a simple non-package starter project.

Generated files currently include:

```text
index.html
styles.css
script.js
```

Characteristics:

* no dependency install required
* can be previewed immediately
* suitable for simple websites and experiments

Workflow:

```text
Generate
Preview
Open
```

Typical generation log flow:

```text
Generating Static HTML starter...
Created: index.html, styles.css, script.js
Ready: Static HTML does not need Install. Click Preview, then Open.
```

---

## Vite + React Template

Command executed:

```text
pnpm dlx create-vite@latest . --template react --no-interactive
```

Example generated files:

```text
package.json
vite.config.js
index.html
src/main.jsx
src/App.jsx
src/App.css
```

Dependencies are **installed later using the Install button**.

Generation is very fast.

---

## Next.js Template

Command executed:

```text
pnpm create next-app@latest . --yes
```

Next.js scaffolding automatically installs dependencies during generation.

This means:

* generation takes longer than Vite templates
* a larger dependency tree is created
* installation is usually **already complete when generation finishes**

This behavior is normal for Next.js.

---

## Workspace Root Behavior

Generate always creates files **directly inside the opened workspace folder**.

Example:

```text
D:\workspace\my-project
├ src
├ package.json
├ vite.config.js
└ index.html
```

No nested project folder is created.

This ensures that:

```text
AI editing
Preview runtime
Filesystem tools
Explorer tree
```

all operate on the same root.

---

## Template Registry

Templates are defined through a **Template Registry**.

The registry provides:

* template metadata
* scaffold commands
* preview compatibility
* installation expectations
* detection hints

This helps KForge remain scalable as more templates are added later.

Possible future additions may include:

```text
Astro
Vue + Vite
Expo / React Native
```

---

# Install

Install installs project dependencies.

Typical command executed:

```text
pnpm install
```

Install is:

* required for many framework projects
* **not required for static projects**

Some scaffolds, such as **Next.js**, may install dependencies during generation.

Running Install again in those cases is harmless but usually unnecessary.

For **Static HTML/CSS/JS**, the intended workflow is to skip Install entirely and move directly to Preview.

---

# Preview

Preview starts the project runtime.

Depending on project type:

```text
Static site → internal static server
Framework project → pnpm dev
```

Preview logs are streamed to the Preview Runner panel.

KForge may also display a project detection summary before or during preview, such as:

```text
Next.js project detected
Vite + React project detected
```

This is intended to make the runtime feel framework-aware rather than generic.

---

# Open

Open launches the running preview in the user's default browser.

Examples:

```text
http://localhost:5173
http://127.0.0.1:56566/
```

The preview URL is automatically detected from server logs.

---

# Stop

Stop terminates the running preview process.

This safely shuts down the development server or static preview server.

---

# Clear

Clear removes the current preview logs from the Preview Runner panel.

This does not affect the running preview process.

---

# Terminal

KForge also provides a **Terminal** panel for simple command execution inside the active project root.

Behavior:

* one command runs at a time
* stdout/stderr logs stream into the panel
* commands run in the current workspace/project folder

On Windows, shell commands are executed in a way that supports built-ins such as:

```text
dir
echo hello
```

Examples that have been validated:

```text
node -v
git status
dir
```

---

# Services

KForge also includes a **Services** panel as the foundation for future guided external integrations.

Current purpose:

* provide a shared place for future service connections
* avoid one-off integration UIs and runtimes
* prepare KForge for services such as Supabase, Stripe, OpenAI, GitHub, and deploy providers

At this stage, the Services panel is **architectural groundwork**.

It does **not** yet perform real service connection or setup.

Current behavior:

* displays known service entries
* shows simple status badges
* shows declared environment variable names
* allows placeholder setup actions for available services
* streams service log output into the panel

Current visible placeholder services include:

```text
Supabase
Stripe
OpenAI
```

User mental model:

```text
Services = future guided setup for external infrastructure
```

Not:

```text
Services = full infrastructure dashboard
```

---

# Preview, Terminal, and Services Panel Behavior

Preview, Terminal, and Services are separate collapsible panels that share the same runtime area.

Behavior:

```text
Open Preview → Terminal closes, Services closes
Open Terminal → Preview closes, Services closes
Open Services → Preview closes, Terminal closes
```

They are not shown side-by-side in split mode.

This keeps the runtime area focused on one active task at a time.

---

# Tip

If preview appears not to update:

* ensure preview is running
* ensure files are inside the opened workspace folder

KForge uses a **single project root**, meaning:

```text
AI edits
Preview runtime
Filesystem tools
Explorer tree
Future service setup
```

all operate on the same folder.

---

# Current User-Facing Preview Model

Users do not need to think in implementation details, but current behavior can be understood as:

```text
Open folder
KForge detects project type
KForge offers the correct workflow
KForge identifies the framework when possible
```

Practical examples:

```text
index.html only → preview immediately
package.json project → install, then preview
next dependency found → Next.js project detected
vite + react found → Vite + React project detected
```

---

# Current User-Facing Services Model

Users do not need to think in architecture, but the current Services behavior can be understood as:

```text
Open folder
Open Services
See available/planned integrations
Trigger guided setup later as integrations are implemented
```

Practical examples for future intent:

```text
Connect Supabase
Connect Stripe
Connect OpenAI
Publish to GitHub
Deploy to Vercel / Netlify
```

For now, the panel exists to establish this workflow shape early without yet performing real integration work.

```


```
