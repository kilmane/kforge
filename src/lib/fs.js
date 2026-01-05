import { open } from "@tauri-apps/plugin-dialog";
import { readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";

/**
 * Join paths safely (Windows + Unix)
 */
function joinPath(parent, name) {
  if (!parent) return name;
  const sep = parent.includes("\\") ? "\\" : "/";
  const trimmed = parent.endsWith(sep) ? parent.slice(0, -1) : parent;
  return `${trimmed}${sep}${name}`;
}

/**
 * Walk a directory and build a stable tree:
 * { name, path, children? }
 *
 * IMPORTANT:
 * Tauri v2 plugin-fs readDir() returns DirEntry with:
 * - name
 * - isDirectory / isFile / isSymlink
 * It does NOT include a path, so we compute it. :contentReference[oaicite:1]{index=1}
 */
async function walkDir(dirPath) {
  const entries = await readDir(dirPath);

  const nodes = [];
  for (const e of entries || []) {
    const name = e?.name ?? "(unknown)";
    const path = joinPath(dirPath, name);

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
    .sort((a, b) => a.name.localeCompare(b.name));
  const files = nodes
    .filter((n) => !Array.isArray(n.children))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...dirs, ...files];
}

export async function openProjectFolder() {
  if (!isTauri()) {
    alert("Tauri not available. Use the desktop app.");
    return null;
  }

  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open Folder"
  });

  if (!selected) return null;
  if (Array.isArray(selected)) return selected[0] ?? null;
  return selected;
}

export async function readFolderTree(path) {
  if (!isTauri()) return [];
  if (!path) return [];
  return await walkDir(path);
}

export async function openFile(path) {
  if (!isTauri()) return "";
  if (!path) throw new Error("openFile called with empty path");
  return await readTextFile(path);
}

export async function saveFile(path, contents) {
  if (!isTauri()) return;
  if (!path) throw new Error("saveFile called with empty path");
  await writeTextFile(path, contents ?? "");
}
