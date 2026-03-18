export const TEMPLATE_REGISTRY = [
  {
    id: "static-html",
    name: "Static HTML/CSS/JS",
    description: "Simple static website",
    category: "static",
    scaffold: null,
    install: {
      required: false,
    },
    preview: {
      strategy: "static-index",
    },
    detection: {
      files: ["index.html"],
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
    },
    preview: {
      strategy: "dev-server",
    },
    detection: {
      files: ["package.json"],
      hints: ["vite"],
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
      files: ["package.json"],
      hints: ["next"],
    },
  },
];

export function listScaffoldTemplates() {
  return TEMPLATE_REGISTRY.filter((template) => template.scaffold);
}

export function getTemplateById(templateId) {
  return (
    TEMPLATE_REGISTRY.find((template) => template.id === templateId) || null
  );
}
