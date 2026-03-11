# User Guide Notes (development capture)

These notes record user-facing behaviours during development so they are not forgotten when writing the official guide.
Below some suggested sections, which is likely to grow and also, each section grows slowly during development

AI Panel
Preview Runner
Explorer
Focus Mode
AI Editing
Templates
Settings
Dev Tools
---

## Preview Runner

Behaviour:

Opening a project folder automatically disables Focus Mode so the file explorer becomes visible.

This allows the user to navigate the project tree.

When the user clicks **Preview**, KForge automatically switches back to **Focus Mode** so the Preview Runner panel is fully visible.

User mental model:

Open Folder → explore files  
Preview → focus on the running app

This behaviour is intentional and avoids manual layout switching.