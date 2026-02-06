This is a **really solid document already** 👍
What I’ll do now is:

* clean the language (basic, user-friendly English)
* improve **structure**
* make headings **bold and visually clear**
* keep it **Markdown-friendly** (easy to read on GitHub Pages)
* avoid jargon where possible

Below is a **polished version you can copy-paste directly** into
`docs/terminology.md`.

---

# 🧭 Terminology: Pills, Notes, Tiers, Usage, Cost

This document explains the words used in the **Presets / Suggestions UI** in simple terms.

---

## 🏷️ Pills (Labels)

**“Pills”** is developer slang.
It simply means **small rounded labels** shown in the UI.

They are used to show **quick information at a glance**.

### Examples of pills

* Sandbox
* Main
* Heavy
* Free
* Paid

There are **three types of pills** in KForge:

* **Tier pills**
* **Usage pills**
* **Cost pills**

> ⚠️ They may look similar in the UI, but they represent **different ideas**.

---

## 📝 Notes

**Notes** are short text lines shown **under a suggested (preset) model**.

### Examples

* “Rotating”
* “Rotating / rate-limited”
* “Availability may change”

Notes explain **what to expect from the model**.

### What the notes mean

#### **Rotating**

* The model endpoint is part of a shared pool
* The actual backend model may change
* Speed and behavior may vary

#### **Rotating / rate-limited**

* Same as *Rotating*
* Plus: you may hit usage limits or throttling
* Very common on free models

#### **Availability may change**

* The model may disappear or be renamed
* It may be temporarily unavailable
* Typical for free or experimental models

> ℹ️ Notes are **warnings and expectations**, not errors.

---

## 🧱 Tier Pills

**Tier pills** describe how the model is positioned in the system.

### Examples

* Sandbox
* Main
* Heavy

### What tiers mean (simple view)

* **Sandbox** → experimental, free, unstable, or limited
* **Main** → normal, stable, general-purpose usage
* **Heavy** → powerful, expensive, or resource-heavy

> ✅ Tier pills are **always shown** in the UI.

---

## 🛠️ Usage Pills (Usage Modes)

**Usage pills** describe **how a model is intended to be used**.

### Examples

* **Sandbox** — testing, quick experiments, throwaway work
* **Main** — day-to-day default usage
* **Heavy** — high capability; use sparingly

### Important note

* In the current UI, **usage and tier often use the same words**
* Usage is sometimes **mapped into tier**
* So yes: right now, **usage pills and tier pills may look the same**

Internally, however:

* **Tier** and **Usage** are **separate concepts**
* This separation allows **future UI improvements**

---

## 💰 Cost Pills

**Cost pills** describe whether a model is free or paid.

They may also use **colors** to give a quick visual hint.

### Cost labels (with colors)

* 🔵 **Free** — no cost, often limited or rotating
* 🟢 **Paid (low cost)**
* 🟡 **Paid (standard)**
* 🔴 **Paid (expensive)**
* ⚪ **Unknown** — provider-dependent or unclear

---

## ✅ Important Summary

* **Pills** = small labels in the UI
* **Tier** = system level (sandbox / main / heavy)
* **Usage** = intended use of the model
* **Cost** = free or paid
* **Notes** = human-readable warnings and expectations

---

If you want, next time we can:

* add screenshots
* simplify it even further for non-technical users
* or link each section directly from the Help menu

This is **excellent documentation** — clear, honest, and user-friendly 👏
