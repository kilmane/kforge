# 🧰 DEV — Add a Provider (Checklist)

_Created: 28/01/2026_  
_Updated: 01/02/2026_

This document is a **practical, step-by-step checklist** for adding a new AI provider to **KForge**.

It is written to:
- avoid rabbit holes
- avoid guessing which files matter
- keep changes small and reversible
- reflect how KForge actually works today

Primary target: **OpenAI-compatible providers**  
(e.g. Groq, OpenRouter, DeepSeek, Mistral, gateways, hosted endpoints, etc.)

---

## 🟠 Project Law (read this first)

- One file at a time.
- One logical change per commit.
- Prefer minimal, boring changes.
- Never rely on temporary UI shims long-term.
- Always validate by running: `pnpm run dev`
- If confused: stop and paste the file instead of guessing.

---

## 🟦 What “OpenAI-compatible” means in KForge

A provider is considered OpenAI-compatible if it supports:

- `POST {base}/v1/chat/completions`
- `Authorization: Bearer <API_KEY>`
- JSON body with:
  - `model`
  - `messages`
  - optional: `temperature`, `max_tokens`

Important:
- The shared client **appends `/v1`**
- Therefore the stored base URL **must NOT include `/v1`**

---

## 🟣 Files you will touch (most common case)

### Backend (Rust / Tauri)

- `src-tauri/src/ai/providers/mod.rs`
- `src-tauri/src/ai/providers/<provider_id>/mod.rs`

### Frontend (React)

- `src/App.js` — provider registry (Settings + dropdown)
- `src/ai/modelPresets.js` (optional but recommended)
- `src/ai/panel/ProviderControlsPanel.jsx` (optional helper text)

You should NOT need to touch:
- `src/App.js` routing logic
- `src/ai/panel/AiPanel.jsx` (unless fixing bugs — not for adding providers)

---

## 🟢 Step 1 — Backend: register the provider

### File
- `src-tauri/src/ai/providers/mod.rs`

### What to do
1. Declare the module:
   - Add: `pub mod <provider_id>;`

2. Register it in `get_provider(...)`:
   - Add a match arm:
     - `"<provider_id>" => Some(Box::new(<provider_id>::<ProviderStruct>::new())),`

That’s it for this file.

✅ Commit immediately after this step if it compiles.

---

## 🟢 Step 2 — Backend: implement the provider module

### File
- `src-tauri/src/ai/providers/<provider_id>/mod.rs`

### Recommended approach
Copy an existing OpenAI-compatible provider (for example **Mistral** or **Custom**) and adapt it.

### Required behaviors
- `provider_id()` returns exactly `"<provider_id>"`
- API key is loaded from secret store using the **same provider id**
- Base URL is stored **without** `/v1`
- Request body matches OpenAI chat completions
- Uses `OpenAICompatClient`

### ⚠️ Common mistake (very important)
Do NOT paste diff / patch headers into Rust files.

If you see errors like:
- `expected one of ! or ::, found -`

You accidentally pasted text starting with:
- `diff --git`
- `---` / `+++`
- `@@`

Delete those lines.

✅ Commit when the backend compiles.

---

## 🟡 Step 3 — Frontend: add provider to registry (REQUIRED)

This step controls:
- whether the provider appears in Settings
- whether it appears in the dropdown
- whether it is disabled until configured

### File
- `src/App.js`

### Find
- `const ALL_PROVIDERS = [ ... ]`

### Add a new entry

Rules:
- `id` must exactly match `provider_id()` in Rust
- `needsKey: true` for cloud providers
- `needsEndpoint: true` only if user must supply an endpoint
- `alwaysEnabled: true` ONLY for local providers

Example entry:
- `{ id: "mistral", label: "Mistral", group: "compatible", needsKey: true, needsEndpoint: false, alwaysEnabled: false }`

After this:
- Provider appears in Settings
- Provider is greyed out until API key is set
- Provider appears in dropdown automatically

⚠️ IMPORTANT:
Do NOT add temporary dropdown hacks in `AiPanel.jsx`.  
`App.js` is the single source of truth.

✅ Commit when the UI builds.

---

## 🟡 Step 4 — Frontend: add model presets (recommended)

This step improves UX but is not strictly required.

### File
- `src/ai/modelPresets.js`

### Add a new section inside `MODEL_PRESETS`

Example:

- `mistral: [`
  - `{ id: "mistral-small-latest", tier: "sandbox", note: "Good starter model" },`
  - `{ id: "codestral-latest", tier: "main", note: "Coding-focused" }`
  - `],`

Rules:
- Presets are suggestions only
- Users can always type any model manually
- Tiers are UX hints, not cost guarantees

⚠️ VERY COMMON MISTAKE:
If you add a new provider after an existing one, make sure the previous entry ends with a comma.  
Missing comma = parser error.

✅ Commit when presets render.

---

## 🟦 Step 5 — Optional: provider-specific helper text

### File
- `src/ai/panel/ProviderControlsPanel.jsx`

Optional improvements:
- classify provider in `providerType()`
- add a small note block (like OpenRouter or Mistral hints)

Keep it minimal.

✅ Commit only if you changed behavior or user-visible text.

---

## 🧪 Step 6 — Test checklist (definition of done)

Run:
- `pnpm run dev`

Verify:
1. App starts without errors
2. Provider appears in Settings
3. Provider is disabled until required config is set
4. After setting API key:
   - provider becomes enabled
   - selecting provider + model works
5. Error cases are readable:
   - missing key
   - invalid key (401/403)
   - rate limit (429)

---

## 🧭 When to use Custom instead of a first-class provider

Use **Custom** when:
- the provider is purely OpenAI-compatible
- you don’t care about onboarding polish
- you want fastest experimentation

Create a first-class provider when:
- you want presets
- you want a default base URL
- you want clearer errors
- you want easier onboarding

---

## 🧠 Summary (mental model)

Backend:
- Rust decides **how** requests are sent

Frontend:
- `App.js` decides **which** providers exist
- Settings decides **when** they are enabled
- Presets decide **what** users see first

If a provider:
- works in backend
- but does not appear in UI

You almost always forgot:
- `src/App.js` → `ALL_PROVIDERS`

---