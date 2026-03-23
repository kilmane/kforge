import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const SERVICE_LOG_EVENT = "kforge://service/log";
const SERVICE_STATUS_EVENT = "kforge://service/status";

export async function runServiceSetup(serviceId, projectPath, options = {}) {
  if (!serviceId || !String(serviceId).trim()) {
    throw new Error("Service id is required");
  }

  if (!projectPath || !String(projectPath).trim()) {
    throw new Error("Project path is required");
  }

  return invoke("service_setup", {
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

export { SERVICE_LOG_EVENT, SERVICE_STATUS_EVENT };
