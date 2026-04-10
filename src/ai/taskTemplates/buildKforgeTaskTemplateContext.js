function buildTemplateStructureHints(detectedTemplateName) {
  if (detectedTemplateName === "Vite + React") {
    return [
      "Typical Vite + React structure:",
      "- React app code usually lives in src/",
      "- Main app component is usually src/App.jsx or src/App.js",
      "- Entry file is usually src/main.jsx or src/main.js",
      "- For simple app feature requests, prefer modifying src/App.jsx first unless the existing project structure clearly suggests another file",
      "- Do not propose creating index.html, TodoApp.js, App.tsx examples, or standalone React tutorial files when this Vite + React project already exists",
    ];
  }

  if (detectedTemplateName === "Next.js") {
    return [
      "Typical Next.js structure:",
      "- App code usually lives in app/ or pages/",
      "- Prefer modifying existing route files and existing project structure instead of proposing generic React tutorial files",
    ];
  }

  return [];
}

function buildExistingProjectBehaviorBlock({
  projectOpen,
  detectedTemplateName,
}) {
  if (!projectOpen) return "";

  return [
    "=== Existing Project Behavior Rules ===",
    "A project is already open in KForge.",
    "Treat requests like create/build/add/make/implement a page, feature, UI, component, app, screen, form, table, dashboard, auth flow, or CRUD flow as implementation work inside the current project by default.",
    "Do not switch into new-project scaffolding mode unless the user explicitly asks to create a new project, generate a template, scaffold a new app, or start from scratch.",
    "Do not route to Preview -> Generate for ordinary implementation requests inside an already-open project.",
    "Do not invent generic tutorial file plans that ignore the detected project structure.",
    "Prefer editing existing project files that match the detected stack and structure.",
    "When the detected template is Vite + React, default to existing src/ files before suggesting new top-level tutorial files.",
    "If the user asks to create a simple app inside an existing Vite + React project, interpret that as updating the current React app, usually starting with src/App.jsx or nearby existing files.",
    "Use truthful, project-aware actions only. Never imply a new scaffold will be generated unless the user explicitly requested one.",
    "",
  ].join("\n");
}

function buildNoProjectBehaviorBlock({ projectOpen }) {
  if (projectOpen) return "";

  return [
    "=== No Project Open Behavior Rules ===",
    "No project folder is currently open in KForge.",
    "If the user says they do not have a project yet, wants to create a new project, wants a starter app, or wants to start from scratch, do not emit file-edit tools against relative paths.",
    "Do not create ad-hoc starter files manually when KForge can generate a supported template project.",
    "For no-project new-app requests, answer with a KForge-first handoff: tell the user to create or open a folder first in Explorer, then leave chat and use Preview -> Generate for a supported starter template project.",
    "If the user is unsure which template to pick, let them stay in chat and recommend the best starter template before sending them to Preview -> Generate.",
    "Do not say 'let me know once the folder is open so I can create files' as the default next step for a new-project request.",
    "If the user explicitly says they want to bypass KForge, switch fully into manual-chat mode.",
    "In manual-chat mode, do not keep describing the path as Preview, Generate, or KForge template creation.",
    "In manual-chat mode, recommend a concrete stack directly and give commands or steps only.",
    "For simple interactive web apps with no framework preference, Vite + React is usually the default manual recommendation.",
    "Do not require an open project folder for advisory-only answers, workflow handoffs, terminal guidance, git guidance, service-routing guidance, or manual setup instructions.",
    "Only mention opening or creating a folder when the requested next step truly depends on project files, previewing the current project, or editing files inside KForge.",
    "Only fall back to manual chat-only scaffolding if the user explicitly asks to bypass KForge.",
    "",
  ].join("\n");
}

