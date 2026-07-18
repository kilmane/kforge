# KForge

**A local-first desktop AI engineering workbench for creating projects and working with existing codebases.**

KForge brings project setup, AI-assisted development, file context, preview tools, provider configuration, and an integrated terminal into one Windows desktop application.

The project has been developed over approximately six months. It began before OpenAI Build Week and remains under active development.

📘 User documentation: https://kilmane.github.io/kforge/

## What is KForge?

KForge is focused on clarity, control, and long-term stability.

It is designed to feel calm, predictable, and powerful—an environment where AI assists development without adding unnecessary noise, clutter, or surprise behaviour.

KForge is intentionally not “AI magic software.” It is a deliberate, transparent tool for developers who value control.

## Why KForge exists

AI coding tools can create impressive first drafts, but real software development continues after the first generation. Projects need to be opened again, understood, tested, changed carefully, and recovered when an AI response is incomplete or malformed.

KForge explores a developer-controlled workflow in which AI assists with engineering work while the developer remains responsible for reviewing, approving, testing, and shipping changes.

Its longer-term focus is reliable iteration on existing applications rather than one-shot code generation alone.

## Project philosophy

- **Local-first** — project files stay on the developer’s machine
- **Explicit permissions** — no silent filesystem or network access
- **Calm by design** — minimal UI, low clutter, and no surprise panels
- **Incremental development** — stability is locked before moving forward
- **Documentation-first** — code is not considered complete without clear documentation
- **Developer control** — AI suggestions are reviewed and approved before integration

## Current capabilities

KForge currently includes:

- Windows desktop application built with React and Tauri
- Creation and opening of local project workspaces
- Guided starter-project setup
- Visual direction and theme selection during the initial build workflow
- Configurable AI providers and model selection
- Support for attaching the current file to an AI request
- Project preview workspace
- Integrated terminal that runs commands in the active project
- Guided terminal command library
- Git-friendly local development workflow
- Controlled edit, inspection, and recovery work under active development
- Local settings and project-aware configuration

Some workflows, particularly repeated AI editing of an existing application, are still being stabilised and should be considered experimental.

## Supported AI providers

KForge has been designed to work with multiple providers, including:

- OpenAI
- Anthropic
- Google Gemini
- OpenRouter

Available models depend on the provider configuration and API access supplied by the user.

## Built with

- React
- JavaScript
- Tauri 2
- Rust
- Node.js
- pnpm
- Git

## Installation

### Current platform

KForge is currently developed and tested on Windows.

### Requirements

Install the following before building KForge:

- Git
- Node.js
- pnpm
- Rust
- Microsoft C++ Build Tools and the other Windows prerequisites required by Tauri

### Clone and run

```powershell
git clone https://github.com/kilmane/kforge.git
Set-Location -LiteralPath '.\kforge'
pnpm install
pnpm tauri dev
```

### Create a production build

```powershell
pnpm tauri build
```

Further installation guidance for beta testers is available in the project documentation:

https://kilmane.github.io/kforge/

## Development history and AI usage

KForge was already an active project before OpenAI Build Week and has been developed over approximately six months.

Different AI models and coding tools were used as collaborative engineering assistants at different stages of the project:

- GPT-5.4-mini for routine development experiments and workflow testing
- GPT-5.4 for more demanding implementation and application-editing work
- GPT-5.5 and GPT-5.6 during later architecture, debugging reliability, UX, and documentation work
- Codex as a second engineering assistant for repository inspection, implementation suggestions, focused patches, testing, and code review
- Gemini and Claude Sonnet for occasional comparison and alternative technical perspectives

They assisted with work such as:

- Architecture and workflow design
- Feature implementation
- Debugging and failure investigation
- User-experience refinement
- Code inspection and review
- Testing strategies
- Documentation
- Recovery and reliability improvements

AI suggestions were reviewed, adapted, and tested before integration. Product direction, implementation approval, validation, Git history, and release decisions remained under developer control.

## OpenAI Build Week

For OpenAI Build Week, GPT-5.6 and Codex were used during the latest phase of KForge development.

This work focused particularly on:

- Investigating the state transitions involved in editing an existing application
- Improving controlled-edit reliability and recovery
- Reviewing implementation changes
- Testing and documenting the current product
- Preparing the repository and submission materials

Build Week represents a recent development milestone, not the beginning of the KForge project.

## Project status

KForge is an early-stage project under active development.

The current priority is to make repeated edits to existing applications predictable, understandable, and recoverable. Features and documentation may change as that workflow is simplified and stabilised.

## Roadmap

Planned work includes:

- Reliable repeated iteration on existing applications
- Clearer edit-state transitions and recovery
- Improved model-response validation
- Stronger project inspection and context handling
- Additional provider and model support
- Expanded testing and documentation
- Broader platform support

## Documentation

https://kilmane.github.io/kforge/

## Repository

https://github.com/kilmane/kforge

## Licence

No open-source licence has currently been granted. The source code is publicly visible for evaluation and development review, but all rights remain reserved unless a licence is added later.
