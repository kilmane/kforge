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

/**
 * read_file
 * args: { path }
 */
export async function read_file(args = {}) {
  const rawPath = String(args?.path || "").trim();
  if (!rawPath) throw new Error("read_file: missing required arg: path");

  // Helpful error when relative path is used but no root selected
  if (!rawPath.match(/^[A-Za-z]:[\\/]|^\\\\|^\//)) {
    const hint = ensureProjectRootForRelativeHelp();
    if (hint) throw new Error(`read_file: forbidden path: ${rawPath}\n${hint}`);
  }

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
  const rawPath = String(args?.path || args?.dirPath || "").trim();
  if (!rawPath) throw new Error("list_dir: missing required arg: path");

  // Helpful error when relative path is used but no root selected
  if (!rawPath.match(/^[A-Za-z]:[\\/]|^\\\\|^\//)) {
    const hint = ensureProjectRootForRelativeHelp();
    if (hint) throw new Error(`list_dir: forbidden path: ${rawPath}\n${hint}`);
  }

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
  const rawPath = String(args?.path || "").trim();
  const content = args?.content ?? "";

  if (!rawPath) throw new Error("write_file: missing required arg: path");

  // Helpful error when relative path is used but no root selected
  if (!rawPath.match(/^[A-Za-z]:[\\/]|^\\\\|^\//)) {
    const hint = ensureProjectRootForRelativeHelp();
    if (hint)
      throw new Error(`write_file: forbidden path: ${rawPath}\n${hint}`);
  }

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
  const rawPath = String(args?.path || "").trim();
  if (!rawPath) throw new Error("mkdir: missing required arg: path");

  // Helpful error when relative path is used but no root selected
  if (!rawPath.match(/^[A-Za-z]:[\\/]|^\\\\|^\//)) {
    const hint = ensureProjectRootForRelativeHelp();
    if (hint) throw new Error(`mkdir: forbidden path: ${rawPath}\n${hint}`);
  }

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
