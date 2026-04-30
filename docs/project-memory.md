[← Docs home](index.md)

---

📘 Project Memory (v1) — Keep the AI on track

Advanced feature · Optional · User-controlled

# 🧠 Project Memory (v1)


- Fully editable
- Stored inside your project
- Applied consistently to future prompts


### ❌ What it is *not*
- No background agents
- No autonomous decisions
- No silent edits
- No learning across projects
- No guessing what “matters”


Nothing happens unless **you** ask for it.


---


## 🧭 When should I use it?


Use Project Memory when:
- You care about **consistency across many prompts**
- You’re enforcing **rules or constraints**
- You want to avoid accidental refactors
- You’re working on a long-running project


If an instruction is **one-off**, just write it in the prompt.  
If you’ll need it again, **pin it**.


---


## 🧩 What it contains (v1)


Project Memory has three simple sections:


| Section | Purpose | Typical use |
|---|---|---|
| **Anchors** | Pin important context | “Never change the layout grid.” |
| **Decisions** | Approved rules | “All docs filenames must be lowercase.” |
| **Working Set** | Scope boundaries | `src/App.js`, `src/lib/fs.js` |


Each section is optional.  
Use only what you need.


---


## 📌 Anchors (most common)


Anchors are short pieces of context that should **always be remembered**.


### Good anchor examples
- “Do not refactor files outside `src/ui`.”
- “Prefer small patches over full rewrites.”
- “This project uses Tailwind only.”


### Tips
- Keep anchors short
- Avoid duplicates
- Delete anchors when they’re no longer relevant


> Less is more.  
> 1–5 anchors is usually plenty.


---


## 🧱 Decisions (rules you approve)


Decisions represent **explicit rules** for the project.


Workflow:
1. Propose a decision
2. Review it
3. Approve it (✅)


Only **approved** decisions are treated as constraints.


### Example decisions
- “All documentation filenames must be lowercase.”
- “External links must be opened via the Tauri shell.”


Use Decisions for rules you want to **lock in**.


---


## 🎯 Working Set (scope control)


The Working Set defines **which files are in scope**.


When a Working Set exists:
- Changes should stay inside those files
- If other files are needed, the assistant should ask first


### Example

src/App.js
src/components/Explorer.jsx



This is extremely useful for:
- Refactors
- Targeted fixes
- Avoiding accidental broad edits


---


## 🗂️ Project scope (important)


### Project Memory is **project-scoped**, not file-scoped.


It applies to the **folder you opened** in KForge.


Example:
- You open `D:\kforge`
- Memory applies to the entire `D:\kforge` project


If you open a subfolder as a project, memory will belong to that subfolder instead.


**Best practice:** always open the project root.


---


## 💾 Where memory is stored on disk


Project Memory is saved inside your project folder:



.kforge/project-memory.json



Example:

D:\kforge.kforge\project-memory.json



### Notes
- You can delete `.kforge/` at any time to reset memory
- It will be recreated automatically when you add memory again
- Do **not** commit `.kforge/` to git


---


## 👀 How do I know memory exists?


When Project Memory is closed, you may see a badge like:



Memory • 3



This number represents:
- Anchors
- Approved decisions
- Working set items


No transcript spam.  
No hidden behavior.


---


## 🧪 Troubleshooting


### “I don’t see any effect”
Check:
1. You opened the project folder in KForge
2. You added at least one anchor
3. You sent a new prompt after adding it


### “Why do I see multiple .kforge folders?”
A `.kforge/` folder is created **inside whichever folder you open**.


If you open different folders as projects, each may have its own `.kforge/`.


---


## 🧘 Suggested usage style (recommended)


- Use Project Memory sparingly
- Prefer clarity over quantity
- Remove anchors when done
- Treat it like a whiteboard, not a database


Project Memory exists to **reduce repetition**, not add complexity.


You are always in control.
---

[← Docs home](index.md)