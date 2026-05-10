[← Docs home](index.md)

# Workspace Awareness

Workspace Awareness is KForge’s ability to use the currently open project structure as context when helping you.

It helps KForge understand the project that is already open, without pretending that it has read every file.

## What KForge can use

When a project folder is open, KForge can use information from the already-loaded project tree, such as:

- visible folders
- visible filenames
- likely app folders
- likely entry files
- common config files
- package-manager lockfiles
- project kind hints
- template detection hints

This helps KForge avoid inventing files or folders that do not match your project.

## What KForge does not automatically do

Workspace Awareness does **not** mean KForge has automatically read every file.

By default, Workspace Awareness is based on names and structure from the loaded project tree.

KForge should not claim to know file contents unless the file has actually been opened, provided, or inspected through an approved tool action.

Workspace Awareness also does not automatically parse `package.json`, install dependencies, run commands, or change files.

## Why this matters

Workspace Awareness helps KForge give better project guidance.

For example, it can help KForge:

- notice whether a project looks like React, Vite, Next.js, Tauri, static HTML, or another supported shape
- suggest likely files to inspect before editing
- prefer existing files over invented paths
- guide you toward Preview, Services, Terminal, or file editing depending on the task
- avoid treating an empty folder like a real app

## Inspect before editing

For implementation tasks, KForge should prefer inspecting likely existing files before writing changes.

This is especially important when the target file is not already clear.

A good flow is:

1. use the visible project structure to choose a likely file or folder
2. inspect the relevant file or folder
3. make a small targeted edit
4. avoid creating alternative files unless the project really needs them

## Workspace Awareness vs Project Memory

Workspace Awareness and Project Memory are different.

**Workspace Awareness** comes from the currently open project structure.

**Project Memory** stores user-approved notes, rules, decisions, and working context for the project.

Workspace Awareness helps KForge understand what exists now.

Project Memory helps KForge remember durable project preferences over time.

## Workspace Snapshot

KForge also keeps a compact Workspace Snapshot internally.

The snapshot summarizes facts KForge already knows from the loaded project tree, such as project root, detected template, detected project kind, and visible item counts.

It is read-only foundation context.

It does not read file contents, parse `package.json`, execute tools, or replace the more detailed workspace guidance blocks.

## Simple rule

Workspace Awareness helps KForge be more project-aware, but it should stay truthful.

If KForge has only seen filenames and folders, it should treat them as hints.

If KForge needs file contents to make a safe edit, it should inspect the file first.

[← Docs home](index.md)
