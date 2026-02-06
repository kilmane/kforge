// src/brains/tauri-fs-adapter.js
import {
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import * as path from "@tauri-apps/api/path";

async function absJoin(rootAbs, rel) {
  const parts = String(rel || "")
    .split("/")
    .filter(Boolean);
  return await path.join(rootAbs, ...parts);
}

export const tauriFsAdapter = {
  async readTextFile(absPath) {
    return await readTextFile(absPath);
  },
  async writeTextFile(absPath, contents) {
    await writeTextFile(absPath, contents);
  },
  async mkdir(absDirPath) {
    await mkdir(absDirPath, { recursive: true });
  },
  async exists(absPath) {
    return await exists(absPath);
  },
  absJoin,
};
