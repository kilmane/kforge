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

```
Open Folder → Explore files
Preview → Focus on running app
```

---

# Preview Runner Controls

The Preview Runner manages the local development server used to run the project.

Typical workflow:

```
Open Folder → Install → Preview → Open
```

---

## Generate

Creates a starter template project using Vite.

This is mainly used when the workspace folder is empty and the user wants a starting point.

Example generated files:

```
package.json
vite.config.js
index.html
src/main.jsx
src/App.jsx
src/App.css
```

Important behavior:

Generate creates files **directly inside the opened workspace folder**.

Example:

```
D:\workspace\my-project
 ├ src
 ├ package.json
 ├ vite.config.js
 └ index.html
```

No nested folder is created.

---

## Typical Uses for Generate

1️⃣ **Developer testing**

During KForge development the Generate button provides a quick way to create a test template.

2️⃣ **User starting a new project without AI**

If a user opens an empty folder and wants a quick starting template.

---

## AI Alternative Workflow

In many cases **Generate is not required**.

Example AI workflow:

```
Open folder
Prompt AI: "Create a minimal React app"
AI generates files
Install
Preview
Open
```

In this workflow the AI creates the project structure directly.

---

## Install

Installs project dependencies.

Typically runs:

```
pnpm install
```

Install reads the project's `package.json`.

---

## Preview

Starts the development server.

For Vite projects this usually runs:

```
pnpm dev
```

This launches the application locally.

---

## Open

Opens the running preview in the user's default browser.

Example:

```
http://localhost:5173
```

---

## Stop

Stops the running development server.

---

## Clear

Clears the preview runner log output.

---

# Preview Workflow Summary

Typical workflow for a generated template:

```
Open Folder
Generate
Install
Preview
Open
```

Typical workflow for AI-driven development:

```
Open Folder
Prompt AI
AI writes files
Install
Preview
Open
```

---

# Tip

If preview appears not to update after editing files:

* ensure the preview server is running
* ensure files were written inside the opened workspace folder

KForge uses a **single project root**, so the preview server, filesystem tools, and AI editing all operate on the same folder.
