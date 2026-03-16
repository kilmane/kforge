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
### Preview Root Selection

The Preview Runner can run from two different locations:

- **Base Folder** = the folder originally opened in KForge
- **Generated Template** = the nested project folder created by **Generate**

Typical usage:

**Base Folder**

Use this when the project already exists in the opened folder, or when the AI is creating/editing files directly in that opened workspace.

Example flow:

Open Folder  
AI creates or edits files  
Install  
Preview  
Open

In this workflow, preview should normally run from **Base Folder**.

**Generated Template**

Use this when the user clicks **Generate** and KForge creates a starter app in a nested folder such as:

```text
D:\workspace\my-project\my-react-app

Example flow:

Open Folder
Generate
Install
Preview
Open

In this workflow, preview should normally run from Generated Template.

Tip:

If preview appears to run the wrong project, check Active Preview Root in the Preview panel and switch between Base Folder and Generated Template.

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

----

Of course captain ⚓ — good idea to document this early before users get confused like we did during testing.

Here are **clean user-manual notes** you can drop into your docs.

---

# 📘 Preview Runner — Base vs Generated

The Preview Runner can run your app from two different locations depending on how the project was created.

You will see these options in the Preview panel:

```text
Use:
Base     Generated
```

These buttons choose **which folder the preview server runs from**.

---

# Base

**Base** is the folder you originally opened in KForge.

Example:

```text
D:\kforge-workspaces\test-captain-dance
```

This is the normal choice when:

* you are **vibe coding**
* the AI is creating files directly in the opened folder
* your project already exists
* you are editing an existing project

Typical workflow:

```text
Open folder
Prompt the AI
AI creates files
Install
Preview
Open
```

In this workflow you should normally use:

```text
Base
```

---

# Generated

**Generated** is the folder created automatically when you use the **Generate** button in the Preview Runner.

For example, when generating a Vite template KForge may create:

```text
D:\kforge-workspaces\test-captain-dance\my-react-app
```

This becomes the **Generated project folder**.

Use **Generated** when:

* you created a project using **Generate**
* the template created a **nested project folder**
* the preview server should run from the generated template project

Typical workflow:

```text
Open folder
Generate template
Install
Preview
Open
```

In this workflow you should normally use:

```text
Generated
```

---

# Why this exists

Some project generators create a **new project folder inside the folder you opened**.

Example:

```text
Opened folder
D:\workspace\my-project

Generated project
D:\workspace\my-project\my-react-app
```

KForge lets you choose whether Preview should run from:

* the **original folder (Base)**
  or
* the **generated project folder (Generated)**

---

# Tip

If your app does not update or the preview seems to run the wrong project, check that the correct option is selected:

```text
Use: Base / Generated
```

Switching the preview root can resolve many preview issues.

---

If you want, next time we can also write the **Preview Runner section of the user manual**, which will explain the full flow:

```
Generate
Install
Preview
Open
Stop
Reset
```

That will save you a lot of documentation work later.
