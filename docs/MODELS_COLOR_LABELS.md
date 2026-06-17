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
| 🔵 Weak / test only | Free or rotating models | Testing / experimentation only |
| 🟢 Light / Everyday | Low-cost or limited paid models | Light work / careful edits |
| 🟡 Recommended builder | Builder-capable paid models | Default project work |
| 🔴 High capability | Higher-capability models | Complex / critical tasks |
| ⚪ Custom / unverified | Provider-dependent or unclear | Review carefully |

---

## 🔵 Weak / test only

### Meaning
- No billing required
- Provider-controlled limits
- Often rate-limited or capability-capped

### Usage
- Suitable for low-risk testing
- Useful for quick checks, learning, and non-critical prompts
- Not reliable for real project builds

---

## 🟢 Light / Everyday

### Meaning
- Lower-cost paid route
- Low per-request cost
- Limited capability compared with builder-focused models

### Usage
- Suitable for light work and careful iteration
- Not recommended for important project edits
- Guarded use only

**Examples:**
- `gpt-5.4-nano`
- `gpt-4.1-nano`

**Tooltip:**
Lower-cost or limited model. Suitable for light work and careful edits.

---

## 🟡 Recommended builder

### Meaning
- Paid
- Reasonably priced
- Balanced capability vs cost

### Usage
- Default development work
- Your normal project-work option
- Be mindful, not paranoid

**Examples:**
- `gpt-5.4-mini``
- strong gateway / general-purpose models

**Tooltip:**
Balanced paid model for daily development.

---

## 🔴 High capability

### Meaning
- Higher-cost or higher-capability route
- Stronger reasoning and coding capability
- Optimised for quality, not volume

### Usage
- Complex reasoning
- Accuracy-critical tasks
- Think before spamming

**Examples:**
- high-end models
- advanced reasoning models

**Tooltip:**
Higher-capability model. Use for complex or accuracy-sensitive tasks.

---

## ⚪ Custom / unverified

### Meaning
- Provider-dependent or unclear model quality
- Custom endpoints
- Gateway- or provider-dependent

### Usage
- Review carefully before use
- Treat as user-managed and unverified unless KForge explicitly curates it

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
