// src/lib/fs.js
import { open } from "@tauri-apps/plugin-dialog";
import {
  readDir,
  readTextFile,
  writeTextFile,
  mkdir,
} from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";

// Phase 4.1 — Project Memory (Step 2: wire to current project root)
import {
  loadProjectMemory,
  saveProjectMemory,
  defaultMemoryV1,
} from "../brains/project-memory.js";
import { tauriFsAdapter } from "../brains/tauri-fs-adapter.js";

/**
 * Module-scoped "current project root".
 * IMPORTANT: App.js is the authority that decides when this changes.
 */
let CURRENT_PROJECT_ROOT = null;

/**
 * Module-scoped Project Memory (v1).
 * Loaded explicitly when App.js “officially opens” a root.
 */
let CURRENT_PROJECT_MEMORY = defaultMemoryV1();
let PROJECT_MEMORY_LOADED_FOR_ROOT = null;

/**
 * Basic absolute-path detection for Windows + Unix.
 */
function isAbsolutePath(p) {
  const s = String(p || "").trim();
  if (!s) return false;

  // Windows drive: C:\ or C:/
  if (/^[A-Za-z]:[\\/]/.test(s)) return true;

  // UNC path: \\server\share
  if (/^\\\\/.test(s)) return true;

  // Unix absolute
  if (s.startsWith("/")) return true;

  return false;
}

/**
 * Normalize slashes for consistent comparisons.
 * We keep forward slashes for internal comparisons.
 */
function normalizeForCompare(p) {
  return String(p || "").replaceAll("\\", "/");
}

/**
 * Join paths safely (Windows + Unix)
 */
function joinPath(parent, name) {
  if (!parent) return name;

  const p = String(parent);
  const n = String(name);

  const parentHasBackslash = p.includes("\\");
  const sep = parentHasBackslash ? "\\" : "/";

  const trimmed = p.endsWith(sep) ? p.slice(0, -1) : p;

  // If name begins with a separator, trim it (to avoid "//" or "\\")
  const nameTrimmed = n.startsWith(sep) ? n.slice(1) : n;

  return `${trimmed}${sep}${nameTrimmed}`;
}

/**
 * Resolve "." and ".." segments in a path (without touching the filesystem).
 * Works for both Windows and Unix-style paths.
 */
function resolveDotSegments(inputPath) {
  const raw = String(inputPath || "");
  if (!raw) return raw;

  const hasBackslash = raw.includes("\\");
  const sep = hasBackslash ? "\\" : "/";

  // Preserve a Windows drive prefix like "C:\"
  const driveMatch = raw.match(/^([A-Za-z]:)[\\/]/);
  const drivePrefix = driveMatch ? `${driveMatch[1]}${sep}` : "";

  // Preserve UNC prefix like "\\server\share\"
  const uncMatch = raw.match(/^\\\\[^\\]+\\[^\\]+/);
  const uncPrefix = uncMatch ? uncMatch[0] + "\\" : "";

  let pathBody = raw;
  if (drivePrefix) pathBody = raw.slice(drivePrefix.length);
  else if (uncPrefix) pathBody = raw.slice(uncPrefix.length);
  else if (raw.startsWith(sep)) pathBody = raw.slice(1);

  const parts = pathBody.split(/[\\/]+/).filter(Boolean);
  const out = [];

  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      if (out.length > 0) out.pop();
      continue;
    }
    out.push(part);
  }

  const rebuiltBody = out.join(sep);

  if (drivePrefix) return drivePrefix + rebuiltBody;
  if (uncPrefix) return uncPrefix + rebuiltBody;

  // Unix absolute
  if (raw.startsWith("/")) return "/" + rebuiltBody;

  // Relative
  return rebuiltBody;
}

/**
 * Ensure a path is within the current project root.
 * - If absolute: enforce it's under project root (when project root known).
 * - If relative: resolve against project root, then enforce it stays under.
 *
 * Returns an ABSOLUTE path suitable for Tauri fs APIs.
 */
export function resolvePathWithinProject(inputPath) {
  const raw = String(inputPath || "").trim();
  if (!raw) throw new Error("forbidden path: (empty)");

  // If we don't know the project root yet, we can only accept absolute paths.
  if (!CURRENT_PROJECT_ROOT) {
    if (isAbsolutePath(raw)) return resolveDotSegments(raw);
    throw new Error(`forbidden path: ${raw} (no project folder selected)`);
  }

  const root = resolveDotSegments(String(CURRENT_PROJECT_ROOT));
  const rootNorm = normalizeForCompare(root).toLowerCase();

  let resolved = raw;

  if (!isAbsolutePath(resolved)) {
    resolved = joinPath(root, resolved);
  }

  resolved = resolveDotSegments(resolved);

  const resolvedNorm = normalizeForCompare(resolved).toLowerCase();

  // Ensure "resolved" is inside "root" (prefix match on normalized path).
  const rootWithSlash = rootNorm.endsWith("/") ? rootNorm : rootNorm + "/";
  const resolvedWithSlash = resolvedNorm.endsWith("/")
    ? resolvedNorm
    : resolvedNorm + "/";

  if (!resolvedWithSlash.startsWith(rootWithSlash)) {
    throw new Error(`forbidden path: ${raw} (outside project scope)`);
  }

  return resolved;
}

export function getProjectRoot() {
  return CURRENT_PROJECT_ROOT;
}

/**
 * App.js uses this to “officially open” a root.
 */
