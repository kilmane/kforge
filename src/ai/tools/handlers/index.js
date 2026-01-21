// src/ai/tools/handlers/index.js
//
// Central registry/dispatcher for tool handlers.
// Keeps tool name -> implementation mapping in one place.
//
// Handlers return a STRING (for transcript display) to preserve current behavior.

import { openFile, readFolderTree } from "../../../lib/fs";
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

export async function read_file(args = {}) {
  const filePath = String(args?.path || "").trim();
  if (!filePath) throw new Error("read_file: missing required arg: path");

  const content = await openFile(filePath);
  const text = String(content ?? "");
  const byteLen = new TextEncoder().encode(text).length;
  const preview = summarizeText(text, 700);

  return `Read ${byteLen} bytes (Path: ${filePath})\n\n--- File preview ---\n${preview}`;
}

export async function list_dir(args = {}) {
  const dp = String(args?.path || args?.dirPath || "").trim();
  if (!dp) throw new Error("list_dir: missing required arg: path");

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
    (top.length ? `\n\n--- Directory listing (top-level) ---\n${top.join("\n")}` : "\n\n(empty)")
  );
}

// Tool name -> handler mapping
export const toolHandlers = {
  read_file,
  list_dir,
  search_in_file
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
