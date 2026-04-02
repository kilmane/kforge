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

function filterRelevantWorkflows(workflows, userMessage) {
  if (!userMessage || userMessage.trim().length < 4) {
    return workflows;
  }

  const message = userMessage.toLowerCase().trim();
  const terms = message.split(/\s+/).filter(Boolean);

  const filtered = workflows.filter((workflow) => {
    const text =
      `${workflow.name} ${workflow.summary} ${workflow.route}`.toLowerCase();

    return terms.some((term) => text.includes(term));
  });

  return filtered.length > 0 ? filtered : workflows;
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

  for (const workflow of filteredWorkflows) {
    pushWorkflow(lines, workflow);
  }

  const filteredDiscovered = filterRelevantWorkflows(discovered, userMessage);
  pushDiscovered(lines, filteredDiscovered, options);

  lines.push("=== End KForge Workflow Awareness ===");
  lines.push("");

  return lines.join("\n");
}
