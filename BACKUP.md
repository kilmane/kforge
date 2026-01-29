# KForge Backup & Recovery (Canonical)

This document defines the official backup and recovery procedure for the KForge project.

The goal is to ensure that KForge can always be recovered after:
- disk failure
- accidental deletion
- corruption
- machine replacement

Backups are intentionally lean:
- include source code and configuration
- exclude reproducible dependencies and build artifacts
- exclude git history (already backed up on GitHub)

This keeps backups small, fast, and reliable.

---

## What is excluded (and why)

### node_modules
JavaScript dependencies downloaded by pnpm.

- Not source code
- Fully reproducible from:
  - package.json
  - pnpm-lock.yaml

Recreated with:
  pnpm install

---

### src-tauri/target
Rust build output produced by Cargo.

- Not source code
- Fully reproducible from:
  - Cargo.toml
  - Cargo.lock
  - Rust toolchain

Recreated with:
  pnpm dlx @tauri-apps/cli dev

---

### .git
Git history and metadata.

- Canonical backup already exists on GitHub
- ZIP backups focus on the working tree, not history
- ZIP restores do NOT restore git history

If .git is lost and was never pushed to GitHub, it cannot be recovered.

---

## Backup methods (Windows)

### Preferred method (recommended)

Use the scripted backup:

  scripts/backup.ps1

This method is:
- fast
- reliable on Windows
- verified to preserve folder structure
- verified to exclude large / reproducible directories

Example:

  cd D:\
  .\kforge\scripts\backup.ps1 -Milestone "phase-3.2"

The resulting ZIP is created in:
  D:\kforge-phase-3.2.zip

---

### Manual fallback method (Windows, reliable)

If the script cannot be used, the following manual robocopy-based method
is the official fallback.

This method is preferred over tar because tar --exclude has proven unreliable
on Windows environments.

Run from the parent directory of kforge (example: D:\).

Step 1: Create a staging folder

  mkdir D:\_kforge_backup_stage
  mkdir D:\_kforge_backup_stage\kforge

Step 2: Copy project files with exclusions

  robocopy D:\kforge D:\_kforge_backup_stage\kforge /E ^
    /XD node_modules .git target ^
    /R:1 /W:1 /NFL /NDL /NP

This excludes:
- node_modules
- .git
- src-tauri\target (and any other target directories)

Step 3: Create ZIP archive

  Compress-Archive D:\_kforge_backup_stage\kforge D:\kforge-phase-3.2.zip

Step 4: Clean up staging folder

  rmdir /s /q D:\_kforge_backup_stage

Result:
- D:\kforge-phase-3.2.zip
- Contains full project source and structure
- Safe to upload to cloud storage

---

### Deprecated method (do not use on Windows)

The following method is intentionally NOT recommended on Windows:

  tar -acf kforge-phase-3.2.zip kforge --exclude=...

Reason:
- tar --exclude has been observed to ignore exclusions
- produces misleadingly large archives
- emits non-fatal warnings while still including excluded folders

---

## Recovery after total loss of kforge

There are two supported recovery paths.

---

### Recovery path A — Restore from GitHub (canonical)

This is the preferred recovery method when GitHub access is available.

Using script:

  scripts/restore_github.ps1

Or manually:

  git clone https://github.com/YOUR_USERNAME/kforge.git
  cd kforge
  pnpm install
  pnpm dlx @tauri-apps/cli dev

This restores:
- full source code
- full git history (.git)
- branches and tags
- clean development environment

---

### Recovery path B — Restore from ZIP snapshot (working-state recovery)

This method restores the project files but does NOT restore git history.

Using script:

  scripts/restore_zip.ps1 -ZipPath D:\kforge-phase-3.2.zip

Or manually:

  tar -xf kforge-phase-3.2.zip
  cd kforge
  pnpm install
  pnpm dlx @tauri-apps/cli dev

After ZIP restore:
- the project works normally
- .git is NOT present
- git history is NOT restored

To regain git history after ZIP restore, GitHub must be used.

---

## API keys and secrets (important)

API keys are stored in the operating system keyring and are NOT included in:
- ZIP backups
- GitHub restores

After a fresh restore, API keys may need to be re-entered.

This is expected behavior and intentional for security reasons.

---

## Practical recommendation (balanced approach)

There is no need to create ZIP backups obsessively.

A sane and effective strategy is:

GitHub:
- push frequently
- commit and tag milestones

ZIP:
- create one ZIP per major phase
- store it in cloud storage
- forget about it unless disaster strikes

GitHub preserves history.
ZIP preserves a working snapshot.
Together, they provide full coverage.

---

## Status guarantee

When this procedure is followed:
- KForge is fully recoverable
- source code is safe
- git history is safe (via GitHub)
- development can resume quickly on any machine
