
# Model Update Request — KForge

_Last updated: 19/04/2026_

Purpose:  
This note is the internal handoff for future model/provider update passes.

Use it whenever:
- a provider deprecates a model
- a model is renamed or replaced
- a provider changes free vs paid availability
- a preview model becomes stable
- a stable model is retired
- KForge docs or preset suggestions may be outdated

---

## Core rule

When model/provider updates are needed in KForge:

1. First check whether KForge is CURRENTLY using:
   - compiled presets in `src/ai/modelPresets.js`
   - or a live remote `presets.json` file

Do not assume. Confirm from the current repo/code path using `rg -n`.

2. Then compare our current KForge presets/docs against the latest official provider docs.

3. Tell me which of these need updating:
   - `docs/PRESETS_INVENTORY.md`
   - `docs/PROVIDERS_AND_MODELS.md`
   - `docs/custom_provider.md`
   - `docs/MODELS_COLOR_LABELS.md`
   - `docs/remote_presets_plan.md` (only if the mechanism explanation is now misleading)
   - the actual machine source too:
     - `src/ai/modelPresets.js`
     - or `docs/presets.json`
     - or both, depending on what the app currently uses

4. For every outdated model, tell me:
   - exact current model ID
   - whether old ID is deprecated / removed / aliased / replaced
   - recommended replacement
   - whether colour label should change
   - whether usage label should change
   - whether Help docs need updating too

5. Separate:
   - machine-source changes (what affects the app)
   - human-doc changes (what affects Help / GitHub Pages)

6. After the audit, give me:
   - exact files to edit
   - exact rows/sections to replace
   - any risky model IDs to remove
   - any free/paid label changes
   - git commands to commit/push docs

---

## Important plain-English mechanism

Do not assume `docs/PRESETS_INVENTORY.md` updates the app.

Current understanding from this ship:

- `docs/PRESETS_INVENTORY.md` = human-readable snapshot
- `docs/PROVIDERS_AND_MODELS.md` = public/help-facing explanation
- `docs/MODELS_COLOR_LABELS.md` = label meaning rules
- `docs/custom_provider.md` = custom endpoint guidance
- `src/ai/modelPresets.js` = current live app preset source
- `docs/presets.json` = future-facing machine-readable preset source / draft remote source
- `docs/remote_presets_plan.md` = design/plan for remote presets, not proof that remote presets are live

So next time:
- check the docs
- check the machine source
- do not treat markdown docs as runtime truth unless repo evidence proves it

---

## Repo check commands

Run these first:

```powershell
cd D:\kforge
rg -n "modelPresets|presets.json|PRESETS_INVENTORY|PROVIDERS_AND_MODELS|MODELS_COLOR_LABELS|custom_provider" src docs
rg -n "gemini|gpt-|claude-|deepseek|openrouter|mistral|groq" src/ai/modelPresets.js docs/presets.json docs/PRESETS_INVENTORY.md docs/PROVIDERS_AND_MODELS.md docs/MODELS_COLOR_LABELS.md docs/custom_provider.md
````

Useful stale-ID check:

```powershell
rg -n "gemini-3-pro-preview|gpt-4.1-mini|gpt-5-mini|claude-opus-4-5|claude-sonnet-4-5" src docs
```

---

## Paste this request to ChatGPT next time

```text
We are on the KForge ship: Models/Providers updates.

Please do two separate checks:

A) Mechanism check
Confirm from the current repo whether KForge currently reads presets from:
- src/ai/modelPresets.js
- docs/presets.json
- another runtime source

Do not assume from old notes.
Please use repo evidence (`rg -n`) to prove which file is the current machine source.

B) Provider/model audit
Compare our current KForge presets/docs against the latest official provider docs and tell me:

1. Which model IDs are outdated, deprecated, removed, renamed, or no longer good defaults
2. Which replacements to use
3. Which colour labels should change
4. Which usage labels should change
5. Which files need updating:
   - docs/PRESETS_INVENTORY.md
   - docs/PROVIDERS_AND_MODELS.md
   - docs/custom_provider.md
   - docs/MODELS_COLOR_LABELS.md
   - docs/remote_presets_plan.md (only if needed)
   - and the real machine source (src/ai/modelPresets.js or docs/presets.json)

Please separate:
- app-affecting changes
- help/docs-only changes

Then give me:
- a concise summary
- exact rows/sections to replace
- any risky models to remove
- git commands to commit/push the docs

Also check whether docs/index.md needs updating so GitHub Pages still links users to the latest docs from the published docs homepage.
```

---

## Files usually affected

### Always check

* `src/ai/modelPresets.js`
* `docs/PRESETS_INVENTORY.md`
* `docs/PROVIDERS_AND_MODELS.md`

### Sometimes check

* `docs/MODELS_COLOR_LABELS.md`
* `docs/custom_provider.md`
* `docs/presets.json`

### Rarely check

* `docs/remote_presets_plan.md`

---

## What was done in this ship

This ship refreshed stale preset/model references across:

* `src/ai/modelPresets.js`
* `docs/PRESETS_INVENTORY.md`
* `docs/PROVIDERS_AND_MODELS.md`
* `docs/MODELS_COLOR_LABELS.md`
* `docs/custom_provider.md`
* `docs/presets.json`

The stale IDs from the previous pass were cleared from `src` and `docs`.

Final grep check used:

```powershell
rg -n "gemini-3-pro-preview|gpt-4.1-mini|gpt-5-mini|claude-opus-4-5|claude-sonnet-4-5" src docs
```

Expected clean result:

* no matches

---

## Public Help note

`docs/PROVIDERS_AND_MODELS.md` matters because users can access the published Help copy.

When that file changes, push it.

Standard doc push flow:

```powershell
git add docs/PROVIDERS_AND_MODELS.md
git commit -m "Docs: update providers and models guide"
git push
```

For larger update passes:

```powershell
git add src/ai/modelPresets.js docs/PRESETS_INVENTORY.md docs/PROVIDERS_AND_MODELS.md docs/MODELS_COLOR_LABELS.md docs/custom_provider.md docs/presets.json docs-internal/model-update-request.md
git commit -m "Models: refresh presets, docs, and update handoff"
git push
```

---

## GitHub Pages / docs landing page check

After updating model/provider docs, also check whether the GitHub Pages docs landing page needs updating.

Plain English:

* `docs/index.md` is the docs landing page for the published site if GitHub Pages is publishing from the repo `/docs` folder
* GitHub Pages looks for `index.html`, `index.md`, or `README.md` as the entry file
* when `docs/index.md` changes and is pushed, the published docs homepage updates after GitHub Pages rebuilds

What to check after a docs update:

* does `docs/index.md` still link to the right documents?
* are the link titles still accurate?
* if a new important doc was added, should it be linked from `docs/index.md`?
* if a doc was renamed or replaced, does `docs/index.md` still point to the correct file?
* does the published docs homepage still give users a clear path to the latest provider/model information?

Typical repo action:

```powershell
git add docs/index.md
git commit -m "Docs: update docs landing page links"
git push
```

Useful reminder:
Updating a doc file alone is not enough if users discover docs through the published GitHub Pages landing page.

---

## Final reminders

Do not only ask:

* “does this model still exist?”

Also ask:

* is it still recommended?
* is it still stable vs preview?
* is it still free vs paid on this route?
* is the alias still correct?
* should KForge still present it as a preset?
* do the docs and the app both agree?

````

Then run:

```powershell
git add docs-internal/model-update-request.md
git commit -m "Docs-internal: polish model update request handoff"
git push
````
