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
  "index.html",
  "tauri.conf.",
  "cargo.toml",
];

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

function isConfigFileName(name) {
  const lower = cleanName(name).toLowerCase();
  return CONFIG_FILE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function collectWorkspaceSummary(tree, projectPath) {
  const root = Array.isArray(tree) ? tree.filter(Boolean) : [];
  const topLevelDirs = [];
  const topLevelFiles = [];
  const appFolders = [];
  const configFiles = [];

  function visit(nodes, depth = 0) {
    if (!Array.isArray(nodes)) return;

    for (const node of nodes) {
      const name = cleanName(node?.name);
      if (!name) continue;

      const directory = isDir(node);
      const path = relativePath(node, projectPath);

      if (depth === 0) {
        if (directory) topLevelDirs.push(name);
        else topLevelFiles.push(name);
      }

      if (directory && APP_FOLDER_NAMES.has(name.toLowerCase())) {
        appFolders.push(path);
      }

      if (!directory && isConfigFileName(name)) {
        configFiles.push(path);
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
    topLevelDirsTruncated: topLevelDirs.length > MAX_ITEMS,
    topLevelFilesTruncated: topLevelFiles.length > MAX_ITEMS,
    appFoldersTruncated: appFolders.length > MAX_ITEMS,
    configFilesTruncated: configFiles.length > MAX_ITEMS,
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
    `Config/entry files: ${formatList(summary.configFiles, summary.configFilesTruncated)}`,
    "This summary is based only on the already-loaded workspace tree. It has not read file contents.",
    "Use it to understand the current workspace before planning edits. Prefer existing folders and files over inventing new structure.",
    "=== End Repo Explore Summary ===",
    "",
  ].join("\n");
}
