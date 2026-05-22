# Architecture Backlog

This file is the parking bay for KForge architecture ideas that are not part of the current ship.

Rule:
If we say "later", we either do it now, explicitly drop it, or record it here with enough context to revisit intentionally.

Last cleaned: 2026-05-18

---

## Template

### Title

Status: Shelved | Planned | In progress | Completed
Added: YYYY-MM-DD
Updated: YYYY-MM-DD

**Why**

- ...

**Where**

- File: ...
- Function(s): ...
- Notes: ...

**Plan**

1. ...
2. ...
3. ...

**Risks / gotchas**

- ...

**Done when**

- ...

---

# Template Expansion — Additional Framework Templates

Status: Planned
Added: 2026-03-19
Updated: 2026-05-18

**Why**

KForge currently has enough starter coverage for the main beginner path, especially Static HTML, Vite + React, and Next.js.

Additional templates may still be useful later, but they should be added only when there is a clear product need and a smoke-tested preview path.

Candidate templates:

- Astro: documentation, blogs, marketing sites, content-heavy sites.
- Vue + Vite: frontend alternative to React.
- Expo / React Native: mobile app workflows, with extra care because phone/device preview is more complex.

**Where**

- `src/runtime/templateRegistry.js`
- `src/runtime/PreviewPanel.jsx`
- `src/runtime/previewRunner.js`
- `src-tauri/src/scaffold.rs`

**Plan**

1. Choose one template at a time.
2. Add the registry entry.
3. Add scaffold support.
4. Add preview detection.
5. Smoke test generate, install, preview, and follow-up implementation routing.

**Risks / gotchas**

- Some frameworks install dependencies during scaffold.
- Dev servers may use different ports.
- Mobile templates may require extra tooling and should not be treated like normal browser preview.

**Done when**

- At least one additional template can be generated, installed, previewed, and routed safely without core UI rewrites.

---

# Service Integration Registry / Unified Services

Status: Planned
Added: 2026-03-20
Updated: 2026-05-18

**Why**

KForge now has Services flows such as Supabase and Deploy guidance. Future services should not become one-off custom integrations with duplicated UI and setup logic.

A registry-like layer may still be useful if KForge adds more service integrations.

**Where**

- `src/runtime/ServicePanel.jsx`
- possible future `src/runtime/serviceRegistry.js`
- possible future service backend modules
- service-related helpers in `src/App.js`

**Plan**

1. Identify repeated metadata across existing services:
   - service id
   - display name
   - required environment variables
   - setup actions
   - generated client/helper files
   - docs / handoff text
2. Extract only the repeated parts into registry-like metadata.
3. Keep service flows truthful and beginner-safe.
4. Avoid turning KForge into a full DevOps dashboard.

**Risks / gotchas**

- Some services require authentication flows.
- Environment variable handling must remain secure.
- Services must not imply cloud setup happened unless it actually happened.
- Over-abstracting too early could slow development.

**Done when**

- A new service can be added mostly through metadata/configuration without duplicating the whole UI and routing pattern.

---

# AI-Assisted Planning and Model Quality Warnings

Status: Active
Added: 2026-03-29
Updated: 2026-05-22

**Why**

KForge already has model policy, advisory/test-mode warnings, Free App Brief planning, and a planning-only AI-Assisted App Brief option. The remaining roadmap is now focused on:

- Phase 11.6 — Model Presets, Quality Tiers & Warnings

The agreed product direction is:

- Free App Brief should remain available by default and not require API keys.
- AI-Assisted App Brief is optional and uses the current configured model, with clear quality caveats.
- KForge should recommend from KForge's curated presets only.
- KForge should stay out of the sea of constantly changing models and keep the curated list small, intentional, and builder-focused.
- Custom, local, and manual model IDs are bring-your-own choices. KForge cannot grade their quality, safety, tool-call reliability, or suitability.
- Users are responsible for researching and choosing custom/local/manual models.
- KForge should still protect users as much as possible with guardrails, warnings, write approval, path safety, blind-write protection, destructive rewrite protection, and no false completion claims.
- Weak/free/cheap models should not be marketed as reliable builders.

**Where**

- `src/ai/modelWorkflowPolicy.js`
- `src/ai/modelPresets.js`
- `src/ai/panel/ProviderControlsPanel.jsx`
- `docs/PRESETS_INVENTORY.md`
- `docs/presets.json`

