# Portability and Safety

KForge is designed to be **portable, local-first, and safe by default**.

This document explains what that means for you as a user.

---

## Core rule (non-negotiable)

**Workspace ≠ App Data**

This is a fundamental invariant in KForge.

- Your projects live **outside** app and cache directories
- App upgrades must **never** touch your work
- Clean reinstalls must be **safe by default**

You should always be able to:
- upgrade KForge
- reinstall KForge
- move between versions

…without risking your projects.

---

## What portability means for users

Portability in KForge means:

- Your work is not tied to a specific install
- Your data is not locked into hidden system paths
- You stay in control of where projects live

This makes it safe to:
- upgrade the app
- switch machines
- back up your work
- experiment without fear of data loss

---

## Why this matters

Many tools blur the line between:
- application data
- user projects

KForge deliberately does not.

Your work is **your work**.
The app is replaceable.

That separation is a core design principle.
This keeps Section 1 (your nugget) and expands it just enough to be meaningful to users.

B) Internal notes (preserved, cleaned, and clarified)
⬇️ COPY EVERYTHING BELOW — RAW MARKDOWN SOURCE ⬇️
(save as PORTABILITY-NOTES.md in repo root)

# Portability — Internal Notes

This document captures internal reasoning and lessons learned around
portability, packaging, and platform constraints.

It is not user-facing.

---

## Core invariant

Workspace ≠ App Data

- User projects must live outside app/cache directories
- App upgrades must never touch user work
- Clean reinstalls must be safe by default

This invariant must not be compromised.

---

## Portability lessons (macOS case study)

- macOS blocks unsigned / unnotarised apps (quarantine)
- Error messages are often misleading (“not supported”)
- Intel ≠ ARM ≠ Linux differences matter (WebView, signing, runtime)
- Native builds per OS are mandatory
- Wine is not a viable solution for a local-first tool

These constraints shape build and distribution decisions.

---

## Implications for KForge

- Tauri must be built per OS
- Separate binaries are acceptable and expected
- Clear install documentation is part of the product
- Portability is a first-class concern, not an afterthought