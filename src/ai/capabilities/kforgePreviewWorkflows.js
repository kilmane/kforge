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
      "KForge Preview is for running or viewing the current open project, or for giving truthful preview guidance when a project uses a special preview flow. KForge Generate is only for explicitly creating a new supported template scaffold, not for ordinary app-building or feature requests.",
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
      "If the user asks to preview, run, start, test, or view the current project, guide them to Preview first, not Generate, unless the user explicitly asks for manual guidance.",
      "If the user asks how to install dependencies for the current project, guide them to Preview → Install instead of suggesting terminal commands.",
      "Only mention Generate when the user explicitly wants a new scaffolded template project.",
      "Do not hand off to Preview for ordinary product requests like build, make, create, add, or implement an app, feature, page, UI, dashboard, tracker, form, or CRUD flow.",
      "Do not hand off to Preview just because the user asked to build an app and KForge has a Preview panel.",
      "Do not route to Generate just because the user asked to create an app, page, feature, component, UI, or screen inside an already-open project.",
      "If a project folder is already open, implementation requests should usually be treated as edits to the current project, not as a new scaffold request.",
      "If no project folder is open and the user is asking to build a product, app, or feature, do not redirect them to Preview unless they explicitly asked to run or preview something.",
      "Do not start manually creating template boilerplate in chat when KForge can generate a new supported template and the user explicitly asked for a new scaffold.",
      "Keep Preview guidance truthful and workflow-oriented rather than teaching brittle framework-specific run instructions in chat.",
      "If a project uses a special preview flow, describe Preview truthfully as a guidance surface when it does not directly run that flow inside KForge.",
      "Do not describe Preview as automatic, managed, or as the thing that actually runs the app when execution really happens outside KForge.",
      "After recommending Preview for run or preview actions, explicitly tell the user they can leave the chat and continue in Preview.",
      "Only move into manual run guidance if the user explicitly says they want to bypass KForge or asks for manual steps.",
    ],
    first_response_template: [
      "Use this workflow only for run or preview actions on the current project, or for an explicitly requested new supported template scaffold.",
      "First make sure a project folder is open.",
      "You can now leave the chat and open: Preview.",
      'Use "Install" first if the project needs dependencies.',
      'Use "Preview" to run or view the current project when the project has a normal KForge preview flow.',
      'Use "Generate" only when you explicitly want to create a new supported template project.',
      "If this project uses a special preview flow, Preview may provide guidance rather than directly running that flow inside KForge.",
      "If you prefer to bypass KForge, stay in the chat and I can help you manually instead.",
    ],
    service_notes: [
      "Preview is for running or viewing the current project.",
      "Generate is for explicitly creating a new supported template project.",
      "General app-building or feature-building requests should not be treated as Preview requests.",
      "Implementation requests inside an already-open project should not be treated as Generate requests unless the user explicitly asks for a new scaffold.",
      "Install may be needed before Preview for package-based projects.",
      "Static projects do not need Install.",
      "Some project types may require truthful preview guidance rather than a direct in-KForge preview run.",
    ],
  };
}
