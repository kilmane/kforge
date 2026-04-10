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

function buildImplementationTaskTemplateBlock({
  projectOpen,
  detectedTemplateName,
}) {
  if (!projectOpen) return "";

  const lines = [
    "=== In-Project Implementation Template ===",
    "A project is already open in KForge.",
    "For requests to build, add, create, make, or implement product code inside the current project:",
    "- inspect the current workspace structure first",
    "- prefer the smallest responsible existing file(s)",
    "- follow the detected stack and existing project structure",
    "- do not switch into new-project scaffolding mode unless the user explicitly asks for it",
    "- do not route to Preview -> Generate for ordinary in-project implementation work",
    "- do not invent generic tutorial file plans that ignore the current project",
    "- use truthful, project-aware actions only",
    "- do not imply that a new scaffold was generated unless the user explicitly requested one",
  ];

  if (detectedTemplateName === "Vite + React") {
    lines.push(
      "- when the current project is Vite + React, default to existing src/ files before suggesting new top-level tutorial files",
      "- if the user asks to create a simple app inside an existing Vite + React project, interpret that as updating the current React app, usually starting with src/App.jsx or nearby existing files",
    );
  }

  lines.push("");

  return lines.join("\n");
}

function buildNoProjectTaskTemplateBlock({ projectOpen }) {
  if (projectOpen) return "";

  return [
    "=== No-Project Task Template ===",
    "No project folder is currently open in KForge.",
    "When the user's next step depends on project files or file edits:",
    "- tell them to open or create a project first",
    "- do not emit file-edit tools against relative paths",
    "- do not invent edits for files that do not exist in an open workspace",
    "When the user wants a new starter app or scaffold:",
    "- use a KForge-first handoff",
    "- tell them to create or open a folder first in Explorer",
    "- then tell them they can leave chat and use Preview -> Generate for a supported starter template project",
    "- if they need help choosing a template, recommend one in chat before the handoff",
    "When the user explicitly asks to bypass KForge:",
    "- switch fully into manual-chat mode",
    "- do not mix Preview, Generate, or KForge template-creation handoff into the same answer",
    "- give direct commands or manual steps only",
    "Do not require an open project folder for advisory-only answers, workflow handoffs, terminal guidance, git guidance, service-routing guidance, or manual setup instructions.",
    "Only mention opening or creating a folder when the requested next step truly depends on project files, previewing the current project, or editing files inside KForge.",
    "",
  ].join("\n");
}

function buildEmptyFolderTaskTemplateBlock({ projectOpen, tree }) {
  if (!(projectOpen && Array.isArray(tree) && tree.length === 0)) return "";

  return [
    "=== Empty-Folder Task Template ===",
    "A project folder is open, but it appears to be empty.",
    "For new app or starter requests in this empty folder:",
    "- prefer KForge Preview -> Generate for a supported template project",
    "- do not default to manually writing ad-hoc starter boilerplate unless the user explicitly asks for manual scaffolding or bypasses KForge",
    "- if the user does not know which template to choose, recommend one in chat before sending them to Preview -> Generate",
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
    existingProjectBehaviorBlock: buildImplementationTaskTemplateBlock({
      projectOpen,
      detectedTemplateName,
    }),
    noProjectBehaviorBlock: buildNoProjectTaskTemplateBlock({ projectOpen }),
    emptyFolderBehaviorBlock: buildEmptyFolderTaskTemplateBlock({
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
