import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { readTextFile } from "@tauri-apps/plugin-fs";

import {
  findTemplateByHint,
  findTemplatesByDetectedKind,
  listTemplates,
} from "./templateRegistry";

let previewLogBuffer = [];
let previewStatusValue = "idle";

export function getPreviewLogBuffer() {
  return previewLogBuffer.slice();
}

export function clearPreviewLogBuffer() {
  previewLogBuffer = [];
}

export function appendPreviewLog(entry) {
  previewLogBuffer = [...previewLogBuffer, entry].slice(-600);
}

export function getPreviewStatusValue() {
  return previewStatusValue || "idle";
}

export function setPreviewStatusValue(status) {
  previewStatusValue = String(status || "idle");
}

export function onPreviewLog(cb) {
  return listen("kforge://preview/log", (event) => cb(event.payload));
}

export function onPreviewStatus(cb) {
  return listen("kforge://preview/status", (event) => cb(event.payload));
}

export async function previewDetectKind(projectPath) {
  return invoke("preview_detect_kind", { projectPath });
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function collectDependencies(pkg) {
  if (!pkg) return new Set();

  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
    ...pkg.optionalDependencies,
  };

  return new Set(Object.keys(deps || {}).map((d) => d.toLowerCase()));
}

function identifyTemplateFromDependencies(dependencies) {
  if (!dependencies || dependencies.size === 0) {
    return null;
  }

  if (dependencies.has("next")) {
    return findTemplateByHint("next");
  }

  if (dependencies.has("vite")) {
    return findTemplateByHint("vite");
  }

  const templates = listTemplates();

  for (const template of templates) {
    const hints = template?.detection?.hints || [];

    for (const hint of hints) {
      if (dependencies.has(String(hint).toLowerCase())) {
        return template;
      }
    }
  }

  return null;
}

export async function previewDetectTemplates(projectPath) {
  const kind = await previewDetectKind(projectPath);

  const compatibleTemplates = findTemplatesByDetectedKind(kind);

  let detectedTemplate = null;

  if (kind === "package") {
    try {
      const packagePath = `${projectPath}/package.json`;
      const text = await readTextFile(packagePath);

      const pkg = safeParse(text);
      const dependencies = collectDependencies(pkg);

      detectedTemplate = identifyTemplateFromDependencies(dependencies);
    } catch {
      // package.json missing or unreadable
    }
  }

  return {
    kind,
    compatibleTemplates,
    detectedTemplate,
  };
}

export async function previewGetStatus() {
  return invoke("preview_get_status");
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
