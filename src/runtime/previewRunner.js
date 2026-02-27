import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export function onPreviewLog(cb) {
  // cb({ kind, line })
  return listen("kforge://preview/log", (event) => cb(event.payload));
}

export function onPreviewStatus(cb) {
  // cb({ status })
  return listen("kforge://preview/status", (event) => cb(event.payload));
}

export async function previewInstall(projectPath) {
  return invoke("preview_install", { projectPath });
}

export async function previewStart(projectPath) {
  return invoke("preview_start", { projectPath });
}

export async function previewStop() {
  return invoke("preview_stop");
}
