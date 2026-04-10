// src/ai/capabilities/kforgeCapabilities.js

import { listKforgeServiceWorkflows } from "./kforgeServiceWorkflows";
import { buildKforgePreviewWorkflowManifest } from "./kforgePreviewWorkflows";
import { listKforgeTerminalWorkflows } from "./kforgeTerminalWorkflows";
import { discoverCapabilities } from "./discoverCapabilities";

/*
AI-facing formatter.
Turns structured KForge workflows into compact prompt context.
*/

function pushSection(lines, title, values) {
  if (!Array.isArray(values) || values.length === 0) return;
  lines.push(`${title}:`);
  for (const value of values) {
    lines.push(`- ${value}`);
  }
}

function pushKforgePaths(lines, kforgePaths) {
  if (!kforgePaths || typeof kforgePaths !== "object") return;

  lines.push("KForge paths:");

  if (kforgePaths.primary) {
    lines.push(`- Primary path: ${kforgePaths.primary}`);
  }

  if (kforgePaths.beginner) {
    lines.push(`- Beginner path: ${kforgePaths.beginner}`);
  }

  if (kforgePaths.step_by_step) {
    lines.push(`- Step-by-step path: ${kforgePaths.step_by_step}`);
  }

  if (Array.isArray(kforgePaths.follow_up)) {
    for (const step of kforgePaths.follow_up) {
      lines.push(`- Follow-up step: ${step}`);
    }
  }

  if (Array.isArray(kforgePaths.optional_steps)) {
    for (const step of kforgePaths.optional_steps) {
      lines.push(`- Optional step: ${step}`);
    }
  }
}

function pushWorkflow(lines, workflow) {
  lines.push(
    `${workflow.name} [${workflow.status}] — ${workflow.route} — ${workflow.summary}`,
  );

  pushSection(lines, "Prerequisites", workflow.prerequisites);
  pushSection(lines, "Preferred AI behavior", workflow.preferred_ai_behavior);
  pushSection(
    lines,
    "First response template",
    workflow.first_response_template,
  );

  pushKforgePaths(lines, workflow.kforge_paths);
  pushSection(lines, "Service notes", workflow.service_notes);
  pushSection(lines, "Environment variables", workflow.env_vars);
  pushSection(lines, "Supported templates", workflow.supported_templates);
  pushSection(lines, "Manual fallback", workflow.manual_fallback);

  lines.push("");
}

function pushDiscovered(lines, capabilities, options = {}) {
  if (!capabilities || capabilities.length === 0) return;

  const hideTemplateCapabilities =
    options.projectOpen && options.detectedTemplateName;

  const filteredCapabilities = hideTemplateCapabilities
    ? capabilities.filter(
        (cap) => !String(cap?.name || "").startsWith("Template: "),
      )
    : capabilities;

  if (filteredCapabilities.length === 0) return;

  lines.push("=== Discovered KForge Capabilities ===");

  for (const cap of filteredCapabilities) {
    lines.push(`${cap.name} [${cap.status}] — ${cap.route} — ${cap.summary}`);
  }

  lines.push("");
}
function hasManualIntent(message = "") {
  const text = String(message || "").toLowerCase();

  const manualHints = [
    "manually",
    "manual",
    "manual steps",
    "manual setup",
    "just give me the commands",
    "give me the commands",
    "don't use kforge",
    "do not use kforge",
    "bypass kforge",
    "without kforge",
  ];

  return manualHints.some((hint) => text.includes(hint));
}

