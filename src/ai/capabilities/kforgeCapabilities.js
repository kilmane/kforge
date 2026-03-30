// src/ai/capabilities/kforgeCapabilities.js

import { listKforgeServiceWorkflows } from "./kforgeServiceWorkflows";
import { buildKforgePreviewWorkflowManifest } from "./kforgePreviewWorkflows";
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

/*
Push discovered capabilities (lighter formatting)
*/

function pushDiscovered(lines, capabilities) {
  if (!capabilities || capabilities.length === 0) return;

  lines.push("=== Discovered KForge Capabilities ===");

  for (const cap of capabilities) {
    lines.push(`${cap.name} [${cap.status}] — ${cap.route} — ${cap.summary}`);
  }

  lines.push("");
}

export function buildKforgeCapabilitySummary() {
  const workflows = [
    ...listKforgeServiceWorkflows(),
    buildKforgePreviewWorkflowManifest(),
  ];

  const discovered = discoverCapabilities();

  const lines = [];

  lines.push("=== KForge Workflow Awareness ===");
  lines.push(
    "Global rule: if a workflow exists in KForge, guide the user to that KForge workflow first.",
  );
  lines.push(
    "Do not perform that workflow inside chat unless the user explicitly says they want to bypass KForge.",
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
    "Only continue solving inside chat when the user explicitly chooses to bypass KForge.",
  );
  lines.push("");

  for (const workflow of workflows) {
    pushWorkflow(lines, workflow);
  }

  pushDiscovered(lines, discovered);

  lines.push("=== End KForge Workflow Awareness ===");
  lines.push("");

  return lines.join("\n");
}
