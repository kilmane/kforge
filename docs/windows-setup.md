# KForge Windows Setup Guide — Beta V1

Thank you for testing **KForge Beta V1**.

This guide is for beginners using Windows 11.

KForge can open by itself, but some project features need common developer tools installed on your computer.

---

## 1) Install KForge

Run the KForge installer file you received, for example:

```text
KForge_0.1.0_x64-setup.exe
```

If Windows shows a warning, continue only if you trust the file you received from us.

---

## 2) Install the main tools KForge uses

For normal KForge project work, install:

* **Git for Windows**
* **Node.js**
* **pnpm**

These tools help KForge create, install, run, and manage local web app projects.

---

## 3) Install Git for Windows

Git is used for local project history and repository work.

This is the easiest beginner way:

* Open your web browser
* Search for **Git for Windows**
* Open the **official Git install page**
* Download the latest **Windows x64 installer**
* Run the installer
* Keep the default options unless you know you want something different
* Click through **Next** and **Install** until it finishes

Git’s official Windows install page provides the standard Windows installer and also lists the official `winget` install command. ([git-scm.com][1])

### Optional command-line way for Git

Only use this if you are comfortable with PowerShell:

```powershell
winget install --id Git.Git -e --source winget
```

Microsoft’s `winget install` command is the standard Windows package-manager install command, and Git’s official Windows page publishes that exact Git command. ([Microsoft Learn][2])

---

## 4) Install Node.js

Node.js is needed for most React, Vite, and JavaScript app projects.

The easiest beginner way is the browser installer:

* Open your web browser
* Search for **Node.js download**
* Open the **official Node.js download page**
* Download the **Windows installer**
* Run it
* Keep the default options
* Finish the install

Node.js provides official Windows installer packages on its download pages. ([Node.js][3])

---

## 5) Install pnpm

pnpm is the package manager KForge uses for installing project dependencies.

After Node.js is installed:

* Open **PowerShell**
* Paste this command and press Enter:

```powershell
corepack enable pnpm
```

pnpm’s official installation guide says that enabling pnpm through Corepack will automatically install pnpm on your system. ([pnpm.io][4])

---

## 6) Check that the main tools worked

Still in PowerShell, run these one by one:

```powershell
git --version
node -v
pnpm -v
```

If all three return a version number, your basic KForge setup is ready.

---

## 7) Optional: install GitHub CLI if you want to use GitHub from KForge

This step is **optional**.

You only need this if you want to use KForge’s GitHub features, such as:

* publishing a project to GitHub
* creating a GitHub repository from KForge
* pushing project changes to GitHub
* pulling latest changes from GitHub
* opening the GitHub repository from KForge

KForge’s GitHub workflow is available inside:

**Services → Code → GitHub**

To use that workflow, your computer needs **GitHub CLI** installed.

GitHub CLI is different from Git:

* **Git for Windows** gives you the `git` command.
* **GitHub CLI** gives you the `gh` command.

KForge uses GitHub CLI to connect to your GitHub account and create/push repositories.

### Beginner way to install GitHub CLI

* Open your web browser
* Search for **GitHub CLI**
* Open the **official GitHub CLI page**
* Download the Windows installer
* Run the installer
* Keep the default options

The official GitHub CLI website provides Windows installation options, including `winget`. ([GitHub CLI][5])

### Optional command-line way for GitHub CLI

Only use this if you are comfortable with PowerShell:

```powershell
winget install --id GitHub.cli -e --source winget
```

---

## 8) Optional: sign in to GitHub CLI once

This step is only needed if you want to use GitHub from KForge.

After installing GitHub CLI:

* Open **PowerShell**
* Run:

```powershell
gh auth login
```

Follow the sign-in instructions.

The normal GitHub CLI sign-in flow opens a browser and stores an authentication token securely in the system credential store when available. ([GitHub CLI manual][6])

After this is done once, KForge can use:

**Services → Code → GitHub**

to publish and push your project without asking you for your GitHub password each time.

---

## 9) Check GitHub CLI worked

Only do this if you installed GitHub CLI.

In PowerShell, run:

```powershell
gh --version
gh auth status
```

If `gh --version` shows a version number and `gh auth status` says you are logged in, GitHub publishing from KForge should be ready.

---

## 10) Restart KForge

After installing Git, Node.js, pnpm, or GitHub CLI:

* fully close KForge
* open it again

This helps KForge detect the new tools correctly.

---

## 11) If something does not work

If KForge says it cannot find `git`, `node`, `pnpm`, or `gh`:

* make sure the installer finished successfully
* close and reopen PowerShell
* restart KForge
* if pnpm is missing, run `corepack enable pnpm` again
* if GitHub publishing fails, run `gh auth status` to check whether you are signed in

Remember:

* GitHub CLI is optional.
* You only need it if you want to use GitHub publishing, push, pull, or open-repository features from KForge.

---

# Installation — shorter version

## KForge Beta V1 — easy setup

1. Install KForge by running the setup file you received.

2. Install Git:

   * Open your browser
   * Search: **Git for Windows**
   * Open the official page
   * Download the Windows x64 installer
   * Run it and keep the default options

3. Install Node.js:

   * Open your browser
   * Search: **Node.js download**
   * Open the official page
   * Download the Windows installer
   * Run it and keep the default options

4. Install pnpm:

   * Open PowerShell
   * Paste:

```powershell
corepack enable pnpm
```

5. Check the main tools:

```powershell
git --version
node -v
pnpm -v
```

6. Optional GitHub support:

   If you want to publish and push projects to GitHub from inside KForge, also install **GitHub CLI**.

   Beginner way:

   * Search for **GitHub CLI**
   * Open the official GitHub CLI page
   * Download and run the Windows installer

   Optional PowerShell way:

```powershell
winget install --id GitHub.cli -e --source winget
```

7. Optional GitHub sign-in:

```powershell
gh auth login
```

8. Optional GitHub check:

```powershell
gh --version
gh auth status
```

9. Close and reopen KForge.

---

[1]: https://git-scm.com/install/windows
[2]: https://learn.microsoft.com/windows/package-manager/winget/install
[3]: https://nodejs.org/en/download
[4]: https://pnpm.io/installation
[5]: https://cli.github.com/
[6]: https://cli.github.com/manual/gh_auth_login

---

[← Docs home](index.md)
