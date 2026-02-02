# Remote Presets Plan (Detailed Spec)

_Last updated: 01/02/2026_

This document specifies a future-proof mechanism for maintaining KForge model presets and label metadata
without rebuilding the app.

Core idea:
- Presets (provider → model suggestions + labels) should be hosted remotely (GitHub Pages)
- The app fetches presets at runtime
- The app remains safe offline via fallback defaults

This doc is intentionally detailed to support implementation without guesswork.

---

## 🧭 Goals

- Update presets (models, labels, notes) without rebuilding or re-releasing binaries
- One source of truth for Windows / macOS Intel / macOS ARM
- Keep UI calm and predictable
- Preserve user control:
  - users can always add models manually
  - presets never block usage
- Safe by default:
  - remote fetch failures must never break the app
  - fallbacks must always exist

---

## 🚫 Non-goals

- Enforcing billing or verifying true prices
- Universal model discovery for every provider
- Managing provider accounts or quotas
- Replacing user “My models” persistence

---

## 📌 Definitions

- Provider: a configured backend route in KForge (OpenAI, Claude, OpenRouter, Custom, Ollama, etc.)
- Presets: curated suggestions shipped (and later remote-hosted) per provider
- User models (“My models”): user-added model IDs saved locally and merged into options

Important invariant:
- Labels are metadata only and must never be appended to a model ID sent to providers.

---

## 🗂 Current state (today)

- Built-in presets live in:
  - `src/ai/modelPresets.js`
- UI shows cost labels based on a color-coded scheme and a usage mode scheme
- “My models” lists exist per provider (user-editable), merged with presets at runtime

Phase 3.12 outputs that inform this plan:
- `docs/PRESETS_INVENTORY.md` (human-readable snapshot)
- `docs/PROVIDERS_AND_MODELS.md` (user-facing mental model)
- `docs/MODELS_COLOR_LABELS.md` (label definitions)

---

## ✅ Proposed architecture

### Source of truth
Host a machine-readable JSON file via GitHub Pages, e.g.
- `https://kilmane.github.io/kforge/presets.json`

### App behavior
On startup (or first provider panel open):
1. Load compiled fallback presets from `src/ai/modelPresets.js`
2. Attempt to fetch remote presets JSON
3. If valid:
   - apply remote presets to in-memory preset registry
   - cache locally for offline fallback
4. If invalid or unreachable:
   - fall back to cached remote presets (if available)
   - otherwise keep compiled presets

---

## 📦 Data format (JSON)

### Migration note: v0 vs v1

KForge currently ships presets in the format:

- `{ id, tier, note }`

To avoid requiring immediate code changes, the first remote presets file should mirror this existing format.
Call this schema **v0**.

Once remote fetching is implemented and stable, KForge can migrate to schema **v1**, which separates:

- `cost` (drives color label)
- `usage` (sandbox/main/heavy)

Recommended rollout:
1. Publish `presets.json` in v0 format (matches current code)
2. Implement remote fetch + cache using v0 schema
3. After stable, introduce v1 support (cost + usage) and migrate the published JSON

### Top-level schema (v1)

| Field | Type | Required | Notes |
|---|---|---:|---|
| version | string | yes | Schema version, e.g. "1" |
| updated_at | string | yes | ISO-8601 date or datetime |
| providers | object | yes | Map: provider_id → preset array |
| notes | string | no | Optional free text for maintainers |

### Provider presets array schema

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | string | yes | Provider model ID (case-sensitive) |
| cost | string | yes | Cost class enum (below) |
| usage | string | yes | Usage mode enum (below) |
| note | string | no | Short hint shown in UI/help |
| aliases | array[string] | no | Optional alternate IDs (future proofing) |
| deprecated | boolean | no | Mark as deprecated in UI (optional) |

### Cost enum (drives color label)

| cost value | UI meaning |
|---|---|
| free | 🔵 Free |
| paid_sandbox | 🟢 Paid (low cost) |
| paid_main | 🟡 Paid (standard) |
| paid_heavy | 🔴 Paid (expensive) |
| unknown | ⚪ Unknown |

### Usage enum (drives usage mode)

| usage value | UI meaning |
|---|---|
| sandbox | Sandbox |
| main | Main |
| heavy | Heavy |

Constraint:
- `cost` and `usage` are separate on purpose.
- “Free implies sandbox” is a recommendation, not a hard validation rule (but we can warn if free+heavy).

---

## 🧪 Example JSON (indented, no code fence)

    {
      "version": "1",
      "updated_at": "2026-02-01",
      "providers": {
        "openai": [
          { "id": "gpt-4.1-mini", "cost": "paid_main", "usage": "main", "note": "Day-to-day" },
          { "id": "gpt-5-mini", "cost": "paid_sandbox", "usage": "sandbox", "note": "Cheap paid testing" }
        ],
        "openrouter": [
          {
            "id": "meta-llama/llama-3.3-70b-instruct:free",
            "cost": "free",
            "usage": "sandbox",
            "note": "Rotating / rate-limited"
          }
        ]
      }
    }

---

## 🛡 Validation & safety rules

