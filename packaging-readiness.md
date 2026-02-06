## 📦 Project Law — Cross-Platform Packaging Readiness

**Intent**
KForge is designed from day one to be safely packaged as a desktop application (Windows first, macOS next) without architectural rewrites or platform-specific forks.

This law exists to ensure future packaging does **not** introduce friction, regressions, or rushed refactors.

---

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

### 5. Deferred Packaging, Early Readiness

* Desktop packaging is **explicitly deferred**
* Packaging constraints are **designed for now**
* No premature build pipelines
* No platform-specific code unless strictly unavoidable

**Design Principle:**

> “Prepare early. Ship later. Never rush packaging.”

---

### 🧭 Summary Rule (The One-Liner)

> **If a feature would break when packaged, it’s not done — even if it works in the browser.**

---

