D:\\kforge\\DEV-ADD-PROVIDER.md



\# DEV-ADD-PROVIDER.md



Created: Jan, 28th, 2026



This document is a \*\*practical, step-by-step checklist\*\* for adding a new AI provider to \*\*KForge\*\*.



It is written to:



\* avoid rabbit holes

\* avoid guessing which files matter

\* keep changes small and reversible

\* reflect how KForge actually works today



Primary target: \*\*OpenAI-compatible providers\*\*

(Groq, OpenRouter, DeepSeek, Mistral, gateways, hosted endpoints, etc.)



---



\## Project Law (read this first)



\* One file at a time.

\* One logical change per commit.

\* Prefer minimal, boring changes.

\* Never rely on “temporary UI shims” long-term.

\* Always validate by running: pnpm run dev

\* If confused: stop and paste the file instead of guessing.



---



\## What “OpenAI-compatible” means in KForge



A provider is considered OpenAI-compatible if it supports:



\* POST {base}/v1/chat/completions

\* Authorization: Bearer <API\_KEY>

\* JSON body with:



&nbsp; \* model

&nbsp; \* messages

&nbsp; \* optional temperature / max\_tokens



Important:



\* The shared client APPENDS /v1

\* Therefore the stored base URL MUST NOT include /v1



---



\## Files you will touch (most common case)



Backend (Rust / Tauri):



\* src-tauri/src/ai/providers/mod.rs

\* src-tauri/src/ai/providers/<provider\_id>/mod.rs



Frontend (React):



\* src/App.js            ← provider registry (Settings + dropdown)

\* src/ai/modelPresets.js (optional but recommended)

\* src/ai/panel/ProviderControlsPanel.jsx (optional helper text)



You should NOT need to touch:



\* App.js routing logic

\* AiPanel.jsx (unless fixing bugs — not for adding providers)



---



\## Step 1 — Backend: register the provider



\### File



src-tauri/src/ai/providers/mod.rs



\### What to do



1\. Declare the module:

&nbsp;  Add:



\* pub mod <provider\_id>;



2\. Register it in get\_provider(...):

&nbsp;  Add a match arm:



\* "<provider\_id>" => Some(Box::new(<provider\_id>::<ProviderStruct>::new())),



That’s it for this file.



Commit immediately after this step if it compiles.



---



\## Step 2 — Backend: implement the provider module



\### File



src-tauri/src/ai/providers/<provider\_id>/mod.rs



\### Recommended approach



Copy an existing OpenAI-compatible provider (for example Mistral or Custom) and adapt it.



\### Required behaviors



\* provider\_id() returns exactly "<provider\_id>"

\* API key is loaded from secret\_store using the SAME provider id

\* Base URL is stored without /v1

\* Request body matches OpenAI chat completions

\* Uses OpenAICompatClient



\### Common mistake (very important)



Do NOT paste diff / patch headers into Rust files.



If you see errors like:



\* expected one of `!` or `::`, found `-`



You accidentally pasted text starting with:



\* diff --git

\* --- / +++

\* @@



Delete those lines.



---



\## Step 3 — Frontend: add provider to registry (THIS IS REQUIRED)



This step controls:



\* whether the provider appears in Settings

\* whether it appears in the dropdown

\* whether it is disabled until configured



\### File



src/App.js



\### Find



const ALL\_PROVIDERS = \[ ... ]



\### Add a new entry



Example:



\* id: must exactly match provider\_id() in Rust

\* needsKey: true for cloud providers

\* needsEndpoint: true only if user must supply endpoint

\* alwaysEnabled: true ONLY for local providers



Example entry:



\* { id: "mistral", label: "Mistral", group: "compatible", needsKey: true, needsEndpoint: false, alwaysEnabled: false }



After this:



\* Provider appears in Settings

\* Provider is greyed out until API key is set

\* Provider appears in dropdown automatically



IMPORTANT:

Do NOT add temporary dropdown hacks in AiPanel.jsx.

App.js is the single source of truth.



---



\## Step 4 — Frontend: add model presets (recommended)



This step improves UX but is not strictly required.



\### File



src/ai/modelPresets.js



\### Add a new section inside MODEL\_PRESETS



Example:



\* mistral: \[



&nbsp; \* { id: "mistral-small-latest", tier: "sandbox", note: "Good starter model" },

&nbsp; \* { id: "codestral-latest", tier: "main", note: "Coding-focused" }

&nbsp;   ]



Rules:



\* Presets are suggestions only

\* Users can always type any model manually

\* Tiers are UX hints, not cost guarantees



VERY COMMON MISTAKE:

If you add a new provider after an existing one,

make sure the previous entry ends with a comma.



Missing comma = parser error.



---



\## Step 5 — Optional: provider-specific helper text



\### File



src/ai/panel/ProviderControlsPanel.jsx



Optional improvements:



\* classify provider in providerType()

\* add a small note block (like OpenRouter or Mistral hints)



This is optional and should stay minimal.



---



\## Step 6 — Test checklist (definition of done)



Run:

pnpm run dev



Verify:



1\. App starts without errors

2\. Provider appears in Settings

3\. Provider is disabled until required config is set

4\. After setting API key:



&nbsp;  \* provider becomes enabled

&nbsp;  \* selecting provider + model works

5\. Error cases are readable:



&nbsp;  \* missing key

&nbsp;  \* invalid key (401/403)

&nbsp;  \* rate limit (429)



---



\## When to use Custom instead of a first-class provider



Use Custom when:



\* provider is purely OpenAI-compatible

\* you don’t care about onboarding polish

\* you want fastest experimentation



Create a first-class provider when:



\* you want presets

\* you want a default base URL

\* you want clearer errors

\* you want easier onboarding



---



\## Summary (mental model)



Backend:



\* Rust decides HOW requests are sent



Frontend:



\* App.js decides WHICH providers exist

\* Settings decides WHEN they are enabled

\* Presets decide WHAT users see first



If a provider:



\* works in backend

\* but does not appear in UI



You almost always forgot:



\* src/App.js → ALL\_PROVIDERS



---



End of file.



---

Note: please date stamp if updated then:
Commit + push:

git add DEV-ADD-PROVIDER.md
git commit -m "Docs: add provider implementation checklist"
git push

