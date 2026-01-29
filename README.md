KForge

KForge is a local-first desktop AI IDE for working with multiple AI providers and models.

📘 User documentation: https://kilmane.github.io/kforge/

Last updated: 2026-01-22 (Phase 3.6.x)

What is KForge?

KForge is focused on clarity, control, and long-term stability.

It is designed to feel calm, predictable, and powerful — an environment where AI assists development without adding noise, clutter, or surprise behavior.

KForge is intentionally not “AI magic software”.
It is a deliberate, transparent tool for developers who value control.

🧭 Project Philosophy

Local-first — your files stay on your machine

Explicit permissions — no silent filesystem or network access

Calm by design — minimal UI, no clutter, no surprise panels

Incremental phases — stability is locked before moving forward

Documentation-first — code is not complete without documentation

🎯 Long-Term UI Vision

KForge is moving toward a calm, chat-focused interaction model:

A prominent, focused chat interface

Minimal persistent UI elements

All secondary UI (settings, tools, panels) are:

Modular

Explicitly opened

Explicitly closed

This vision is intentional.

During development, it is easy to lose sight of the final experience while solving technical problems.
This README exists partly to prevent that drift.

All future features should be planned with this end-state in mind.

🧱 Tech Stack

Tauri v2

React (CRA, JavaScript)

Tailwind CSS

Monaco Editor

Rust backend

pnpm

▶️ Running KForge (Development)
Prerequisites

Node.js (LTS)

pnpm

Rust toolchain

Tauri v2 system prerequisites

Install dependencies
pnpm install

Run the app
pnpm run dev

🔐 Accessibility & Future-Proofing

KForge is designed to work with:

Cloud providers

OpenAI-compatible endpoints

Local runtimes

Free-tier and low-cost options

The goal is accessibility.
KForge should remain usable even for developers with limited funds.

Adding new providers (local or cloud) should remain easy as the ecosystem evolves.

🔒 Project Law (Summary)

Stability over speed

No breaking changes in locked phases

One controlled change at a time

Rollback before heroics

Documentation and intent matter as much as code

Current phase: Phase 3 — AI integration (in progress)