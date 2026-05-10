const MAX_SNAPSHOT_ITEMS = 10;

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

function limitList(items) {
  const list = Array.isArray(items) ? items : [];

  return {
    items: list.slice(0, MAX_SNAPSHOT_ITEMS),
    truncated: list.length > MAX_SNAPSHOT_ITEMS,
  };
}

function formatList(listInfo) {
  const items = listInfo?.items || [];
  if (items.length === 0) return "none detected";
  return `${items.join(", ")}${listInfo?.truncated ? ", ..." : ""}`;
}

export function createWorkspaceSnapshot(tree, projectPath, projectTemplateInfo = null) {
  const root = Array.isArray(tree) ? tree.filter(Boolean) : [];
  if (!projectPath || root.length === 0) return null;

  const topLevelFolders = [];
  const topLevelFiles = [];
  const appFolders = [];
  const configFiles = [];
  const packageManagerFiles = [];
  const likelyEntryFiles = [];
  let folderCount = 0;
  let fileCount = 0;

  function visit(nodes, depth = 0) {
    if (!Array.isArray(nodes)) return;

    for (const node of nodes) {
      const name = cleanName(node?.name);
      if (!name) continue;

      const directory = isDir(node);
      const path = relativePath(node, projectPath);

      if (directory) folderCount += 1;
      else fileCount += 1;

      if (depth === 0) {
        if (directory) pushUnique(topLevelFolders, name);
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
    projectRoot: projectPath,
    detectedTemplateName:
      cleanName(projectTemplateInfo?.detectedTemplate?.name) || null,
    detectedKind: cleanName(projectTemplateInfo?.kind) || null,
    counts: {
      folders: folderCount,
      files: fileCount,
      visibleItems: folderCount + fileCount,
    },
    topLevelFolders: limitList(topLevelFolders),
    topLevelFiles: limitList(topLevelFiles),
    appFolders: limitList(appFolders),
    likelyEntryFiles: limitList(likelyEntryFiles),
    configFiles: limitList(configFiles),
    packageManagerFiles: limitList(packageManagerFiles),
  };
}

export function buildWorkspaceSnapshotContextBlock(
  tree,
  projectPath,
  projectTemplateInfo = null,
) {
  const snapshot = createWorkspaceSnapshot(tree, projectPath, projectTemplateInfo);
  if (!snapshot) return "";

  const detectedTemplate = snapshot.detectedTemplateName || "none detected";
  const detectedKind = snapshot.detectedKind || "none detected";

  return [
    "=== Workspace Snapshot (read-only; already-loaded tree only) ===",
    `Project root: ${snapshot.projectRoot}`,
    `Detected template: ${detectedTemplate}`,
    `Detected project kind: ${detectedKind}`,
    `Known visible items: ${snapshot.counts.folders} folder(s), ${snapshot.counts.files} file(s)`,
    `Top-level folders: ${formatList(snapshot.topLevelFolders)}`,
    `Top-level files: ${formatList(snapshot.topLevelFiles)}`,
    `Likely app folders: ${formatList(snapshot.appFolders)}`,
    `Likely entry files: ${formatList(snapshot.likelyEntryFiles)}`,
    `Config files: ${formatList(snapshot.configFiles)}`,
    `Package manager files: ${formatList(snapshot.packageManagerFiles)}`,
    "This snapshot centralizes facts KForge already knows from the loaded workspace tree.",
    "It has not read file contents, parsed package.json, or executed tools.",
    "Keep using the more specific workspace blocks below for detailed routing hints.",
    "=== End Workspace Snapshot ===",
    "",
  ].join("\n");
}
