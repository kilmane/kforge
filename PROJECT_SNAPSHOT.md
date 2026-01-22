PROJECT_SNAPSHOT — kforge

Last updated: 2026-01-22 (Phase 3.6.x)

This file is the canonical project context and operational reference.

If something conflicts with memory, chat history, or assumptions — this file wins.

Overview

kforge is a desktop-first developer workspace with an AI assistant, secure filesystem control, and a modular, calm UI philosophy.

Current focus:
Phase 3.6 — MCPs / tool integration on top of a stable editor and AI panel foundation.

Backup & Safety Discipline (IMPORTANT)

KForge follows a strict multi-layer backup strategy:

Local git repository

GitHub remote repository

Physical backups:

Zip archive of the full kforge folder

Created at major phase milestones

Stored externally (Google Drive)

Risky work is never done without rollback options.

UI Authority (Current)

UI authority currently lives in:

src/App.js

Layout:

Top: Toolbar

Left: Explorer

Center: Editor (tabs + Monaco)

Right: AI panel (collapsible)

This is transitional.

All UI work must respect the long-term vision of a calm, modular, closable interface.

Provider Strategy (Locked)

Support many LLMs, especially free-tier options

Cloud, OpenAI-compatible, and local runtimes are first-class citizens

Custom endpoints allow future providers without rewrites

Accessibility and flexibility are core design constraints

Tooling & MCP Direction

Tools are explicit, consent-gated, and transcript-visible

No silent execution

No filesystem access without user intent

Tool runtime is being extracted out of App.js for stability

Lessons from External Tools (Reminder)

Prior experience with other “vibe coding” tools (e.g. Foxora) revealed:

Fragile state handling

Poor consistency

Hidden side effects

KForge intentionally avoids these patterns.

Notes and concrete lessons will be added here later as a reference checklist.

Project Laws (Operational)

One objective per chat

Major milestones → new chat

If stuck: revert, commit, regroup

Prefer reliability over cleverness

Full file replacement preferred for core files

Temporary test code must be removed

Modularization requires cleanup of redundant logic

Markdown files must be Notepad-friendly (no triple backticks)

Usage

At the start of a new chat:

Paste the Context Summary

Reference this file if deeper context is needed

Update this file whenever architecture, rules, or direction changes.