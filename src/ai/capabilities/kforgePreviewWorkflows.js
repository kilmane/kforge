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
      "KForge Preview is for running or viewing the current open project, or for showing truthful preview guidance when a project uses a special workflow such as Expo React Native. KForge Generate is only for explicitly creating a new supported template scaffold, not for ordinary app-building or feature requests.",
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
      "Only mention Generate when the user explicitly wants a new scaffolded template project, such as creating a Vite app, Next.js starter, Expo React Native app, or starting a new project from scratch.",
      "Do not hand off to Preview for ordinary product requests like build, make, create, add, or implement an app, feature, page, UI, dashboard, tracker, form, or CRUD flow.",
      "Do not hand off to Preview just because the user asked to build an app and KForge has a Preview panel.",
      "Do not route to Generate just because the user asked to create an app, page, feature, component, UI, or screen inside an already-open project.",
      "If a project folder is already open, implementation requests should usually be treated as edits to the current project, not as a new scaffold request.",
      "If no project folder is open and the user is asking to build a product, app, or feature, do not redirect them to Preview unless they explicitly asked to run or preview something.",
      "Do not start manually creating template boilerplate in chat when KForge can generate a new supported template and the user explicitly asked for a new scaffold.",
      "For Expo React Native projects, explain that KForge Preview is guidance-only for phone preview.",
      "For Expo React Native projects, do not say that KForge Preview starts the mobile app inside KForge.",
      "For Expo React Native projects, do not imply that the QR code appears in KForge Preview.",
      "For Expo React Native phone preview, explain that the current truthful path is to leave KForge and use a system terminal outside KForge.",
      "For Expo React Native phone preview, prefer pnpm dev, with pnpm dev -- --tunnel as the fallback when the phone cannot connect on the same network.",
      "For Expo React Native, browser preview is optional via pnpm run web and may require installing react-dom and react-native-web first.",
      "After recommending Preview for run/preview actions, explicitly tell the user they can leave the chat and continue in Preview.",
      "Only move into manual run commands if the user explicitly says they want to bypass KForge, except for Expo React Native phone preview where the truthful execution path is currently outside KForge.",
    ],
    first_response_template: [
      "Use this workflow only for run/preview actions on the current project, or for an explicitly requested new supported template scaffold.",
      "First make sure a project folder is open.",
      "You can now leave the chat and open: Preview.",
      'Use "Preview" to run the current project when the project has a normal KForge preview flow.',
      'Use "Install" first if the project needs dependencies.',
      'Use "Generate" only when you explicitly want to create a new supported template project.',
      "For Expo React Native, treat Preview as a guidance surface, not as the actual phone preview runner.",
      "For Expo React Native phone preview, use a system terminal outside KForge and run pnpm dev.",
      "If the phone cannot connect on the same network, use pnpm dev -- --tunnel.",
      "If you prefer browser preview for Expo, pnpm run web may work but can require installing react-dom and react-native-web first.",
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
      "Expo React Native phone preview currently happens outside KForge using Expo Go from a system terminal.",
      "Expo React Native browser preview is optional and may require extra dependencies.",
      "Expo React Native should not be described as a normal in-KForge Preview flow.",
    ],
  };
}
