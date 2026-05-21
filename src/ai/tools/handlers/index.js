// src/ai/tools/handlers/index.js
//
// Central registry/dispatcher for tool handlers.
// Keeps tool name -> implementation mapping in one place.
//
// Handlers return a STRING (for transcript display) to preserve current behavior.

import {
  openFile,
  readFolderTree,
  resolvePathWithinProject,
  getProjectRoot,
  saveFile,
  makeDir,
} from "../../../lib/fs";
import { search_in_file } from "./search_in_file.js";

const ABSOLUTE_PATH_RE = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/;

function summarizeText(text, maxChars = 700) {
  const s = String(text ?? "");
  if (s.length <= maxChars) return s;
  return `${s.slice(0, maxChars)}\n…(truncated)`;
}

function basenameOfPath(p) {
  const raw = String(p || "");
  const normalized = raw.replaceAll("\\", "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || raw;
}

function isSourceLikeFile(path = "") {
  const p = String(path || "").toLowerCase();
  return /\.(js|jsx|ts|tsx|css|html|json|md|mjs|cjs)$/.test(p);
}

function isDestructiveRewriteGuardedFile(path = "") {
  const p = String(path || "").toLowerCase();
  return /\.(js|jsx|ts|tsx|css|html|mjs|cjs)$/.test(p);
}

function collectMeaningfulSourceLines(content = "") {
  return String(content ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length >= 8)
    .filter((line) => !/^(?:import|export)\b/.test(line))
    .filter((line) => !/^[{}()[\],;]+$/.test(line))
    .slice(0, 500);
}

function countRetainedMeaningfulLines(existingLines, nextContent = "") {
  const nextLines = new Set(collectMeaningfulSourceLines(nextContent));
  return existingLines.filter((line) => nextLines.has(line)).length;
}

function looksLikeStarterOrPlaceholderSourceContent(content = "") {
  const lower = String(content || "").toLowerCase();

  return (
    looksLikePlaceholderWrite(content) ||
    (lower.includes("reactlogo") && lower.includes("vitelogo")) ||
    (lower.includes("click on the vite and react logos") &&
      lower.includes("learn react"))
  );
}

function looksLikePlaceholderWrite(content = "") {
  const s = String(content || "").trim();
  const lower = s.toLowerCase();

  if (!s) return true;

  const placeholderPatterns = [
    /^\/\*\s*updated content\b[\s\S]*\*\/$/i,
    /^\/\/\s*updated content\b/i,
    /^\/\*\s*todo\b[\s\S]*\*\/$/i,
    /^<file text>$/i,
    /^<file contents?>$/i,
    /^updated content with\b/i,
    /^placeholder\b/i,
    /^todo\b/i,
  ];

  return (
    placeholderPatterns.some((re) => re.test(s)) ||
    lower.includes("updated content with a clickable link") ||
    lower.includes("replace with actual") ||
    lower.includes("rest of file unchanged")
  );
}

function getHtmlEmptyDivIds(content = "") {
  return [...String(content ?? "").matchAll(/<div\b[^>]*\bid=["']([^"']+)["'][^>]*>\s*<\/div>/gi)]
    .map((match) => String(match[1] || "").trim())
    .filter(Boolean);
}

function getPrimaryHtmlMountId(content = "") {
  const ids = getHtmlEmptyDivIds(content);

  if (ids.includes("root")) return "root";

  return ids[0] || "";
}

function shouldBlockIndexHtmlMountIdChange({
  path,
  existingContent,
  nextContent,
}) {
  const p = String(path || "").replaceAll("\\", "/").toLowerCase();

  if (!p.endsWith("index.html")) return "";

  const existingMountId = getPrimaryHtmlMountId(existingContent);
  const nextMountId = getPrimaryHtmlMountId(nextContent);

  if (!existingMountId || !nextMountId) return "";
  if (existingMountId === nextMountId) return "";

  return (
    "write_file blocked: this would change the app mount id in index.html " +
    `from "${existingMountId}" to "${nextMountId}". ` +
    "For React/Vite apps, preserve the existing mount id unless you also inspect and update the matching main entry file."
  );
}
function shouldBlockSuspiciousWrite({ path, existingContent, nextContent }) {
  const next = String(nextContent ?? "");
  const existing =
    existingContent == null ? null : String(existingContent ?? "");

  if (looksLikePlaceholderWrite(next)) {
    return "write_file blocked: content looks like placeholder text, not real file contents.";
  }

  if (!isSourceLikeFile(path) || existing == null) {
    return "";
  }

  const indexHtmlMountIdBlock = shouldBlockIndexHtmlMountIdChange({
    path,
    existingContent: existing,
    nextContent: next,
  });

  if (indexHtmlMountIdBlock) {
    return indexHtmlMountIdBlock;
  }

  const existingBytes = new TextEncoder().encode(existing).length;
  const nextBytes = new TextEncoder().encode(next).length;

  if (existingBytes >= 500 && nextBytes < 120) {
    return (
      "write_file blocked: this would replace an existing substantial source file " +
      `(${existingBytes} bytes) with only ${nextBytes} bytes. ` +
      "Read the file first and provide the full intended file contents."
    );
  }

  if (existingBytes >= 1000 && nextBytes < existingBytes * 0.2) {
    return (
      "write_file blocked: this would shrink an existing source file by more than 80%. " +
      "Read the file first and provide the full intended file contents."
    );
  }

  if (
    isDestructiveRewriteGuardedFile(path) &&
    existingBytes >= 500 &&
    nextBytes < existingBytes * 0.75 &&
    !looksLikeStarterOrPlaceholderSourceContent(existing)
  ) {
    const existingLines = collectMeaningfulSourceLines(existing);
    const retainedCount = countRetainedMeaningfulLines(existingLines, next);
    const retainedRatio =
      existingLines.length > 0 ? retainedCount / existingLines.length : 1;

    if (existingLines.length >= 8 && retainedRatio < 0.35) {
      return (
        "write_file blocked: this edit appears to replace a substantial existing app/source file " +
        "while preserving very little of its current implementation. Make the smallest targeted edit instead, " +
        "or inspect and preserve the existing functionality."
      );
    }
  }

  return "";
}

function isDirNode(node) {
  if (!node || typeof node !== "object") return false;
  if (node.type === "dir" || node.kind === "dir") return true;
  if (Array.isArray(node.children)) return true;
  return false;
}

function labelNode(node) {
  if (!node) return "(unknown)";
  if (typeof node === "string") return node;
  const name = node.name || basenameOfPath(node.path || "");
  return name || "(unnamed)";
}

function ensureProjectRootForRelativeHelp() {
  const root = getProjectRoot();
  if (!root) {
    return "No project folder is selected. Use the Explorer “Open Folder” first so relative paths like `src` can be resolved safely.";
  }
  return null;
}

function validateToolPath(rawPath, toolName) {
  const p = String(rawPath || "").trim();

  if (!p) {
    throw new Error(`${toolName}: missing required arg: path`);
  }

  const malformedReason =
    /^(?:path|dirpath|filepath|file|folder|directory)\s*[:=]/i.test(p)
      ? "looks like an assignment instead of a path value"
      : p.startsWith("{") || p.startsWith("[") || p.endsWith("}") || p.endsWith("]")
        ? "looks like a JSON/object fragment instead of a path value"
        : /[\r\n]/.test(p)
          ? "contains a line break"
          : /^<[^>]+>$/.test(p)
            ? "looks like a placeholder instead of a real path"
            : "";

  if (malformedReason) {
    throw new Error(
      `${toolName}: malformed path argument "${p}" (${malformedReason}). ` +
        'Pass only the path value, for example "src/App.jsx" or "src".',
    );
  }

  return p;
}

function ensurePathCanResolve(rawPath, toolName) {
  const p = validateToolPath(rawPath, toolName);

  if (!ABSOLUTE_PATH_RE.test(p)) {
    const hint = ensureProjectRootForRelativeHelp();
    if (hint) throw new Error(`${toolName}: forbidden path: ${p}\n${hint}`);
  }

  return p;
}

/**
 * read_file
 * args: { path }
 */
export async function read_file(args = {}) {
  const rawPath = ensurePathCanResolve(args?.path, "read_file");
  const filePath = resolvePathWithinProject(rawPath);

  const content = await openFile(filePath);
  const text = String(content ?? "");
  const byteLen = new TextEncoder().encode(text).length;
  const preview = summarizeText(text, 700);

  return `Read ${byteLen} bytes (Path: ${filePath})\n\n--- File preview ---\n${preview}`;
}

/**
 * list_dir
 * args: { path } or { dirPath }
 */
export async function list_dir(args = {}) {
  const rawPath = ensurePathCanResolve(args?.path || args?.dirPath, "list_dir");
  const dp = resolvePathWithinProject(rawPath);

  const tree = await readFolderTree(dp);
  const nodes = Array.isArray(tree) ? tree.filter(Boolean) : [];

  const top = nodes.slice(0, 40).map((n) => {
    const kind = isDirNode(n) ? "dir" : "file";
    return `- [${kind}] ${labelNode(n)}`;
  });

  const dirs = nodes.filter((n) => isDirNode(n)).length;
  const files = Math.max(0, nodes.length - dirs);

  return (
    `Listed ${nodes.length} entries (dirs: ${dirs}, files: ${files}) (Path: ${dp})` +
    (top.length
      ? `\n\n--- Directory listing (top-level) ---\n${top.join("\n")}`
      : "\n\n(empty)")
  );
}

/**
 * write_file
 * args: { path, content }
 */
export async function write_file(args = {}) {
  const rawPath = ensurePathCanResolve(args?.path, "write_file");
  const content = args?.content ?? "";

  const filePath = resolvePathWithinProject(rawPath);
  let existingContent = null;

  try {
    existingContent = await openFile(filePath);
  } catch {
    existingContent = null;
  }

  const blockedReason = shouldBlockSuspiciousWrite({
    path: filePath,
    existingContent,
    nextContent: content,
  });

  if (blockedReason) {
    throw new Error(blockedReason);
  }

  await saveFile(filePath, String(content));

  const byteLen = new TextEncoder().encode(String(content)).length;
  return `Wrote ${byteLen} bytes (Path: ${filePath})`;
}

/**
 * mkdir
 * args: { path }
 */
export async function mkdir(args = {}) {
  const rawPath = ensurePathCanResolve(args?.path, "mkdir");
  const dirPath = resolvePathWithinProject(rawPath);

  await makeDir(dirPath);

  return `Created directory (Path: ${dirPath})`;
}

// Tool name -> handler mapping
export const toolHandlers = {
  read_file,
  list_dir,
  search_in_file,
  write_file,
  mkdir,
};

export function hasTool(toolName) {
  const t = String(toolName || "").trim();
  return Boolean(toolHandlers[t]);
}

export async function runToolHandler(toolName, args) {
  const t = String(toolName || "").trim();
  const fn = toolHandlers[t];
  if (!fn) throw new Error(`Unknown tool: ${t}`);
  return await fn(args);
}