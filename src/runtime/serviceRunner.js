import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const SERVICE_LOG_EVENT = "service-log";
const SERVICE_STATUS_EVENT = "service-status";

export async function runServiceSetup(serviceId, projectPath, options = {}) {
  if (!serviceId) throw new Error("serviceId is required");
  if (!projectPath || !String(projectPath).trim()) {
    throw new Error("Project path is required");
  }

  return invoke("service_run_setup", {
    serviceId,
    projectPath,
    options,
  });
}

export async function detectGithubRepo(projectPath) {
  if (!projectPath || !String(projectPath).trim()) {
    throw new Error("Project path is required");
  }

  return invoke("github_detect_repo", {
    projectPath,
  });
}

export async function githubOpenRepo(projectPath) {
  if (!projectPath || !String(projectPath).trim()) {
    throw new Error("Project path is required");
  }

  return invoke("github_open_repo", {
    projectPath,
  });
}

export async function githubPull(projectPath) {
  if (!projectPath || !String(projectPath).trim()) {
    throw new Error("Project path is required");
  }

  return invoke("github_pull", {
    projectPath,
  });
}

export async function githubPush(projectPath) {
  if (!projectPath || !String(projectPath).trim()) {
    throw new Error("Project path is required");
  }

  return invoke("github_push", {
    projectPath,
  });
}

/* -------------------------------------------------- */
/* NEW — GitHub Clone (Phase 4.6 Part 4) */
/* -------------------------------------------------- */

export async function githubCloneIntoFolder({
  repoUrl,
  parentDir,
  folderName,
}) {
  if (!repoUrl || !String(repoUrl).trim()) {
    throw new Error("GitHub repository URL is required");
  }

  if (!parentDir || !String(parentDir).trim()) {
    throw new Error("Destination folder is required");
  }

  return invoke("github_clone_repo", {
    repoUrl: String(repoUrl).trim(),
    parentDir: String(parentDir).trim(),
    folderName: String(folderName || "").trim(),
  });
}

/* -------------------------------------------------- */
/* LOG + STATUS SUBSCRIPTIONS */
/* -------------------------------------------------- */

export async function subscribeServiceLogs(onLog) {
  if (typeof onLog !== "function") {
    throw new Error("onLog callback is required");
  }

  const unlisten = await listen(SERVICE_LOG_EVENT, (event) => {
    onLog(event.payload);
  });

  return unlisten;
}

export async function subscribeServiceStatus(onStatus) {
  if (typeof onStatus !== "function") {
    throw new Error("onStatus callback is required");
  }

  const unlisten = await listen(SERVICE_STATUS_EVENT, (event) => {
    onStatus(event.payload);
  });

  return unlisten;
}