### Schema validation
On fetch success, validate:
- JSON parses
- `version` matches a supported schema version
- `providers` is an object
- each provider value is an array
- each preset entry has:
  - `id` string
  - `cost` in allowed set
  - `usage` in allowed set

### Failure handling (must never break app)
If any validation fails:
- ignore remote response entirely
- fall back to cached remote (if valid) else compiled defaults

### Partial acceptance (optional)
To be extra resilient:
- accept the file if top-level is valid
- skip invalid providers and invalid entries
- still use valid providers from the same payload

This reduces blast radius from a single bad entry.

---

## 💾 Caching strategy

### Cache contents
Cache the last-known-good remote JSON (entire document) with:
- raw JSON text (or parsed object)
- fetch timestamp
- parsed `updated_at` value

### Cache location
Use a user-local storage mechanism already used for settings, e.g.
- local storage / persisted settings layer
- per-platform app data directory (Tauri-safe storage)

### Cache precedence
Recommended precedence order:
1. Fresh remote fetch (valid)
2. Cached remote (valid)
3. Compiled presets fallback

---

## ⏱ Fetch timing options

### Option A (recommended): Startup fetch
Pros:
- presets up-to-date immediately
- consistent UI across session
Cons:
- adds a network attempt at startup

### Option B: Lazy fetch (on opening provider panel)
Pros:
- faster startup
- fetch only if AI panel used
Cons:
- first-time open may show fallback then update

Recommendation:
- Start with Option B if you want minimal startup risk
- Switch to Option A once stable

---

## 🧯 Offline behavior

Requirements:
- App must be fully usable with compiled presets even if offline
- “My models” must always appear regardless of remote presets state

Optional UI hint:
- display a quiet “Presets updated on: <date>” in a non-intrusive place
- never show modal popups for presets fetch errors

---

## 🔐 Security considerations

Remote presets are not “trusted code”, but they are:
- curated content that influences UI choices

Mitigations:
- Strict schema validation
- Ignore unknown provider IDs and unknown fields
- Do not allow remote presets to:
  - execute code
  - define endpoints
  - modify user secrets
  - change providers registry

Explicit non-feature:
- Remote presets must not add new providers.
  Providers remain compiled and registered in the app.

---

## 🧩 Merge rules with user models

### Required behavior
Displayed model options per provider should be:

- presets (remote if available, else fallback)
PLUS
- user “My models” list

Merge requirements:
- remove duplicates by exact model ID string match
- preserve user-added models even if not in presets
- if a model exists in both:
  - keep user entry (if it has user-specific metadata)
  - else keep preset metadata

Recommended ordering:
- Presets shown first (curated)
- Then a divider
- Then “My models” (user-added)

---

## 🧭 Deprecation support (optional but useful)

Problem:
- Models disappear or rename frequently

Support in schema:
- `deprecated: true` for a preset entry

UI behavior (optional):
- show a subtle “Deprecated” hint
- keep it selectable (do not block)
- allow users to remove it from their own list

---

## 🔁 Update workflow (operational)

### Authoring workflow
1. Edit presets data (manual JSON edit or generated)
2. Validate locally (simple JSON schema validator script)
3. Commit to repo
4. GitHub Pages publishes `presets.json`

### Release workflow
- No app rebuild required for preset updates
- All installed binaries benefit on next fetch

---

## 🔗 Relationship to human docs

- `docs/PRESETS_INVENTORY.md` remains the readable snapshot
- Remote JSON becomes the machine source of truth
- Inventory can be regenerated from JSON periodically to prevent drift

Recommended rule:
- When JSON changes materially, update inventory snapshot in the same PR/commit.

---

## 🧪 Testing plan (implementation phase)

### Unit tests
- schema validation: accepts good payload, rejects bad payload
- merge logic: presets + user models dedupe and ordering
- fallback logic: remote fail → cached → compiled

### Manual tests
- offline mode (disable network)
- corrupted cache
- partial provider payload
- unknown provider keys
- very large preset list (performance sanity)

---

## 🧱 Migration plan (from compiled presets)

Phased rollout:
1. Implement remote fetch + cache, but keep compiled presets as default
2. Quietly fetch remote and apply if valid
3. Add minimal “last updated” indicator (optional)
4. Later (optional): reduce compiled presets to a minimal safe baseline once remote is stable

Never remove compiled presets entirely until:
- remote system has been stable for multiple releases
- telemetry is not required, but internal confidence should be high

---

## 🧾 Open questions (to decide later)

- TTL strategy:
  - fetch every launch
  - fetch once per day
  - fetch only when version changes
- Multiple channels:
  - stable presets vs experimental presets
- Internationalization:
  - notes text localization (likely out of scope)
- Whether to expose “Refresh presets” button (probably not needed early)

---

## ✅ Summary

Remote presets enable KForge to stay current in a fast-moving model ecosystem without constant rebuilds.
The app must remain safe offline and must never block user workflows due to network or presets failures.

This plan separates:
- provider support (compiled, stable)
from
- preset suggestions and labels (remote, updateable)
while preserving user-added models as first-class citizens.