function filterRelevantWorkflows(workflows, userMessage) {
  if (!userMessage || userMessage.trim().length < 4) {
    return workflows;
  }

  const message = userMessage.toLowerCase().trim();
  if (hasManualIntent(message)) {
    return [];
  }
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "to",
    "of",
    "for",
    "in",
    "on",
    "at",
    "by",
    "with",
    "from",
    "my",
    "me",
    "i",
    "you",
    "it",
    "this",
    "that",
    "please",
    "just",
    "help",
    "build",
    "make",
    "create",
  ]);

  const terms = message
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9_-]/g, ""))
    .filter((term) => term.length >= 3)
    .filter((term) => !stopWords.has(term));

  const explicitWorkflowHints = [
    "preview",
    "run",
    "start",
    "test",
    "open preview",
    "generate",
    "scaffold",
    "template",
    "supabase",
    "github",
    "git",
    "stripe",
    "deploy",
    "deployment",
    "terminal",
    "npm",
    "pnpm",
    "yarn",
    "install",
    "package",
  ];

  const hasExplicitWorkflowHint = explicitWorkflowHints.some((hint) =>
    message.includes(hint),
  );

  const filtered = workflows.filter((workflow) => {
    const text =
      `${workflow.name} ${workflow.summary} ${workflow.route}`.toLowerCase();

    return terms.some((term) => text.includes(term));
  });

  if (filtered.length > 0) {
    return filtered;
  }

  if (hasExplicitWorkflowHint) {
    return workflows;
  }

  return [];
}

export function buildKforgeCapabilitySummary(userMessage = "", options = {}) {
  const workflows = [
    ...listKforgeServiceWorkflows(),
    buildKforgePreviewWorkflowManifest(),
    ...listKforgeTerminalWorkflows(),
  ];

  const discovered = discoverCapabilities();
  const filteredWorkflows = filterRelevantWorkflows(workflows, userMessage);

  const lines = [];

  lines.push("=== KForge Workflow Awareness ===");
  lines.push(
    "Global rule: use KForge workflow handoff first only when the user's goal is actually a KForge-managed workflow.",
  );
  lines.push(
    "Examples of KForge-managed workflows include service setup, deployment setup, preview/run actions, terminal actions, and explicit template generation.",
  );
  lines.push(
    "Do not hand off to a KForge workflow just because KForge has a related capability.",
  );
  lines.push(
    "If a project is already open and the user is asking to build, add, edit, or implement product code, treat that as in-project implementation work by default.",
  );
  lines.push(
    "Do not avoid normal project file edits merely because a related KForge workflow exists.",
  );
  lines.push(
    "Only hand off when the user is actually asking for that workflow, or when the workflow is the most truthful path for the requested action.",
  );
  lines.push(
    "When handing off to a KForge workflow, do not ask how the user would like to proceed.",
  );
  lines.push(
    "Do not append a chat-style follow-up question after the KForge handoff.",
  );
  lines.push(
    "End the response after the KForge handoff and the manual-bypass note.",
  );
  lines.push(
    "Only continue solving inside chat when the user explicitly chooses to bypass KForge, or when the request is normal in-project implementation work.",
  );
  lines.push("");
  lines.push("=== Model Usage Hints ===");
  lines.push(
    "Default to pnpm for install and package commands unless the project clearly indicates npm or yarn.",
  );
  lines.push(
    "For dependency installation guidance, use pnpm install by default.",
  );
  lines.push(
    "For package installation guidance, use pnpm add <package> by default.",
  );
  lines.push(
    "Do not present npm or yarn alternatives unless the user explicitly asks for them or the project clearly requires them.",
  );
  lines.push(
    "For common JavaScript or TypeScript dev server guidance, use pnpm dev by default unless the project clearly indicates another command.",
  );
  lines.push(
    "If the user explicitly says not to use KForge, do not route to KForge panels or Services and stay fully in manual guidance mode.",
  );
  lines.push(
    "In manual guidance mode, avoid extra KForge follow-up suggestions unless the user asks for KForge again.",
  );
  lines.push(
    "Do not require an open project folder for advisory-only answers or manual setup instructions.",
  );
  lines.push("");
  for (const workflow of filteredWorkflows) {
    pushWorkflow(lines, workflow);
  }

  const filteredDiscovered = filterRelevantWorkflows(discovered, userMessage);
  pushDiscovered(lines, filteredDiscovered, options);

  lines.push("=== End KForge Workflow Awareness ===");
  lines.push("");

  return lines.join("\n");
}
