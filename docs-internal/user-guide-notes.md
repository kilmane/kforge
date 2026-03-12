D:\kforge\docs-internal\user-guide-notes.md

# User Guide Notes (development capture)

These notes record user-facing behaviours during development so they are not forgotten when writing the official guide.
Below some suggested sections, which is likely to grow and also, each section grows slowly during development

AI Panel  
Preview Runner  
Explorer  
Focus Mode  
AI Editing  
Templates  
Settings  
Dev Tools  

---

## Preview Runner

Behaviour:

Opening a project folder automatically disables Focus Mode so the file explorer becomes visible.

This allows the user to navigate the project tree.

When the user clicks **Preview**, KForge automatically switches back to **Focus Mode** so the Preview Runner panel is fully visible.

User mental model:

Open Folder → explore files  
Preview → focus on the running app

This behaviour is intentional and avoids manual layout switching.

---

### Preview Runner Controls

The Preview Runner manages the local development server used to run the project.

Typical workflow:

Open Folder → Install → Preview → Open

Buttons:

**Generate**

Creates a starter template project inside the workspace.

This is mainly used when the workspace folder is empty and the user wants a starting point.

Example generated files may include:

package.json
vite.config.js
index.html
src/main.jsx
src/App.jsx
src/App.css


Generate is mostly used in two situations:

1. **Developer testing during KForge development**

   Used by the KForge developer to quickly create a minimal template in order to test the preview runner itself.

2. **User starting a new project without AI**

   If a user opens an empty folder and wants a quick starter template, they can click **Generate** instead of asking the AI to create the project.

However, most **vibe-coding workflows will not require Generate**, because the AI will usually create the project files directly.

Example AI workflow:

Open folder
Prompt AI: "Create a minimal React app"
AI generates files
Install
Preview
Open


In that scenario the **Generate button is not needed**.

---

**Install**

Installs project dependencies.

This usually runs:

pnpm install


(or npm depending on configuration)

Install reads the project's `package.json`.

---

**Preview**

Starts the development server.

For a Vite project this typically runs:

pnpm dev


This launches the application locally.

---

**Open**

Opens the running preview in the user's default browser.

Example:

http://localhost:5173


---

**Stop**

Stops the running development server.

---

**Clear**

Clears the preview runner log output.