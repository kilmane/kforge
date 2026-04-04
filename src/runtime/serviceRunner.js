import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const SERVICE_LOG_EVENT = "kforge://service/log";
const SERVICE_STATUS_EVENT = "kforge://service/status";

function requireProjectPath(projectPath) {
  if (!projectPath || !String(projectPath).trim()) {
    throw new Error("Project path is required");
  }

  return String(projectPath).trim();
}

export async function runServiceSetup(serviceId, projectPath, options = {}) {
  if (!serviceId) throw new Error("serviceId is required");

  return invoke("service_setup", {
    serviceId,
    projectPath: requireProjectPath(projectPath),
    options,
  });
}

export async function detectGithubRepo(projectPath) {
  return invoke("github_detect_repo", {
    projectPath: requireProjectPath(projectPath),
  });
}

export async function githubOpenRepo(projectPath) {
  return invoke("github_open_repo", {
    projectPath: requireProjectPath(projectPath),
  });
}

export async function githubPull(projectPath) {
  return invoke("github_pull", {
    projectPath: requireProjectPath(projectPath),
  });
}

export async function githubPush(projectPath) {
  return invoke("github_push", {
    projectPath: requireProjectPath(projectPath),
  });
}

export async function supabaseCreateEnvFile(projectPath) {
  return invoke("supabase_create_env_file", {
    projectPath: requireProjectPath(projectPath),
  });
}

export async function supabaseInstallClient(projectPath) {
  return invoke("supabase_install_client", {
    projectPath: requireProjectPath(projectPath),
  });
}

export async function supabaseCreateClientFile(projectPath) {
  return invoke("supabase_create_client_file", {
    projectPath: requireProjectPath(projectPath),
  });
}
export async function supabaseCreateReadExample(projectPath) {
  return invoke("supabase_create_read_example", {
    projectPath: requireProjectPath(projectPath),
  });
}

export async function supabaseCreateInsertExample(projectPath) {
  return invoke("supabase_create_insert_example", {
    projectPath: requireProjectPath(projectPath),
  });
}

export async function supabaseCreateQueryHelper(projectPath) {
  return invoke("supabase_create_query_helper", {
    projectPath: requireProjectPath(projectPath),
  });
}
export async function supabaseQuickConnect(projectPath) {
  return invoke("supabase_quick_connect", {
    projectPath: requireProjectPath(projectPath),
  });
}

export async function stripeCreateEnvFile(projectPath) {
  return invoke("stripe_create_env_file", {
    projectPath: requireProjectPath(projectPath),
  });
}
export async function openaiCreateEnvFile(projectPath) {
  return invoke("openai_create_env_file", {
    projectPath: requireProjectPath(projectPath),
  });
}
export async function openaiInstallSdk(projectPath) {
  return invoke("openai_install_sdk", {
    projectPath: requireProjectPath(projectPath),
  });
}
export async function openExternalUrl(url) {
  if (!url || !String(url).trim()) {
    throw new Error("URL is required");
  }

  return invoke("open_url", {
    url: String(url).trim(),
  });
}

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
