D:\kforge\docs-internal\user-guide-notes.md
# User Guide Notes (development capture)

Location:
D:\kforge\docs-internal\user-guide-notes.md

These notes capture user-facing behavior during development.

Sections will later become part of the official user guide.

---

## Preview Runner

Behavior:

Opening a project folder automatically disables **Focus Mode** so the Explorer becomes visible.

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

The workflow depends on the project type.

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
style.css
script.js


---

## Framework Projects

Framework projects use a development server.

Example indicators:


package.json


Workflow:


Open Folder
Install
Preview
Open


Example commands executed:


pnpm install
pnpm dev


---

# Generate

Creates a starter template project using Vite.

Example generated files:


package.json
vite.config.js
index.html
src/main.jsx
src/App.jsx
src/App.css


Important behavior:

Generate creates files **directly inside the opened workspace folder**.

Example:


D:\workspace\my-project
├ src
├ package.json
├ vite.config.js
└ index.html


No nested folder is created.

---

## Future Direction

The **Generate button will eventually become the Template Picker**.

Example future interface:


Generate
├ Static HTML site
├ React (Vite)
├ Next.js
├ Vue
└ Svelte


Templates will be driven by the **Template Registry**.

---

# Install

Installs project dependencies.

Typically runs:


pnpm install


Install is **not required for static projects**.

---

# Preview

Starts the project preview.

Depending on project type:


Static site → internal static server
Framework project → pnpm dev


---

# Open

Opens the running preview in the user's default browser.

Example:


http://localhost:5173


---

# Stop

Stops the running preview server.

---

# Clear

Clears preview runner logs.

---

# Tip

If preview appears not to update:

* ensure preview is running
* ensure files are inside the opened workspace folder

KForge uses a **single project root**, meaning:


AI edits
Preview runtime
Filesystem tools
Explorer tree


all operate on the same folder.