function buildEmptyFolderBehaviorBlock({ projectOpen, tree }) {
  if (!(projectOpen && Array.isArray(tree) && tree.length === 0)) return "";

  return [
    "=== Empty Folder Behavior Rules ===",
    "A project folder is open, but it appears to be empty.",
    "If the user wants a new app, starter, or fresh project in an empty folder, prefer KForge Preview -> Generate for a supported template project.",
    "Do not default to manually writing index.html, app.js, or other ad-hoc boilerplate into an empty folder unless the user explicitly asks for manual scaffolding or bypasses KForge.",
    "If helpful, mention that supported starters may include Static HTML, Vite + React, and Next.js.",
    "If the user does not know which template to choose, recommend one in chat before sending them to Preview -> Generate.",
    "",
  ].join("\n");
}

function buildKnownManualRunFacts(detectedTemplateName) {
  if (detectedTemplateName === "Expo React Native") {
    return [
      "=== Known Project Run Facts ===",
      "Detected project run profile: Expo React Native.",
      "Preferred package manager for KForge JavaScript projects: pnpm.",
      "Preferred default manual run command for this detected project: pnpm dev.",
      "If phone discovery fails on the same network, preferred fallback: pnpm dev -- --tunnel.",
      "Optional browser preview command when relevant: pnpm run web.",
      "For Expo React Native, KForge Preview is a guidance surface only for phone preview; the actual app run happens outside KForge in a system terminal and Expo Go.",
      "Do not default to pnpm expo start, npx expo start, npm start, or yarn start when giving manual guidance for this detected project unless the project clearly requires them.",
      "",
    ];
  }

  if (detectedTemplateName === "Vite + React") {
    return [
      "=== Known Project Run Facts ===",
      "Detected project run profile: Vite + React.",
      "Preferred package manager for KForge JavaScript projects: pnpm.",
      "Preferred default manual run command for this detected project: pnpm dev.",
      "",
    ];
  }

  if (detectedTemplateName === "Next.js") {
    return [
      "=== Known Project Run Facts ===",
      "Detected project run profile: Next.js.",
      "Preferred package manager for KForge JavaScript projects: pnpm.",
      "Preferred default manual run command for this detected project: pnpm dev.",
      "",
    ];
  }

  return [];
}

function buildProjectContextBlock({
  projectOpen,
  detectedTemplateName,
  detectedKind,
  projectPath,
}) {
  if (!projectOpen) return "";

  const knownManualRunFacts = buildKnownManualRunFacts(detectedTemplateName);
  const templateStructureHints =
    buildTemplateStructureHints(detectedTemplateName);

  return [
    "=== Current Project Context ===",
    "Project folder open: yes",
    `Project path: ${projectPath}`,
    `Detected project kind: ${detectedKind || "unknown"}`,
    `Detected template: ${detectedTemplateName || "none detected"}`,
    "If a project folder is already open, prefer modifying the current project unless the user explicitly asks to scaffold a new template.",
    "If a detected template already exists, requests to create an app, page, feature, component, UI, or screen should usually be treated as implementation work inside the current project.",
    "Do not route to Preview just because the project uses React, Vite, Next.js, or Expo.",
    "Only route to Preview when the user explicitly wants to run, preview, start, test, or view the current app and has not asked for manual guidance.",
    "Only route to Generate when the user explicitly wants a new scaffolded template project.",
    ...knownManualRunFacts,
    ...templateStructureHints,
    "",
  ].join("\n");
}

export function buildKforgeTaskTemplateContext({
  projectOpen,
  detectedTemplateName,
  detectedKind,
  projectPath,
  tree,
}) {
  return {
    existingProjectBehaviorBlock: buildExistingProjectBehaviorBlock({
      projectOpen,
      detectedTemplateName,
    }),
    noProjectBehaviorBlock: buildNoProjectBehaviorBlock({ projectOpen }),
    emptyFolderBehaviorBlock: buildEmptyFolderBehaviorBlock({
      projectOpen,
      tree,
    }),
    projectContextBlock: buildProjectContextBlock({
      projectOpen,
      detectedTemplateName,
      detectedKind,
      projectPath,
    }),
  };
}