**Plan**

1. Inventory current presets and policy language without changing code behavior.
2. Define clear product-facing quality tiers while keeping compatibility with the current preset format.
3. Map old internal tiers such as `sandbox`, `main`, `heavy`, `free`, and `unknown` to clearer user-facing labels.
4. Clean up curated presets so normal builder presets focus on reputable builder-capable models.
5. Move any retained weak/free/cheap presets into an Experimental / test-only lane, with one or two maximum unless testing proves otherwise.
6. Keep custom/local/manual models supported, but label them as user-managed and unverified rather than KForge-graded.
7. Make model quality warnings visible without blocking safe planning or manual guidance unnecessarily.
8. Add task-based suggestions from curated presets only, if the earlier tier/warning work stays small and stable.

**Risks / gotchas**

- Cost is a major concern.
- Too much model-routing UI could confuse beginners.
- Weak models should not be marketed as reliable builders.
- KForge should not pretend it can grade every custom endpoint or local model.
- Users can still add weak models through custom providers, so guardrails remain necessary.
- Curated preset updates must replace deprecated/upgraded models with models in the same intended quality lane, not random new options.

**Done when**

- Main presets focus on reputable builder-capable models.
- Weak/free/cheap presets are removed or clearly marked Experimental / test only.
- Custom/local/manual models are clearly labelled as user-managed and unverified.
- KForge explains model quality/cost tradeoffs before relying on AI-assisted planning or code edits.
- Weak/advisory/custom/local models remain safe but honestly labelled.
- Task-based suggestions, if added in this phase, recommend from curated presets only.

---

# Packaging Readiness — Preview & Deploy Tooling Rules

Status: Planned
Added: 2026-02-26
Updated: 2026-05-18

**Why**

Preview and deploy features depend on external tooling such as Node, pnpm, Git, Vercel, and Netlify. Before beta/packaging, KForge needs clear rules for what is bundled, what is required from the user, and what errors should be surfaced.

**Where**

- packaging docs / release notes
- `src/runtime/PreviewPanel.jsx`
- `src/runtime/previewRunner.js`
- `src/runtime/ServicePanel.jsx`
- deployment/service helpers

**Plan**

1. Document external tooling requirements.
2. Define process lifecycle management.
3. Define port safety rules.
4. Define deploy safety rules.
5. Make missing-tool errors beginner-readable.
6. Avoid claiming Preview/deploy success unless the tool result confirms it.

**Risks / gotchas**

- Packaged app behavior may differ from dev mode.
- Windows process and port cleanup can be fragile.
- Deploy providers may change UI/CLI behavior.
- KForge should not become a general DevOps dashboard.

**Done when**

- Preview and deploy requirements are documented clearly enough for beta users.
- Missing tools and failed processes produce useful recovery guidance.

---

# Recovery / Revert Follow-up Candidates

Status: Shelved
Added: 2026-05-18
Updated: 2026-05-18

**Why**

Phase 11.3.2 added truthful recovery routing and in-memory pre-write snapshot restore. The core recovery/revert flow is stable.

These ideas are not current commitments. They should only be picked up if testing shows real user value.

**Candidates**

1. Git-based restore

   Consider only if KForge can do it safely with explicit user confirmation and clear status/diff guidance. Must not accidentally discard unrelated user work.

2. Multi-file restore choice

   Consider only if multi-file bad edits become common and the current single last-file restore is not enough. Needs careful UI to avoid confusing users.

3. Post-destructive-block continuation polish

   Consider if models loop after the destructive rewrite guard blocks a bad write. The goal would be to steer the model toward a smaller targeted edit instead of repeated broad rewrites.

**Where**

- `src/App.js`
- `src/ai/panel/AiPanel.jsx`
- `src/ai/tools/handlers/index.js`
- possible Git/runtime tooling if Git restore is intentionally selected later

**Decision rule**

Do not implement these just because they sound impressive.

Only proceed if:

- the value is clear from testing,
- the complexity is small enough,
- the UX will not confuse users,
- KForge truthfulness and file-safety guarantees remain strong.

**Done when**

- One of these candidates is intentionally selected for a dedicated ship, or explicitly removed from the backlog.