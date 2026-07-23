[← Docs home](index.md)

---

# Model Cost Colours and Capability Labels

KForge shows two separate facts about a model:

1. **Relative cost**, shown by colour.
2. **KForge workflow capability**, shown by a separate text label.

A colour never grants or removes project-editing permission.

## Relative cost colours

| Colour | Label | Meaning |
|---|---|---|
| 🔵 | Free | The route is known to have no direct model charge; provider limits may still apply |
| 🟢 | Lower relative cost | Broadly lower-cost than the other curated choices |
| 🟡 | Medium relative cost | Broadly mid-range among the curated choices |
| 🔴 | Higher relative cost | Broadly higher-cost among the curated choices |
| ⚪ | Cost unknown | KForge does not have enough trusted cost information |

These are KForge-created relative categories, not live provider prices. Check the
provider dashboard for actual charges, limits, and free-tier rules.

## Workflow capability labels

| Label | Meaning |
|---|---|
| **Project builder** | Approved for KForge's normal app-building and project-editing route |
| **Test-mode editing** | May edit only through KForge's existing guarded/test-mode choice |
| **Chat and planning** | Intended for questions, plans, explanations, and manual guidance; no automatic project editing |
| **Unclassified** | KForge has not approved this exact provider/model pair for a workflow capability |

Cost and capability can be combined in different ways:

- `gpt-5.6-luna` — 🟢 Lower relative cost · Test-mode editing
- `gpt-5.6-terra` — 🟡 Medium relative cost · Project builder
- `gpt-5.6-sol` — 🔴 Higher relative cost · Project builder
- an unknown manual model — ⚪ Cost unknown · Unclassified

## New and replacement models

Remote presets may supply a new model's exact ID, description, relative cost,
and menu order. They do not automatically grant Project builder permission.

Until KForge contains an approved capability entry for the exact provider/model
pair, the model is shown as **Unclassified** and cannot silently enter the
normal builder route. A replacement model does not inherit capability or cost
from a retired model merely because its name looks related.

## Working mode

The prompt area shows a separate **Working mode** control:

- **Test mode** suggests the provider's approved Test-mode model.
- **Project builder** suggests an approved Project builder where the provider
  has one.

The user may still choose a different model. Selecting a Project builder in Test
mode is allowed and produces a cost reminder. Selecting a guarded or
Unclassified model in Project builder mode does not upgrade it; the normal
capability gate remains active.

KForge does not rewrite provider model IDs, determine provider billing, or
weaken write approval and path-safety safeguards based on these labels.
