# KForge — Preview Runner

The **Preview Runner** allows you to generate and run local web applications directly from inside KForge.

It is designed for fast experimentation with modern JavaScript frameworks such as **Vite + React**.

---

# Overview

The Preview Runner provides three main capabilities:

1. **Generate** a project (example: Vite + React)
2. **Install dependencies**
3. **Run the development server**

All logs are streamed directly into the KForge UI.

---

# Typical Workflow

1. Open a folder in KForge

```
File → Open Folder
```

2. Generate a Vite React project

```
Preview panel → Generate
```

Example project name:

```
my-react-app
```

This runs internally:

```
pnpm create vite@latest my-react-app -- --template react
```

3. Install dependencies

```
Install
```

This runs:

```
pnpm install
```

inside the generated project.

4. Start the preview server

```
Preview
```

This runs:

```
pnpm dev
```

The development server URL (usually `http://localhost:5173`) will appear automatically in the Preview panel.

You can open it using:

```
Open
```

or by clicking the URL pill.

---

# Status Indicators

The Preview panel shows several states:

| Status       | Meaning                        |
| ------------ | ------------------------------ |
| `idle`       | nothing running                |
| `installing` | dependencies being installed   |
| `running`    | dev server active              |
| `scaffold:*` | project generation in progress |

---

# Logs

All stdout and stderr output from the preview process is streamed into the panel.

Examples:

```
Running: pnpm install
Running: pnpm dev
```

Vite will print:

```
Local: http://localhost:5173
```

The URL is automatically detected and made clickable.

---

# Process Management

When a preview server is started, KForge launches a process chain similar to:

```
pnpm
 └ node
    └ vite
```

When **Stop** is pressed, KForge terminates the entire process tree to prevent orphan processes.

---

# Windows Process Handling

On Windows, stopping the preview uses:

```
taskkill /PID <pid> /T /F
```

This ensures that:

* all child processes are terminated
* the dev server is fully stopped
* folders are not locked by leftover Node.js processes

---

# Troubleshooting

## Folder cannot be deleted

If a generated project folder cannot be deleted, it usually means the preview server is still running.

Solution:

1. Press **Stop** in the Preview panel.
2. Wait a few seconds.
3. Retry deletion.

---

## Install fails with `ERR_PNPM_NO_PKG_MANIFEST`

This happens when **Install** is run in a folder that does not contain a `package.json`.

Make sure the target folder is the generated project folder.

Example:

```
Target: D:\projects\my-react-app
```

---

## Preview server not opening

If the preview server starts but no browser opens:

* check the logs for the `Local:` URL
* click the **Open** button
* or click the URL pill

---

# Current Supported Templates

Currently supported:

* **Vite + React**

Future templates may include:

* Next.js
* Svelte
* Vue
* full-stack project generators

---

# Notes

The Preview Runner is intended for **development preview only**.

It does not perform production builds or deployments.
