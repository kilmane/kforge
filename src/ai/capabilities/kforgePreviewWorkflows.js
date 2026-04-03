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
      "KForge Preview is for running or viewing the current open project. KForge Generate is only for explicitly creating a new supported template scaffold, not for ordinary app-building or feature requests.",
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
      "Only mention Generate when the user explicitly wants a new scaffolded template project, such as creating a Vite app, Next.js starter, or starting a new project from scratch.",
      "Do not hand off to Preview for ordinary product requests like build, make, create, add, or implement an app, feature, page, UI, dashboard, tracker, form, or CRUD flow.",
      "Do not hand off to Preview just because the user asked to build an app and KForge has a Preview panel.",
      "Do not route to Generate just because the user asked to create an app, page, feature, component, UI, or screen inside an already-open project.",
      "If a project folder is already open, implementation requests should usually be treated as edits to the current project, not as a new scaffold request.",
      "If no project folder is open and the user is asking to build a product, app, or feature, do not redirect them to Preview unless they explicitly asked to run or preview something.",
      "Do not start manually creating template boilerplate in chat when KForge can generate a new supported template and the user explicitly asked for a new scaffold.",
      "After recommending Preview for run/preview actions, explicitly tell the user they can leave the chat and continue in Preview.",
      "Only move into manual run commands if the user explicitly says they want to bypass KForge.",
    ],
    first_response_template: [
      "Use this workflow only for run/preview actions on the current project, or for an explicitly requested new supported template scaffold.",
      "First make sure a project folder is open.",
      "You can now leave the chat and open: Preview.",
      'Use "Preview" to run the current project.',
      'Use "Install" first if the project needs dependencies.',
      'Use "Generate" only when you explicitly want to create a new supported template project.',
      "If you prefer to bypass KForge, stay in the chat and I can help you manually instead.",
    ],
    service_notes: [
      "Preview is for running or viewing the current project.",
      "Generate is for explicitly creating a new supported template project.",
      "General app-building or feature-building requests should not be treated as Preview requests.",
      "Implementation requests inside an already-open project should not be treated as Generate requests unless the user explicitly asks for a new scaffold.",
      "Install may be needed before Preview for package-based projects.",
      "If a template installs dependencies during scaffold, Install may not be needed immediately.",
      "Static projects do not need Install.",
    ],
  };
}
