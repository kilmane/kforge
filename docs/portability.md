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
