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
      "KForge can generate project templates and run preview flows from the Preview panel.",
    prerequisites: [
      "A project folder must be open before generating a template.",
    ],
    kforge_paths: {
      primary: "Preview -> Generate",
      follow_up: ["Install", "Preview"],
    },
    supported_templates: templateNames,
    preferred_ai_behavior: [
      "If the user asks to create a new app template that KForge can generate, prefer the KForge Preview workflow before writing files in chat.",
      "If no project folder is open, tell the user to open a folder first.",
      "Do not start manually creating template files in chat when KForge Preview can generate the template.",
      "After recommending the KForge Preview workflow, explicitly tell the user they can leave the chat and continue in Preview.",
      "Only move into manual file creation if the user explicitly says they want to bypass KForge.",
    ],
    first_response_template: [
      "KForge can help with this through the Preview panel.",
      "First make sure a project folder is open.",
      "You can now leave the chat and open: Preview.",
      'Then use "Generate" to create the template you want.',
      'After generation, use "Install" if needed, then "Preview" to run it.',
      "If you prefer to bypass KForge, stay in the chat and I can help you create the project manually instead.",
    ],
    service_notes: [
      "Generate is disabled until a folder is open.",
      "If a template installs dependencies during scaffold, Install may not be needed immediately.",
      "Static projects do not need Install.",
    ],
  };
}
