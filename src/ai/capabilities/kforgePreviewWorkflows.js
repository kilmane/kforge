// src/ai/capabilities/kforgePreviewWorkflows.js
import { listScaffoldTemplates } from "../../runtime/templateRegistry";

function buildTemplateNames() {
  return listScaffoldTemplates().map((template) => template.name);
}

export function buildKforgePreviewWorkflowManifest() {
  const templateNames = buildTemplateNames();

  return {
    id: "preview",
    name: "Preview",
    route: "Preview",
    status: "available",
    summary:
      "KForge can preview the current open project, and can scaffold a new supported template project from the Preview panel only when the user explicitly wants a new scaffold.",
    prerequisites: [
      "A project folder must be open before using Preview or Generate.",
    ],
    kforge_paths: {
      primary: "Preview",
      follow_up: ["Install if needed", "Preview"],
      optional_steps: ["Generate for a new supported template"],
    },
    supported_templates: templateNames,
    preferred_ai_behavior: [
      "If the user asks to preview, run, start, test, or view the current project, guide them to Preview first, not Generate.",
      "Only mention Generate when the user explicitly wants to scaffold a new supported template project.",
      "Do not route to Generate just because the user asked to create an app, page, feature, component, UI, or screen inside an already-open project.",
      "If a project folder is already open, implementation requests should usually be treated as edits to the current project, not as a new scaffold request.",
      "Do not start manually creating template boilerplate in chat when KForge Preview can generate a new template and the user explicitly asked for a new scaffold.",
      "If no project folder is open, tell the user to open a folder first.",
      "After recommending Preview for run/preview actions, explicitly tell the user they can leave the chat and continue in Preview.",
      "Only move into manual run commands if the user explicitly says they want to bypass KForge.",
    ],
    first_response_template: [
      "KForge can help with this through the Preview panel.",
      "First make sure a project folder is open.",
      "You can now leave the chat and open: Preview.",
      'Use "Preview" to run the current project.',
      'Use "Install" first if the project needs dependencies.',
      'Use "Generate" only when you explicitly want to create a new supported template project.',
      "If you prefer to bypass KForge, stay in the chat and I can help you run the project manually instead.",
    ],
    service_notes: [
      "Preview is for running or viewing the current project.",
      "Generate is for creating a new supported template project.",
      "Implementation requests inside an already-open project should not be treated as Generate requests unless the user explicitly asks for a new scaffold.",
      "Install may be needed before Preview for package-based projects.",
      "If a template installs dependencies during scaffold, Install may not be needed immediately.",
      "Static projects do not need Install.",
    ],
  };
}
