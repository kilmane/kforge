Perfect — the document you have is a **great base**, so we’ll *extend it*, not mutate its tone or intent.
Below is an **updated version of `packaging-readiness.md`**, keeping:

* the same **style**
* clear **sectioning**
* calm, declarative **Project Law voice**
* easy scanning / copy-paste friendly formatting

I’ve **added three new topic sections**:

* Dependencies & external runtimes
* Auto-update strategy
* Manual / remote documentation updates

Nothing else is disturbed.

---

```md
## 📦 Project Law — Packaging Readiness

**Intent**  
KForge is designed from day one to be safely packaged as a desktop application (Windows first, macOS next) without architectural rewrites, platform-specific forks, or late-stage surprises.

This law exists to ensure future packaging does **not** introduce friction, regressions, hidden dependencies, or rushed refactors.

---

## 🖥️ Cross-Platform Considerations

### 1. Filesystem Discipline (Non-Negotiable)

* ❌ **Never assume Windows paths**
  * No hardcoded `C:\`, backslashes, or drive letters
* ✅ Always use platform-agnostic path handling
  * Relative paths where possible
  * OS-resolved app data / config directories
* ✅ Treat the filesystem as **restricted**
  * Assume read/write access is *not* guaranteed everywhere
  * Gracefully handle permission failures

**Design Principle:**

> “The filesystem is a privilege, not a guarantee.”

---

### 2. Permissions & Sandboxing Awareness

* Assume **macOS sandbox constraints** even when running in dev mode
* Avoid designs that rely on:
  * Writing outside app-controlled directories
  * Silent background file access
* All file access should be:
  * Explicit
  * User-initiated
  * Recoverable on failure

**Design Principle:**

> “If the user didn’t pick it, don’t touch it.”

---

### 3. Platform-Agnostic File UX

* All file interactions must go through **abstracted dialogs**
  * Open file
  * Save file
  * Select folder
* ❌ No raw path inputs exposed to users
* ❌ No assumptions about folder visibility or structure
* ✅ UI must work identically across Windows & macOS

**Design Principle:**

> “Users choose files — apps never guess.”

---

### 4. Environment Separation

* App logic must **not depend** on:
  * OS-specific environment variables
  * Shell commands
  * Platform-specific binaries
* Platform differences are handled only at:
  * Packaging layer
  * Shell / wrapper layer (future)

**Design Principle:**

> “Core logic is OS-blind.”

---

## 🔌 Dependencies & External Runtimes

### 5. Dependency Readiness (No Hidden Requirements)

* KForge must **never assume** external tools are installed
  * Examples: Node.js, npm, Git, Docker, language runtimes
* Any feature that depends on external tooling must:
  * Detect the dependency **before execution**
  * Fail early, clearly, and calmly
  * Explain *what is missing* and *why it is needed*

* Users must be guided with:
  * Clear instructions
  * Copyable install commands
  * Platform-specific help where relevant

**Design Principle:**

> “Never let the user discover a dependency by failure.”

---

## 🔄 Application Auto-Update Strategy

### 6. Auto-Updates (When Viable)

* Desktop auto-update is **recommended** once KForge reaches public beta
* Auto-updates should:
  * Reduce user friction
  * Deliver fixes without reinstalling
  * Feel invisible and professional
* Auto-update mechanisms are:
  * Deferred until shipping readiness
  * Implemented per platform (Windows first, macOS next)

Auto-updates **do not replace** the need for remote documentation or guidance updates.

**Design Principle:**

> “Update the app quietly. Don’t interrupt the user’s flow.”

---

## 📄 Manual & Remote Documentation Updates

### 7. Documentation & Guidance Strategy

* User guidance (e.g. dependency install steps, troubleshooting, links) should:
  * Live in GitHub or a remote source
  * Be fetchable by the app when needed
  * Be updateable **without rebuilding the app**
* The app may cache guidance locally, with safe fallbacks when offline

This reduces:
- GitHub clutter inside the app
- Rebuilds for simple instruction changes
- User confusion when external tools change

**Design Principle:**

> “Ship binaries slowly. Update knowledge instantly.”

---

## ⏳ Deferred Packaging, Early Readiness

### 8. Packaging Is Deferred — Constraints Are Not

* Desktop packaging is **explicitly deferred**
* Packaging constraints are **designed for now**
* No premature build pipelines
* No platform-specific code unless strictly unavoidable

**Design Principle:**

> “Prepare early. Ship later. Never rush packaging.”

---

## 🧭 Summary Rule (The One-Liner)

> **If a feature would break when packaged, it’s not done — even if it works in the browser.**
```

---

### Final note from the bridge ⚓

This file is now exactly what it should be:

* One **authoritative internal document**
* Covers *all* packaging-related concerns
* Still calm, readable, and future-proof
* No pressure to act on it until the time is right

You parked the *work*, but you didn’t lose the *wisdom*.
That’s the mark of a good captain.
