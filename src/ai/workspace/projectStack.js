const MAX_SIGNALS_PER_STACK = 8;

function isDir(node) {
  return Array.isArray(node?.children);
}

function cleanName(value) {
  return String(value || "").trim();
}

function normalizePath(value) {
  return String(value || "").replaceAll("\\", "/");
}

function relativePath(node, projectPath) {
  const rawPath = normalizePath(node?.path);
  const root = normalizePath(projectPath).replace(/\/+$/, "");
  const fallback = cleanName(node?.name);

  if (!rawPath) return fallback;
  if (root && rawPath === root) return ".";
  if (root && rawPath.startsWith(`${root}/`)) {
    return rawPath.slice(root.length + 1) || fallback;
  }

  return fallback || rawPath;
}

function baseName(path) {
  const parts = normalizePath(path).split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function pushUnique(target, value) {
  const clean = cleanName(value);
  if (!clean || target.includes(clean)) return;
  target.push(clean);
}

function collectWorkspacePathIndex(tree, projectPath) {
  const root = Array.isArray(tree) ? tree.filter(Boolean) : [];
  const files = [];
  const folders = [];

  function visit(nodes) {
    if (!Array.isArray(nodes)) return;

    for (const node of nodes) {
      const name = cleanName(node?.name);
      if (!name) continue;

      const path = relativePath(node, projectPath);
      if (!path || path === ".") {
        if (isDir(node)) visit(node.children);
        continue;
      }

      if (isDir(node)) {
        pushUnique(folders, path);
        visit(node.children);
      } else {
        pushUnique(files, path);
      }
    }
  }

  visit(root);

  return {
    files,
    folders,
  };
}

function findExactFiles(index, paths) {
  const wanted = new Set(paths.map((path) => normalizePath(path).toLowerCase()));
  return index.files.filter((path) => wanted.has(path.toLowerCase()));
}

function findExactFolders(index, paths) {
  const wanted = new Set(paths.map((path) => normalizePath(path).toLowerCase()));
  return index.folders.filter((path) => wanted.has(path.toLowerCase()));
}

function findFilesByBaseNamePrefix(index, prefixes) {
  const normalizedPrefixes = prefixes.map((prefix) => prefix.toLowerCase());

  return index.files.filter((path) => {
    const name = baseName(path).toLowerCase();
    return normalizedPrefixes.some((prefix) => name.startsWith(prefix));
  });
}

function findFilesByPathRegex(index, regex) {
  return index.files.filter((path) => regex.test(path.toLowerCase()));
}

function findFoldersByPathRegex(index, regex) {
  return index.folders.filter((path) => regex.test(path.toLowerCase()));
}

function hasAny(matches) {
  return Array.isArray(matches) && matches.length > 0;
}

function hasObviousFrontendFrameworkConfig(index) {
  return (
    hasAny(findFilesByBaseNamePrefix(index, ["vite.config."])) ||
    hasAny(findFilesByBaseNamePrefix(index, ["next.config."])) ||
    hasAny(findExactFolders(index, ["src-tauri"])) ||
    hasAny(findExactFiles(index, ["app.json"])) ||
    hasAny(findFilesByBaseNamePrefix(index, ["app.config."]))
  );
}

const STACK_DEFINITIONS = [
  {
    label: "Vite / React-style frontend",
    minScore: 4,
    tests: [
      {
        weight: 4,
        detect: (index) => findFilesByBaseNamePrefix(index, ["vite.config."]),
      },
      {
        weight: 2,
        detect: (index) =>
          findExactFiles(index, ["src/main.jsx", "src/main.tsx"]),
      },
      {
        weight: 2,
        detect: (index) =>
          findExactFiles(index, ["src/App.jsx", "src/App.tsx"]),
      },
      {
        weight: 1,
        detect: (index) => findExactFiles(index, ["index.html"]),
      },
    ],
  },
  {
    label: "Next.js",
    minScore: 4,
    tests: [
      {
        weight: 4,
        detect: (index) => findFilesByBaseNamePrefix(index, ["next.config."]),
      },
      {
        weight: 2,
        detect: (index) =>
          findFilesByPathRegex(index, /^app\/page\.(js|jsx|ts|tsx)$/),
      },
      {
        weight: 2,
        detect: (index) =>
          findFilesByPathRegex(index, /^app\/layout\.(js|jsx|ts|tsx)$/),
      },
      {
        weight: 2,
        detect: (index) =>
          findFilesByPathRegex(index, /^pages\/index\.(js|jsx|ts|tsx)$/),
      },
    ],
  },
  {
    label: "Create React App-style frontend",
    minScore: 5,
    tests: [
      {
        weight: 3,
        detect: (index) => findExactFiles(index, ["public/index.html"]),
      },
      {
        weight: 2,
        detect: (index) =>
          findExactFiles(index, [
            "src/index.js",
            "src/index.jsx",
            "src/index.ts",
            "src/index.tsx",
          ]),
      },
    ],
  },
  {
    label: "Tauri shell",
    minScore: 4,
    tests: [
      {
        weight: 3,
        detect: (index) => findExactFolders(index, ["src-tauri"]),
      },
      {
        weight: 4,
        detect: (index) => findFilesByBaseNamePrefix(index, ["tauri.conf."]),
      },
      {
        weight: 3,
        detect: (index) => findExactFiles(index, ["src-tauri/Cargo.toml"]),
      },
      {
        weight: 1,
        detect: (index) => findExactFolders(index, ["src-tauri/src"]),
      },
    ],
  },
  {
    label: "Expo React Native",
    minScore: 4,
    tests: [
      {
        weight: 4,
        detect: (index) => findExactFiles(index, ["app.json"]),
      },
      {
        weight: 4,
        detect: (index) => findFilesByBaseNamePrefix(index, ["app.config."]),
      },
      {
        weight: 2,
        detect: (index) =>
          findExactFiles(index, ["App.js", "App.jsx", "App.ts", "App.tsx"]),
      },
      {
        weight: 1,
        detect: (index) => findExactFolders(index, ["assets"]),
      },
    ],
  },
  {
    label: "Rust backend / CLI",
    minScore: 4,
    tests: [
      {
        weight: 4,
        detect: (index) => findExactFiles(index, ["Cargo.toml"]),
      },
      {
        weight: 2,
        detect: (index) => findExactFiles(index, ["src/main.rs", "src/lib.rs"]),
      },
    ],
  },
  {
    label: "Node / API-style project",
    minScore: 5,
    tests: [
      {
        weight: 2,
        detect: (index) => findExactFiles(index, ["package.json"]),
      },
      {
        weight: 5,
        detect: (index) =>
          findExactFiles(index, [
            "server.js",
            "server.ts",
            "server.mjs",
            "server.cjs",
          ]),
      },
      {
        weight: 5,
        detect: (index) =>
          findFilesByPathRegex(index, /^src\/server\.(js|ts|mjs|cjs)$/),
      },
      {
        weight: 2,
        detect: (index) => [
          ...findExactFolders(index, ["api"]),
          ...findFoldersByPathRegex(index, /^src\/api$/),
        ],
      },
    ],
  },
  {
    label: "Static HTML/CSS/JS",
    minScore: 3,
    exclude: hasObviousFrontendFrameworkConfig,
    tests: [
      {
        weight: 3,
        detect: (index) => findExactFiles(index, ["index.html"]),
      },
      {
        weight: 1,
        detect: (index) => findExactFolders(index, ["css", "styles"]),
      },
      {
        weight: 1,
        detect: (index) => findExactFolders(index, ["js", "scripts", "assets"]),
      },
    ],
  },
];

function confidenceForScore(score) {
  if (score >= 4) return "medium";
  return "low";
}

function collectStackSignals(tree, projectPath) {
  const index = collectWorkspacePathIndex(tree, projectPath);

  return STACK_DEFINITIONS.map((definition) => {
    if (definition.exclude?.(index)) return null;

    const signals = [];
    let score = 0;

    for (const test of definition.tests) {
      const matches = test.detect(index);
      if (!hasAny(matches)) continue;

      score += test.weight;
      for (const match of matches) {
        pushUnique(signals, match);
      }
    }

    if (score < definition.minScore) return null;

    return {
      label: definition.label,
      confidence: confidenceForScore(score),
      score,
      signals: signals.slice(0, MAX_SIGNALS_PER_STACK),
    };
  })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

function formatStackList(stacks) {
  if (!stacks || stacks.length === 0) {
    return ["- none detected"];
  }

  return stacks.map(
    (stack) => `- ${stack.label}: ${stack.confidence} confidence`,
  );
}

function formatSignalList(stacks) {
  if (!stacks || stacks.length === 0) {
    return ["- none detected"];
  }

  return stacks.map((stack) => {
    const signals =
      stack.signals.length > 0 ? stack.signals.join(", ") : "none detected";
    return `- ${stack.label}: ${signals}`;
  });
}

export function buildProjectStackContextBlock(tree, projectPath) {
  if (!projectPath || !Array.isArray(tree) || tree.length === 0) return "";

  const stacks = collectStackSignals(tree, projectPath);

  return [
    "=== Project Stack Signals (read-only; path names only) ===",
    "Likely stack:",
    ...formatStackList(stacks),
    "",
    "Detected signals:",
    ...formatSignalList(stacks),
    "",
    "These stack hints are based only on filenames, folders, and config-file names from the already-loaded workspace tree.",
    "Use these hints to choose likely inspection candidates. Do not assume implementation details from filenames alone.",
    "=== End Project Stack Signals ===",
    "",
  ].join("\n");
}
