const APP_FOLDER_NAMES = new Set([
  "src",
  "app",
  "pages",
  "components",
  "routes",
  "views",
  "lib",
  "utils",
  "hooks",
  "styles",
  "public",
  "assets",
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

const PACKAGE_MANAGER_FILES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
]);

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

const MAX_ITEMS = 12;

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

function pushUnique(target, value) {
  const clean = cleanName(value);
  if (!clean || target.includes(clean)) return;
  target.push(clean);
}

function isConfigFileName(name) {
  const lower = cleanName(name).toLowerCase();
  return CONFIG_FILE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function isPackageManagerFileName(name) {
  return PACKAGE_MANAGER_FILES.has(cleanName(name).toLowerCase());
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

function collectWorkspaceSummary(tree, projectPath) {
  const root = Array.isArray(tree) ? tree.filter(Boolean) : [];
  const topLevelDirs = [];
  const topLevelFiles = [];
  const appFolders = [];
  const configFiles = [];
  const packageManagerFiles = [];
  const likelyEntryFiles = [];

  function visit(nodes, depth = 0) {
    if (!Array.isArray(nodes)) return;

    for (const node of nodes) {
      const name = cleanName(node?.name);
      if (!name) continue;

      const directory = isDir(node);
      const path = relativePath(node, projectPath);

      if (depth === 0) {
        if (directory) pushUnique(topLevelDirs, name);
        else pushUnique(topLevelFiles, name);
      }

      if (directory && APP_FOLDER_NAMES.has(name.toLowerCase())) {
        pushUnique(appFolders, path);
      }

      if (!directory && isConfigFileName(name)) {
        pushUnique(configFiles, path);
      }

      if (!directory && isPackageManagerFileName(name)) {
        pushUnique(packageManagerFiles, path);
      }

      if (!directory && isLikelyEntryFilePath(path)) {
        pushUnique(likelyEntryFiles, path);
      }

      if (directory) visit(node.children, depth + 1);
    }
  }

  visit(root);

  return {
    topLevelDirs: topLevelDirs.slice(0, MAX_ITEMS),
    topLevelFiles: topLevelFiles.slice(0, MAX_ITEMS),
    appFolders: appFolders.slice(0, MAX_ITEMS),
    configFiles: configFiles.slice(0, MAX_ITEMS),
    packageManagerFiles: packageManagerFiles.slice(0, MAX_ITEMS),
    likelyEntryFiles: likelyEntryFiles.slice(0, MAX_ITEMS),
    topLevelDirsTruncated: topLevelDirs.length > MAX_ITEMS,
    topLevelFilesTruncated: topLevelFiles.length > MAX_ITEMS,
    appFoldersTruncated: appFolders.length > MAX_ITEMS,
    configFilesTruncated: configFiles.length > MAX_ITEMS,
    packageManagerFilesTruncated: packageManagerFiles.length > MAX_ITEMS,
    likelyEntryFilesTruncated: likelyEntryFiles.length > MAX_ITEMS,
  };
}

function formatList(items, truncated) {
  if (!items || items.length === 0) return "none detected";
  return `${items.join(", ")}${truncated ? ", ..." : ""}`;
}

export function buildWorkspaceSummaryContextBlock(tree, projectPath) {
  if (!projectPath || !Array.isArray(tree) || tree.length === 0) return "";

  const summary = collectWorkspaceSummary(tree, projectPath);

  return [
    "=== Repo Explore Summary (read-only; file/folder names only) ===",
    `Project root: ${projectPath}`,
    `Top-level folders: ${formatList(summary.topLevelDirs, summary.topLevelDirsTruncated)}`,
    `Top-level files: ${formatList(summary.topLevelFiles, summary.topLevelFilesTruncated)}`,
    `Likely app folders: ${formatList(summary.appFolders, summary.appFoldersTruncated)}`,
    `Likely entry files: ${formatList(summary.likelyEntryFiles, summary.likelyEntryFilesTruncated)}`,
    `Config files: ${formatList(summary.configFiles, summary.configFilesTruncated)}`,
    `Package manager files: ${formatList(summary.packageManagerFiles, summary.packageManagerFilesTruncated)}`,
    "This summary is based only on the already-loaded workspace tree. It has not read file contents.",
    "Use it to understand the current workspace before planning edits. Prefer existing folders and files over inventing new structure.",
    "=== End Repo Explore Summary ===",
    "",
  ].join("\n");
}
