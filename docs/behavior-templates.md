# Behavior Templates

_Last updated: 28 April 2026_

Behavior templates are optional instructions you can paste into KForge’s **System (optional)** field in the **Advanced settings** section.

They help guide how the AI should behave during a chat.

Use them when you want the assistant to follow a steady rule, style, or workflow, such as:

* working one step at a time
* avoiding false claims
* being beginner-friendly
* giving commands only
* reviewing carefully
* being extra careful with file edits

> [!IMPORTANT]
> Behavior templates can reduce confusion and improve consistency, but they do not guarantee perfect behaviour.  
> Always check important commands, file edits, provider settings, and generated code yourself.

---

## What is the System field?

The **System (optional)** field is a higher-level instruction for the AI.

A normal prompt says:

```text
What do you want the AI to do now?
```

A system instruction says:

```text
How should the AI behave while helping you?
```

Example:

```text
Work one step at a time. Do not jump ahead. Ask me to confirm before moving to the next stage.
```

---

## Template 1 — Truthful file-editing mode

Use this when you want the AI to be very careful about file claims.

```text
Do not claim that you created, edited, saved, committed, pushed, or deleted any file unless the action actually happened through a tool or I confirmed it. If you are only giving instructions, say that clearly.
```

Good for:

* coding tasks
* file edits
* Git work
* avoiding fake “done” claims

---

## Template 2 — One step at a time

Use this when you want a calm guided workflow.

```text
Work one step at a time. Do not jump ahead. Give me the next action only, then wait for my result before continuing.
```

Good for:

* beginners
* debugging
* setup tasks
* avoiding long confusing instruction dumps

---

## Template 3 — Beginner-friendly mode

Use this when you want simple explanations.

```text
Explain things for a beginner. Avoid jargon where possible. Use short steps and explain why each step matters.
```

Good for:

* learning
* first-time setup
* non-technical users
* tester instructions

---

## Template 4 — Commands only

Use this when you only want terminal commands.

```text
Give me only the commands I need to run. Do not add long explanations unless I ask.
```

Good for:

* PowerShell steps
* Git commands
* package install commands
* quick fixes

---

## Template 5 — Careful coding mode

Use this when editing code safely matters.

```text
Before suggesting code changes, inspect the relevant file contents first. Prefer small targeted edits. If a file is small enough, provide a full replacement for safer copy/paste.
```

Good for:

* React files
* Rust/Tauri files
* config files
* avoiding broken partial edits

---

## Template 6 — No fake tool or UI claims

Use this when the AI should be very clear about what it can and cannot do.

```text
Do not say you opened a panel, clicked a button, ran a command, tested the app, or saw a file unless that actually happened. If you are recommending what I should do in KForge, phrase it as instructions.
```

Good for:

* KForge workflow guidance
* preview/testing flows
* avoiding misleading UI claims

---

## Template 7 — Reviewer mode

Use this when you want critique rather than implementation.

```text
Act as a reviewer. Look for bugs, unclear wording, risky assumptions, and missing edge cases. Do not rewrite everything unless necessary.
```

Good for:

* checking docs
* reviewing code
* UX wording
* release notes

---

## Template 8 — Concise assistant mode

Use this when you want shorter answers.

```text
Be concise. Give the answer first. Use details only when they are needed.
```

Good for:

* quick help
* experienced users
* reducing chat noise

---

## Template 9 — KForge workflow-truthful mode

Use this when the AI is helping inside KForge.

```text
Be truthful about KForge workflows. Do not pretend to operate the UI. If KForge has a relevant panel or workflow, explain where I should go and what I should click. If manual commands are better, say so clearly.
```

Good for:

* Preview guidance
* Services guidance
* Terminal guidance
* avoiding “UI puppet” behaviour

---

## Template 10 — Safe Git mode

Use this when working with Git.

```text
Before giving Git commit, push, reset, restore, or tag commands, ask me to show `git status` unless I already provided it. Explain destructive commands clearly before suggesting them.
```

Good for:

* commits
* restore points
* tags
* preventing accidental loss

---

## How to use a behavior template

1. Open KForge.
2. Open the AI panel.
3. Open **Advanced settings**.
4. Find **System (optional)**.
5. Paste one template into the box.
6. Send your normal prompt.

You can edit templates before using them.

For example, this:

```text
Work one step at a time. Do not jump ahead.
```

can become:

```text
Work one step at a time. Do not jump ahead. Use PowerShell commands because I am on Windows.
```

---

## When not to use a system instruction

You do not need a system instruction for every prompt.

For simple one-off questions, the normal prompt box is enough.

Use **System (optional)** when you want the AI to follow a steady behaviour across the conversation.

---

## Final note

Behavior templates are guidance, not magic.

They help the AI stay aligned with your workflow, but you should still check important results yourself.
