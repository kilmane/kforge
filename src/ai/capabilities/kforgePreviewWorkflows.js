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
      "KForge can preview the current project and can also generate supported project templates from the Preview panel.",
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
      "If the user asks to preview the current project, guide them to Preview first, not Generate.",
      "Only mention Generate when the user explicitly wants to create a new app or scaffold a supported template.",
      "If no project folder is open, tell the user to open a folder first.",
      "Do not start manually creating template files in chat when KForge Preview can generate the template.",
      "After recommending the KForge Preview workflow, explicitly tell the user they can leave the chat and continue in Preview.",
      "Only move into manual file creation or manual preview commands if the user explicitly says they want to bypass KForge.",
    ],
    first_response_template: [
      "KForge can help with this through the Preview panel.",
      "First make sure a project folder is open.",
      "You can now leave the chat and open: Preview.",
      'Use "Preview" to run the current project.',
      'Use "Install" first if the project needs dependencies.',
      'Only use "Generate" if you want to create a new supported template project.',
      "If you prefer to bypass KForge, stay in the chat and I can help you run the project manually instead.",
    ],
    service_notes: [
      "Generate is for creating a new supported template project.",
      "Install may be needed before Preview for package-based projects.",
      "If a template installs dependencies during scaffold, Install may not be needed immediately.",
      "Static projects do not need Install.",
    ],
  };
}
