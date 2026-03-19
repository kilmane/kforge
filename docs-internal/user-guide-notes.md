
# User Guide Notes (development capture)

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
````

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
style.css
script.js
```

When detected, KForge may display wording such as:

```
Static HTML/CSS/JS project detected
```

or a similar static-project message.

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

Currently recognized framework-oriented templates include:

```
Vite + React
Next.js
```

If KForge can identify the framework from project signals, it may display a message such as:

```
Next.js project detected
```

If the framework cannot be identified precisely, KForge still falls back to the broader package-project workflow.

Additional frameworks may be added in future versions.

---

# Generate

Generate creates a **starter template project** inside the opened workspace folder.

Current templates supported:

```
Static HTML/CSS/JS
Vite + React
Next.js
```

Template generation is now driven by the **Template Registry**, which acts as the source of truth for available templates and their metadata.

This allows KForge to grow template support without hardcoding generation logic everywhere in the UI.

---

## Static HTML/CSS/JS Template

This template creates a simple non-package starter project.

Typical files may include:

```
index.html
style.css
script.js
```

Characteristics:

* no dependency install required
* can be previewed immediately
* suitable for simple websites and experiments

Workflow:

```
Generate
Preview
Open
```

---

## Vite + React Template

Command executed:

```
pnpm dlx create-vite@latest . --template react --no-interactive
```

Example generated files:

```
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

```
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

```
D:\workspace\my-project
├ src
├ package.json
├ vite.config.js
└ index.html
```

No nested project folder is created.

This ensures that:

```
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

```
Astro
Vue + Vite
Expo / React Native
```

---

# Install

Install installs project dependencies.

Typical command executed:

```
pnpm install
```

Install is:

* required for many framework projects
* **not required for static projects**

Some scaffolds (such as **Next.js**) may install dependencies during generation.

Running Install again in those cases is harmless but usually unnecessary.

---

# Preview

Preview starts the project runtime.

Depending on project type:

```
Static site → internal static server
Framework project → pnpm dev
```

Preview logs are streamed to the Preview Runner panel.

KForge may also display a project detection summary before or during preview, such as:

```
Next.js project detected
Vite + React project detected
```

This is intended to make the runtime feel framework-aware rather than generic.

---

# Open

Open launches the running preview in the user's default browser.

Example:

```
http://localhost:5173
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

# Tip

If preview appears not to update:

* ensure preview is running
* ensure files are inside the opened workspace folder

KForge uses a **single project root**, meaning:

```
AI edits
Preview runtime
Filesystem tools
Explorer tree
```

all operate on the same folder.

---

# Current User-Facing Preview Model

Users do not need to think in implementation details, but current behavior can be understood as:

```
Open folder
KForge detects project type
KForge offers the correct workflow
KForge identifies the framework when possible
```

Practical examples:

```
index.html only → preview immediately
package.json project → install, then preview
next dependency found → Next.js project detected
vite + react found → Vite + React project detected
```

```


```
