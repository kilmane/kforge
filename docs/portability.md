Section 1 — Core Rule

Workspace ≠ App Data
User projects must live outside app/cache directories
App upgrades must never touch user work
Clean reinstalls must be safe by default
(This becomes a non-negotiable invariant)


Section 2 — Portability Lessons (macOS case study)

macOS blocks unsigned / unnotarised apps (quarantine)
Error messages are misleading (“not supported”)
Intel ≠ ARM ≠ Linux matters (WebView + signing)
Native builds per OS are mandatory
Avoid Wine as a “solution” for local-first tools


Section 3 — Implication for KForge

Tauri must be built per OS
Separate binaries are acceptable and expected
Clear install docs are part of the product
Portability is a first-class concern, not an afterthought