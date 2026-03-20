export const TEMPLATE_REGISTRY = [
  {
    id: "static-html",
    name: "Static HTML/CSS/JS",
    description: "Simple static website",
    category: "static",
    scaffold: {
      command: "scaffold_static_html",
      appName: "static-site",
    },
    install: {
      required: false,
      installsDuringScaffold: false,
    },
    preview: {
      strategy: "static-index",
    },
    detection: {
      kind: "static",
      files: ["index.html"],
      hints: [],
    },
  },
  {
    id: "vite-react",
    name: "Vite + React",
    description: "React app powered by Vite",
    category: "frontend",
    scaffold: {
      command: "scaffold_vite_react",
      appName: "vite-react-app",
    },
    install: {
      required: true,
      installsDuringScaffold: false,
    },
    preview: {
      strategy: "dev-server",
    },
    detection: {
      kind: "package",
      files: ["package.json"],
      hints: ["vite", "react"],
    },
  },
  {
    id: "nextjs",
    name: "Next.js",
    description: "Full-stack React framework",
    category: "full-stack",
    scaffold: {
      command: "scaffold_nextjs",
      appName: "nextjs-app",
    },
    install: {
      required: true,
      installsDuringScaffold: true,
    },
    preview: {
      strategy: "dev-server",
    },
    detection: {
      kind: "package",
      files: ["package.json"],
      hints: ["next", "nextjs"],
    },
  },
];

export function listTemplates() {
  return TEMPLATE_REGISTRY;
}

export function listScaffoldTemplates() {
  return TEMPLATE_REGISTRY.filter((template) => template.scaffold);
}

export function getTemplateById(templateId) {
  return (
    TEMPLATE_REGISTRY.find((template) => template.id === templateId) || null
  );
}

export function findTemplatesByDetectedKind(kind) {
  const normalizedKind = String(kind || "")
    .trim()
    .toLowerCase();
  if (!normalizedKind) return [];

  return TEMPLATE_REGISTRY.filter(
    (template) => template?.detection?.kind === normalizedKind,
  );
}

export function findTemplateByHint(hint) {
  const normalizedHint = String(hint || "")
    .trim()
    .toLowerCase();
  if (!normalizedHint) return null;

  return (
    TEMPLATE_REGISTRY.find((template) =>
      Array.isArray(template?.detection?.hints)
        ? template.detection.hints.some(
            (entry) => String(entry).toLowerCase() === normalizedHint,
          )
        : false,
    ) || null
  );
}

export function templateInstallsDuringScaffold(templateId) {
  return Boolean(getTemplateById(templateId)?.install?.installsDuringScaffold);
}

export function templateRequiresInstall(templateId) {
  return Boolean(getTemplateById(templateId)?.install?.required);
}