export function setProjectRoot(path) {
  const p = String(path || "").trim();
  CURRENT_PROJECT_ROOT = p || null;

  // Reset memory linkage when root changes (explicit load happens elsewhere)
  PROJECT_MEMORY_LOADED_FOR_ROOT = null;
  CURRENT_PROJECT_MEMORY = defaultMemoryV1();
}

/**
 * Project Memory accessors (explicit, user-controlled).
 */
export function getProjectMemory() {
  return CURRENT_PROJECT_MEMORY;
}

export function setProjectMemory(nextMemory) {
  CURRENT_PROJECT_MEMORY = nextMemory || defaultMemoryV1();
}

/**
 * Load memory for CURRENT_PROJECT_ROOT (called by App.js after opening a root).
 * Calm behavior: if missing/broken -> default memory.
 */
export async function loadProjectMemoryForCurrentRoot() {
  const root = getProjectRoot();
  if (!root) {
    CURRENT_PROJECT_MEMORY = defaultMemoryV1();
    PROJECT_MEMORY_LOADED_FOR_ROOT = null;
    return CURRENT_PROJECT_MEMORY;
  }

  if (PROJECT_MEMORY_LOADED_FOR_ROOT === root) {
    return CURRENT_PROJECT_MEMORY;
  }

  const mem = await loadProjectMemory(root, tauriFsAdapter);
  CURRENT_PROJECT_MEMORY = mem;
  PROJECT_MEMORY_LOADED_FOR_ROOT = root;
  return CURRENT_PROJECT_MEMORY;
}

/**
 * Save memory for CURRENT_PROJECT_ROOT (explicit calls only).
 */
export async function saveProjectMemoryForCurrentRoot() {
  const root = getProjectRoot();
  if (!root) return;
  await saveProjectMemory(root, tauriFsAdapter, CURRENT_PROJECT_MEMORY);
}

/**
 * Walk a directory and build a stable tree:
 * { name, path, children? }
 *
 * NOTE:
 * plugin-fs readDir returns entries with name + isDirectory/isFile flags,
 * and not necessarily absolute "path", so we compute it.
 */
async function walkDir(dirPath) {
  const safeDir = resolvePathWithinProject(dirPath);
  const entries = await readDir(safeDir);

  const nodes = [];
  for (const e of entries || []) {
    const name = e?.name ?? "(unknown)";
    const path = joinPath(safeDir, name);

    if (e?.isDirectory) {
      const children = await walkDir(path);
      nodes.push({ name, path, children });
    } else {
      nodes.push({ name, path });
    }
  }

  // Sort: folders first then files
  const dirs = nodes
    .filter((n) => Array.isArray(n.children))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const files = nodes
    .filter((n) => !Array.isArray(n.children))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return [...dirs, ...files];
}

/**
 * Open Folder dialog (pick only).
 * IMPORTANT: does NOT set project root and does NOT load memory.
 * App.js will do that once it successfully reads tree + scopes permissions.
 */
export async function openProjectFolder() {
  if (!isTauri()) {
    alert("Tauri not available. Use the desktop app.");
    return null;
  }

  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open Folder",
  });

  if (!selected) return null;

  const chosen = Array.isArray(selected) ? (selected[0] ?? null) : selected;
  if (!chosen) return null;

  return String(chosen);
}

/**
 * New Project (folder-only):
 * - Ask for a parent folder (browse)
 * - Create <parent>/<ProjectName>
 * - Return the created path
 *
 * IMPORTANT: does NOT set project root and does NOT load memory.
 * App.js will do that as part of the “official open” flow.
 */
export async function createNewProject({ name, parentDir } = {}) {
  if (!isTauri()) {
    alert("Tauri not available. Use the desktop app.");
    return null;
  }

  const rawName = String(name || "").trim();
  if (!rawName) throw new Error("Project name is required.");

  // Windows-safe folder name
  const safeName = rawName
    .replaceAll(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();

  if (!safeName) throw new Error("Project name is not valid.");

  let base = String(parentDir || "").trim();

  if (!base) {
    const chosenParent = await open({
      directory: true,
      multiple: false,
      title: "Choose where to create your project",
    });

    const parent = Array.isArray(chosenParent)
      ? (chosenParent[0] ?? null)
      : chosenParent;
    if (!parent) return null;

    base = String(parent);
  }

  if (!isAbsolutePath(base)) {
    throw new Error("Project location must be an absolute folder path.");
  }

  const projectRoot = resolveDotSegments(joinPath(base, safeName));

  await mkdir(projectRoot, { recursive: true });

  return projectRoot;
}

export async function readFolderTree(path) {
  if (!isTauri()) return [];
  if (!path) return [];
  const safe = resolvePathWithinProject(path);
  return await walkDir(safe);
}

export async function openFile(path) {
  if (!isTauri()) return "";
  if (!path) throw new Error("openFile called with empty path");
  const safe = resolvePathWithinProject(path);
  return await readTextFile(safe);
}

export async function saveFile(path, contents) {
  if (!isTauri()) return;
  if (!path) throw new Error("saveFile called with empty path");
  const safe = resolvePathWithinProject(path);
  await writeTextFile(safe, contents ?? "");
}

export async function makeDir(path) {
  if (!isTauri()) return;
  if (!path) throw new Error("makeDir called with empty path");
  const safe = resolvePathWithinProject(path);
  await mkdir(safe, { recursive: true });
}
