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

# Phase 14.6-c — App-build Layout Archetype Variety

Status: Planned
Added: 2026-07-07
Updated: 2026-07-07

**Why**

Phase 14.6-b added a pre-build visual direction chooser. Phase 14.6-b2 added **Start over with different look**, which can restore the files changed by the last controlled app-build to their pre-app-build baseline and then reopen the visual direction chooser.

The next layout-variety work should now treat "look" as more than colors or theme tokens. Users can safely reject one generated direction and rebuild from the same original request, so KForge can become more ambitious about varying the overall app shape while still preserving a recovery path.

Stable restore point before this phase:

- Commit: `42eb06c`
- Tags:
  - `checkpoint-phase-14.6-b2-complete`
  - `checkpoint-phase-14.6-b2-start-over-restore-hotfix`

**Where**

- `src/ai/appBuild/appBuildLayoutContract.js`
- `src/ai/appBuild/appBuildDesignDna.js`
- `src/ai/appBuild/appBuildJobController.js`
- `src/ai/panel/AiPanel.jsx`
- post-edit completion actions and visual-direction restore flow

**Plan**

1. Define a small set of app-build layout archetypes, such as dashboard workspace, split planner, marketing/tool hybrid, editorial checklist, form-first tool, kanban/board, compact utility, and high-density operations view.
2. Route broad app-build requests toward an archetype based on domain, entities, workflow, and visual direction.
3. Make archetype choice affect structure, hierarchy, navigation shape, panel composition, list/card treatment, and first-screen density, not just colors.
4. Keep the visual direction chooser simple. Do not overload the user with a second confusing menu unless testing proves it is needed.
5. Ensure Start over with different look remains compatible with archetype variety. Rebuilding from a different visual direction may also produce a different layout shape when the archetype inference reasonably changes.
6. Keep true post-build restyling out of this phase. That remains a later dedicated visual restyle/recomposition ship.

**Risks / gotchas**

- Too many archetypes may create prompt bloat or inconsistent output.
- "Different look" can imply different layout shape, but it must still preserve the original app request and core workflow.
- Restore must remain truthful: KForge restores changed files, asks for write approval, and does not claim Preview/build/tests after restore.
- Avoid making app-build generation depend on Tailwind or new dependencies until the Tailwind decision is intentionally reopened.

**Done when**

- App-build prompts can produce visibly different layout shapes for different app domains and visual directions.
- The generated app still has a coherent core workflow, not only a visual shell.
- Start over with different look still restores and reopens the chooser safely after a completed controlled app-build.
- Build passes with existing warnings only.
- Docs/handoff mention the 14.6-b2 restore point and the distinction between pre-build rebuild and true post-build restyle.

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

KForge already has model policy, advisory/test-mode warnings, Free starter plan guidance, and a planning-only AI-assisted app plan option. The remaining roadmap is now focused on:

- Phase 11.6 — Model Presets, Quality Tiers & Warnings

The agreed product direction is:

- Free starter plan should remain available by default and not require API keys.
- AI-assisted app plan is optional and uses the current configured model, with clear quality caveats.
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
- Weak/free/cheap presets are removed or clearly marked Weak / test only, not reliable builders.
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

---

# Legacy AI Advanced Controls and Patch Preview Plumbing

Status: Shelved
Added: 2026-07-12
Updated: 2026-07-12

**Decision**

The user-facing Advanced settings surface was removed during the AI controls simplification ship.

The normal AI experience now keeps **Attach current file** directly above the prompt. Project-specific behavior instructions and expert model parameters live under **Settings → AI controls**.

The old controls should not return in their previous form. Revisit them only if KForge later introduces a clearly redesigned review workflow with proven user value.

**Parked implementation**

- `src/ai/panel/PatchPreviewPanel.jsx` remains as an unrendered standalone legacy component.
- `src/ai/panel/OutputPanel.jsx` remains as an unrendered standalone legacy component.
- `src/App.js` retains hidden patch-workflow plumbing:
  - `askForPatch` / `setAskForPatch`
  - `setPatchPreview`
  - `setPatchPreviewVisible`
  - `maybeCapturePatchPreview`
  - `effectiveAskForPatch`
  - unified-diff prompt instructions and retry propagation
- `src/App.js` retains write-only `setAiOutput` state updates even though the raw Output panel is no longer rendered.
- Model workflow policy can still allow or force patch-preview-style requests internally.

**Why it remains parked**

Some of this plumbing may still influence request construction and model-policy routing even though the dedicated UI is gone. It should not be deleted casually as part of unrelated cleanup.

The current product decision is:

- no user-facing Advanced settings window
- no Suggest edits toggle
- no dedicated Patch Preview panel
- no raw Output panel
- normal app iteration remains chat-led and tool-controlled

**Risks / gotchas**

- A model policy may still request a unified diff without a dedicated preview surface.
- Removing only part of the plumbing could break retries, model-policy behavior, or project-edit routing.
- Restoring the old panels would reintroduce the clutter this ship intentionally removed.
- Raw output should not be shown twice alongside the normal assistant transcript.

**Plan if revisited**

1. Decide explicitly between permanent retirement and a redesigned review workflow.
2. If retiring it, remove the standalone components, hidden state, request branches, patch instructions, retry propagation, and related model-policy flags together.
3. If redesigning it, use a chat-led review card or controlled confirmation action rather than restoring the old Advanced settings surface.
4. Verify that project edits, weaker-model policy, retries, and app-build workflows still behave truthfully.
5. Run a production build and visual smoke test before committing.

**Done when**

- The legacy plumbing is either fully removed with no hidden patch mode or dead raw-output state, or
- a deliberately redesigned review workflow replaces it without restoring the old cluttered UI.
