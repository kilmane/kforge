[← Docs home](index.md)

---

# Model Colour + Label System

KForge uses a simple colour-based labelling system to help users quickly understand
the expected cost, risk, and usage profile of a model.

These labels are designed for human decision-making, not billing precision.

---

## Label Overview

| Label | Cost Meaning | Typical Use |
|---|---|---|
| 🔵 Free — Sandbox | Free models | Testing / experimentation |
| 🟢 Paid — Sandbox | Low-cost paid models | Testing / experimentation |
| 🟡 Paid — Main | Mid-cost paid models | Default development work |
| 🔴 Paid — Heavy | High-cost paid models | Complex / critical tasks |
| ⚪ Unknown | Pricing unclear | Use with caution |

---

## 🔵 Free — Sandbox

### Meaning
- No billing required
- Provider-controlled limits
- Often rate-limited or capability-capped

### Usage
- Safe to experiment
- Ideal for quick tests and learning
- “Mess around mode”

---

## 🟢 Paid — Sandbox

### Meaning
- Paid, but cheap
- Low per-request cost
- Designed to be disposable

### Usage
- Safe for testing and iteration
- OK to spam
- “Mess around mode (paid)”

**Examples:**
- `gpt-5.4-nano`
- `gpt-4.1-nano`

**Tooltip:**
Low-cost paid model. Suitable for testing and experimentation.

---

## 🟡 Paid — Main

### Meaning
- Paid
- Reasonably priced
- Balanced capability vs cost

### Usage
- Default development work
- Your day-to-day workhorse
- Be mindful, not paranoid

**Examples:**
- `gpt-5.4-mini``
- strong gateway / general-purpose models

**Tooltip:**
Balanced paid model for daily development.

---

## 🔴 Paid — Heavy

### Meaning
- Expensive
- High capability
- Optimised for quality, not volume

### Usage
- Complex reasoning
- Accuracy-critical tasks
- Think before spamming

**Examples:**
- high-end models
- advanced reasoning models

**Tooltip:**
High-cost model. Use when accuracy matters.

---

## ⚪ Unknown

### Meaning
- Pricing unclear
- Custom endpoints
- Gateway- or provider-dependent

### Usage
- Use with caution
- Assume paid until proven otherwise

---

## Important Notes

- These labels are **informational only**
- Billing, limits, and availability are determined by the provider
- Users assign labels manually per model
- Labels describe expected usage patterns, not guarantees

KForge does not enforce cost or block usage.
The goal is clarity, not restriction.
---

[← Docs home](index.md)