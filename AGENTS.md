# KForge Agent Instructions

## Project

KForge is a local-first AI IDE built with React, Tauri v2, JavaScript, Monaco, and pnpm.

Repo location:
- D:\kforge

Primary package manager:
- pnpm

Common commands:
- pnpm build
- pnpm run dev

## Working style

Work one step at a time.

Do not jump ahead.

Use rg -n for searching.

Prefer small, focused patches over broad rewrites.

Do not redesign architecture unless the user explicitly asks for an architecture change.

When helpful, ask for or inspect current file contents before editing.

If a file is small enough, prefer a full safe replacement over fragile partial edits.

## Git safety

Before risky edits, check:
- git status --short
- git branch --show-current
- git log --oneline -5

Do not mix unrelated fixes in one commit.

After each stable milestone:
- run pnpm build
- commit
- tag a checkpoint
- push branch and tag

## KForge coding rules

KForge has had repeated failures around:
- model/tool continuation metadata
- inspected-path memory
- no-tool recovery
- app edit routing
- approval/write_file safety
- destructive rewrite blocking
- repeated read-only loops

Treat these areas as high-risk.

For app-building workflow bugs:
- inspect before patching
- identify the exact failure path
- patch one blocker at a time
- preserve existing successful behaviour
- avoid broad refactors

## Codex role

Codex is a second engineer/auditor, not an uncontrolled auto-rewriter.

Preferred workflow:
1. Read-only audit.
2. Ranked blocker list.
3. User and ChatGPT choose one blocker.
4. Patch only that blocker.
5. Run build.
6. Review diff.
7. Commit, tag, and push.

For audits, report:
1. short title
2. why it is likely a real bug
3. exact file and line references
4. minimal proposed fix
5. risk level
6. manual test

## Current stable context

Latest stable checkpoints:
- c704ca5 / checkpoint-phase-14.4-e-deterministic-reset-button-executor
- 187c6b5 / checkpoint-codex-continuation-tool-metadata-preserved

Recent completed fixes:
- deterministic reset-button executor for narrow built-in starter form reset edits
- continuation tool messages preserve modelToolOriginalGoal and modelToolInspectedPaths

Next focus:
Continue inspection-only Codex pass for high-risk app-building workflow bugs.
Patch only blockers, one at a time.
