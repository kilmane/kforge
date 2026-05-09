const IMPORTANT_FOLDER_NAMES = new Set([
  "src",
  "app",
  "pages",
  "components",
  "component",
  "routes",
  "router",
  "views",
  "layouts",
  "layout",
  "lib",
  "utils",
  "hooks",
  "services",
  "service",
  "api",
  "runtime",
  "ai",
  "styles",
]);

const CONFIG_FILE_PREFIXES = [
  "package.json",
  "vite.config.",
  "next.config.",
  "tsconfig.",
  "jsconfig.",
  "tailwind.config.",
  "postcss.config.",
  "eslint.config.",
  ".eslintrc",
  ".prettierrc",
  "tauri.conf.",
  "cargo.toml",
];

const ENTRY_FILE_PATHS = new Set([
  "index.html",
  "src/main.js",
  "src/main.jsx",
  "src/main.ts",
  "src/main.tsx",
  "src/index.js",
  "src/index.jsx",
  "src/index.ts",
  "src/index.tsx",
  "src/app.js",
  "src/app.jsx",
  "src/app.ts",
  "src/app.tsx",
  "src/App.js",
  "src/App.jsx",
  "src/App.ts",
  "src/App.tsx",
  "app/page.js",
  "app/page.jsx",
  "app/page.ts",
  "app/page.tsx",
  "pages/index.js",
  "pages/index.jsx",
  "pages/index.ts",
  "pages/index.tsx",
]);

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "make",
  "change",
  "update",
  "add",
  "fix",
  "use",
  "using",
  "please",
  "can",
  "you",
  "kforge",
]);

const MAX_FILES = 8;
const MAX_FOLDERS = 8;

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


function isConfigFileName(name) {
  const lower = cleanName(name).toLowerCase();
  return CONFIG_FILE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function isLikelyEntryFilePath(path) {
  const normalized = normalizePath(path);
  const lower = normalized.toLowerCase();

  return (
    ENTRY_FILE_PATHS.has(normalized) ||
    ENTRY_FILE_PATHS.has(lower) ||
    lower.endsWith("/index.html")
  );
}

function promptTerms(rawPrompt) {
  return Array.from(
    new Set(
      String(rawPrompt || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3 && !STOP_WORDS.has(term)),
    ),
  ).slice(0, 16);
}

function pathParts(path) {
  return normalizePath(path)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function scorePath(path, name, directory, terms) {
  const lowerPath = normalizePath(path).toLowerCase();
  const lowerName = cleanName(name).toLowerCase();
  const parts = pathParts(lowerPath);
  let promptScore = 0;
  let structuralScore = 0;

  for (const term of terms) {
    if (lowerName.includes(term)) promptScore += 6;
    else if (lowerPath.includes(term)) promptScore += 3;
  }

  if (directory) {
    if (IMPORTANT_FOLDER_NAMES.has(lowerName)) structuralScore += 4;
    if (parts.some((part) => IMPORTANT_FOLDER_NAMES.has(part))) {
      structuralScore += 2;
    }
  } else {
    if (isLikelyEntryFilePath(path)) structuralScore += 5;
    if (isConfigFileName(name)) structuralScore += 3;
    if (parts.some((part) => IMPORTANT_FOLDER_NAMES.has(part))) {
      structuralScore += 2;
    }

    const likelyFileName =
      /page|app|main|index|route|router|layout|provider|model|panel|modal|service|client/i.test(
        lowerName,
      );

    if (likelyFileName) structuralScore += 2;
  }

  return {
    promptMatch: promptScore > 0,
    score: promptScore + structuralScore,
  };
}

function collectCodeScoutCandidates(tree, projectPath, rawPrompt) {
  const root = Array.isArray(tree) ? tree.filter(Boolean) : [];
  const terms = promptTerms(rawPrompt);
  const promptMatchedFiles = [];
  const promptMatchedFolders = [];
  const structuralFiles = [];
  const structuralFolders = [];

  function visit(nodes) {
    if (!Array.isArray(nodes)) return;

    for (const node of nodes) {
      const name = cleanName(node?.name);
      if (!name) continue;

      const directory = isDir(node);
      const path = relativePath(node, projectPath);
      const result = scorePath(path, name, directory, terms);

      if (result.score > 0 && path !== ".") {
        const target = result.promptMatch
          ? directory
            ? promptMatchedFolders
            : promptMatchedFiles
          : directory
            ? structuralFolders
            : structuralFiles;

        target.push({ path, score: result.score });
      }

      if (directory) visit(node.children);
    }
  }

  visit(root);

  const sortCandidates = (items) =>
    items
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
      .map((item) => item.path);

  return {
    promptMatchedFiles: sortCandidates(promptMatchedFiles).slice(0, MAX_FILES),
    promptMatchedFolders: sortCandidates(promptMatchedFolders).slice(
      0,
      MAX_FOLDERS,
    ),
    structuralFiles: sortCandidates(structuralFiles).slice(0, MAX_FILES),
    structuralFolders: sortCandidates(structuralFolders).slice(0, MAX_FOLDERS),
  };
}

function formatBulletList(items) {
  if (!items || items.length === 0) return ["- none detected"];
  return items.map((item) => `- ${item}`);
}

export function buildCodeScoutContextBlock(tree, projectPath, rawPrompt) {
  if (!projectPath || !Array.isArray(tree) || tree.length === 0) return "";

  const candidates = collectCodeScoutCandidates(tree, projectPath, rawPrompt);

  const hasCandidates =
    candidates.promptMatchedFiles.length > 0 ||
    candidates.promptMatchedFolders.length > 0 ||
    candidates.structuralFiles.length > 0 ||
    candidates.structuralFolders.length > 0;

  if (!hasCandidates) return "";

  return [
    "=== Code Scout Hints (read-only; path names only) ===",
    "Prompt-matched existing files (path/name match only):",
    ...formatBulletList(candidates.promptMatchedFiles),
    "",
    "Prompt-matched existing folders (path/name match only):",
    ...formatBulletList(candidates.promptMatchedFolders),
    "",
    "Structural fallback files (common project structure only):",
    ...formatBulletList(candidates.structuralFiles),
    "",
    "Structural fallback folders (common project structure only):",
    ...formatBulletList(candidates.structuralFolders),
    "",
    "Use these as inspection candidates before editing. Inspect likely files before proposing or applying changes.",
    "Code Scout has not read file contents. Do not infer implementation details from these path hints alone.",
    "=== End Code Scout Hints ===",
    "",
  ].join("\n");
}
