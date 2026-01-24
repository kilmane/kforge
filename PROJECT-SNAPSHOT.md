PROJECT-SNAPSHOT — kforge

Last updated: January 24th, 2026 (Phase 3.6.x)



This file is the canonical project context and operational reference.

If something conflicts with memory, chat history, or assumptions — this file wins.



Overview



kforge is a desktop-first developer workspace with an AI assistant, secure filesystem control, and a modular, calm UI philosophy.



Current focus:

Phase 3.6 — MCPs / tool integration on top of a stable editor and AI panel foundation.



Backup \& Safety Discipline (IMPORTANT)



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



UI Philosophy \& Attention Discipline



KForge is not a debug console with chat bolted on.



KForge is a chat-first thinking environment with optional diagnostics.



This philosophy guides all UI and interaction decisions:



Chat is the primary surface for reasoning, iteration, and “vibe coding”.



Diagnostics, raw payloads, and debug data are secondary and must never dominate attention.



Supporting principles:



Tools must feel intentional, explicit, and calm.



Errors should be summarized in human language first, with raw details available on demand.



Model quirks and misbehavior should be handled through protocol enforcement and recovery loops, not UI noise.



Power-user diagnostics (e.g. Output panels, raw tool payloads) must be optional, collapsible, and never auto-intrusive.



This philosophy quietly informs:



Tool UX and consent flows



Error handling and recovery behavior



Provider and model variability handling



Future UI refactors toward a chat-centric workspace



Provider Strategy (Locked)



Support many LLMs, especially free-tier options



Cloud, OpenAI-compatible, and local runtimes are first-class citizens



Custom endpoints allow future providers without rewrites



Accessibility and flexibility are core design constraints



Model Flexibility (User-Editable)



KForge must allow users to add and manage model IDs on the fly (per provider) without requiring a rebuild or new deployment, as long as the provider is already supported.



Presets are only suggestions. Users can enter a custom model ID, save it to a per-provider list (“My models”), and select it like any other option.



This flexibility is critical because model availability changes over time (deprecations, billing/plan access, provider catalog updates). KForge must remain useful even when preset lists become stale.



Important rules:



Model IDs must be exact provider identifiers (case-sensitive; no friendly names).



Cost tags (Free / Paid / Experimental) are metadata only and must never be appended to the model ID sent to providers.



Implementation preference (future UX):



Per-provider “Add model ID” input with a saved list in the UI.



Persist user-added models locally (e.g. local storage or a user config layer).



Merge user models with shipped presets at runtime.



Token Efficiency \& Cost Awareness



KForge is designed to burn fewer tokens per useful result.



This is achieved through:



Explicit context control (limited rolling chat window).



No hidden system prompt bloat.



Active file context included only by user intent.



No silent resending of large buffers or workspace state.



As a result, users get more meaningful work per token compared to tools that resend entire conversations or project state implicitly.



Token efficiency is a core product principle, not an afterthought.



Tooling \& MCP Direction



Tools are explicit, consent-gated, and transcript-visible.



No silent execution.



No filesystem access without user intent.



Tool runtime is being extracted out of App.js for stability.



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



Update this file whenever architecture, rules, or direction changes

