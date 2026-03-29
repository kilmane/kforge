import React, { useEffect, useMemo, useRef, useState } from "react";
import { previewDetectTemplates } from "./previewRunner";
import { SERVICE_REGISTRY } from "./serviceRegistry";
import {
  detectGithubRepo,
  githubOpenRepo,
  githubPull,
  githubPush,
  openExternalUrl,
  runServiceSetup,
  subscribeServiceLogs,
  subscribeServiceStatus,
  supabaseCreateClientFile,
  supabaseCreateEnvFile,
  supabaseInstallClient,
  supabaseQuickConnect,
} from "./serviceRunner";

const DEFAULT_TASK_ID = "code";
const DEFAULT_PROVIDER_ID = "github";

const TASK_GROUPS = [
  {
    id: "code",
    label: "Code",
    providerIds: ["github"],
  },
  {
    id: "deploy",
    label: "Deploy",
    providerIds: ["vercel", "netlify"],
  },
  {
    id: "backend",
    label: "Backend",
    providerIds: ["supabase"],
  },
  {
    id: "payments",
    label: "Payments",
    providerIds: ["stripe"],
  },
];

const FALLBACK_PROVIDER_REGISTRY = {
  vercel: {
    id: "vercel",
    name: "Vercel",
    description:
      "Deploy this GitHub-connected project with guided Vercel setup.",
    status: "available",
    envVars: [],
  },
  netlify: {
    id: "netlify",
    name: "Netlify",
    description:
      "Deploy this GitHub-connected project with guided Netlify setup.",
    status: "available",
    envVars: [],
  },
};

const persistedServicePanelState = {
  logsByService: {},
  activeServiceId: DEFAULT_PROVIDER_ID,
  activeTaskId: DEFAULT_TASK_ID,
  activeProviderId: DEFAULT_PROVIDER_ID,
  serviceStatus: "idle",
  busyServiceId: null,
  githubRepoName: "",
  githubVisibility: "public",
  githubRepoState: null,
};

function resetPersistedServicePanelState() {
  persistedServicePanelState.logsByService = {};
  persistedServicePanelState.activeServiceId = DEFAULT_PROVIDER_ID;
  persistedServicePanelState.activeTaskId = DEFAULT_TASK_ID;
  persistedServicePanelState.activeProviderId = DEFAULT_PROVIDER_ID;
  persistedServicePanelState.serviceStatus = "idle";
  persistedServicePanelState.busyServiceId = null;
  persistedServicePanelState.githubRepoName = "";
  persistedServicePanelState.githubVisibility = "public";
  persistedServicePanelState.githubRepoState = null;
}

function formatEnvVars(envVars) {
  if (!Array.isArray(envVars) || envVars.length === 0) {
    return "No environment variables declared yet.";
  }
  return envVars.join(", ");
}

function sanitizeRepoName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "-");
}

function buildProviderMap() {
  const map = new Map();

  SERVICE_REGISTRY.forEach((service) => {
    map.set(service.id, service);
  });

  Object.values(FALLBACK_PROVIDER_REGISTRY).forEach((service) => {
    if (!map.has(service.id)) {
      map.set(service.id, service);
    }
  });

  return map;
}

function findTaskByProviderId(providerId) {
  return (
    TASK_GROUPS.find((task) => task.providerIds.includes(providerId)) ||
    TASK_GROUPS[0]
  );
}

function getFirstProviderIdForTask(taskId) {
  return (
    TASK_GROUPS.find((task) => task.id === taskId)?.providerIds?.[0] ||
    DEFAULT_PROVIDER_ID
  );
}

function getLogLabel(providerId) {
  if (providerId === "github") return "GitHub";
  if (providerId === "supabase") return "Supabase";
  if (providerId === "stripe") return "Stripe";
  if (providerId === "vercel") return "Vercel";
  if (providerId === "netlify") return "Netlify";
  return providerId || "service";
}

function isDeployProvider(providerId) {
  return providerId === "vercel" || providerId === "netlify";
}

function extractGithubRepoSlug(remoteUrl) {
  const value = String(remoteUrl || "").trim();
  if (!value) return null;

  const sshMatch = value.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i);
  if (sshMatch?.[1]) {
    return sshMatch[1];
  }

  const httpsMatch = value.match(
    /^https?:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?(?:\/)?$/i,
  );
  if (httpsMatch?.[1]) {
    return httpsMatch[1];
  }

  return null;
}

function buildGithubRepoUrl(repoSlug) {
  if (!repoSlug) return null;
  return `https://github.com/${repoSlug}`;
}

function buildVercelImportUrl(repoSlug) {
  const repoUrl = buildGithubRepoUrl(repoSlug);
  if (!repoUrl) return "https://vercel.com/new";
  return `https://vercel.com/new/clone?repository-url=${encodeURIComponent(repoUrl)}`;
}

function buildNetlifyImportUrl() {
  return "https://app.netlify.com/start";
}

function getDeployProjectIdentity(detectedTemplate, detectedKind) {
  if (detectedTemplate?.id === "nextjs") {
    return {
      label: "Next.js",
      recommendation: "Recommended: Vercel",
      vercelHint: "Recommended for Next.js projects.",
      netlifyHint: "Next.js usually fits best on Vercel.",
    };
  }

  if (detectedTemplate?.id === "vite-react") {
    return {
      label: "Vite + React",
      recommendation: "Good fit: Netlify or Vercel",
      vercelHint: "Good fit for this project.",
      netlifyHint: "Good fit for this project.",
    };
  }

  if (detectedTemplate?.id === "static-html" || detectedKind === "static") {
    return {
      label: "Static HTML",
      recommendation: "Good fit: Netlify or Vercel",
      vercelHint: "Good fit for static sites.",
      netlifyHint: "Good fit for static sites.",
    };
  }

  if (detectedKind === "package") {
    return {
      label: "Package-based app",
      recommendation: "Good fit: Netlify or Vercel",
      vercelHint: "Deploy guidance is based on detected project files.",
      netlifyHint: "Deploy guidance is based on detected project files.",
    };
  }

  return {
    label: "",
    recommendation: "Good fit: Netlify or Vercel",
    vercelHint: "Deploy this GitHub-connected project with Vercel.",
    netlifyHint: "Deploy this GitHub-connected project with Netlify.",
  };
}

function renderHighlightedActionText(text) {
  const value = String(text || "");
  const parts = value.split(/("[^"]+")/g);

  return parts.map((part, index) => {
    const isQuotedAction = /^"[^"]+"$/.test(part);

    if (!isQuotedAction) {
      return <React.Fragment key={index}>{part}</React.Fragment>;
    }

    return (
      <span
        key={index}
        style={{
          color: "#f4b942",
          fontWeight: 600,
        }}
      >
        {part}
      </span>
    );
  });
}
function formatLogTimestamp(value) {
  const date = new Date(value);

  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}
export default function ServicePanel({ projectPath }) {
  const [logsByService, setLogsByService] = useState(
    persistedServicePanelState.logsByService,
  );
  const [activeServiceId, setActiveServiceId] = useState(
    persistedServicePanelState.activeServiceId,
  );
  const [activeTaskId, setActiveTaskId] = useState(
    persistedServicePanelState.activeTaskId,
  );
  const [activeProviderId, setActiveProviderId] = useState(
    persistedServicePanelState.activeProviderId,
  );
  const [serviceStatus, setServiceStatus] = useState(
    persistedServicePanelState.serviceStatus,
  );
  const [busyServiceId, setBusyServiceId] = useState(
    persistedServicePanelState.busyServiceId,
  );
  const [githubRepoName, setGithubRepoName] = useState(
    persistedServicePanelState.githubRepoName,
  );
  const [githubVisibility, setGithubVisibility] = useState(
    persistedServicePanelState.githubVisibility,
  );
  const [githubRepoState, setGithubRepoState] = useState(
    persistedServicePanelState.githubRepoState,
  );
  const [detectedProjectKind, setDetectedProjectKind] = useState("");
  const [detectedProjectTemplate, setDetectedProjectTemplate] = useState(null);
  const [showSupabaseMoreInfo, setShowSupabaseMoreInfo] = useState(false);
  const logEndRef = useRef(null);
  const activeProviderIdRef = useRef(
    persistedServicePanelState.activeProviderId || DEFAULT_PROVIDER_ID,
  );
  const busyServiceIdRef = useRef(persistedServicePanelState.busyServiceId);
  const lastProjectPathRef = useRef(
    projectPath && String(projectPath).trim() ? String(projectPath).trim() : "",
  );

  const providerMap = useMemo(() => buildProviderMap(), []);
  const activeTask =
    TASK_GROUPS.find((task) => task.id === activeTaskId) || TASK_GROUPS[0];
  const activeProvider =
    providerMap.get(activeProviderId) || providerMap.get(DEFAULT_PROVIDER_ID);
  const activeLogs = logsByService[activeProviderId] || [];

  const deployProjectIdentity = useMemo(() => {
    return getDeployProjectIdentity(
      detectedProjectTemplate,
      detectedProjectKind,
    );
  }, [detectedProjectKind, detectedProjectTemplate]);

  useEffect(() => {
    persistedServicePanelState.logsByService = logsByService;
  }, [logsByService]);

  useEffect(() => {
    persistedServicePanelState.activeServiceId = activeServiceId;
  }, [activeServiceId]);

  useEffect(() => {
    persistedServicePanelState.activeTaskId = activeTaskId;
  }, [activeTaskId]);

  useEffect(() => {
    persistedServicePanelState.activeProviderId = activeProviderId;
  }, [activeProviderId]);
  useEffect(() => {
    activeProviderIdRef.current = activeProviderId;
  }, [activeProviderId]);

  useEffect(() => {
    busyServiceIdRef.current = busyServiceId;
  }, [busyServiceId]);
  useEffect(() => {
    persistedServicePanelState.serviceStatus = serviceStatus;
  }, [serviceStatus]);

  useEffect(() => {
    persistedServicePanelState.busyServiceId = busyServiceId;
  }, [busyServiceId]);

  useEffect(() => {
    persistedServicePanelState.githubRepoName = githubRepoName;
  }, [githubRepoName]);

  useEffect(() => {
    persistedServicePanelState.githubVisibility = githubVisibility;
  }, [githubVisibility]);

  useEffect(() => {
    persistedServicePanelState.githubRepoState = githubRepoState;
  }, [githubRepoState]);

  useEffect(() => {
    let unlistenLogs = null;
    let unlistenStatus = null;
    let cancelled = false;

    async function bind() {
      unlistenLogs = await subscribeServiceLogs((payload) => {
        if (cancelled) return;
        setLogsByService((prev) => {
          const targetServiceId =
            busyServiceIdRef.current ||
            activeProviderIdRef.current ||
            DEFAULT_PROVIDER_ID;
          return {
            ...prev,
            [targetServiceId]: [
              ...(prev[targetServiceId] || []),
              {
                kind: payload?.kind || "stdout",
                line: payload?.line || "",
                ts: Date.now() + Math.random(),
              },
            ],
          };
        });
      });

      unlistenStatus = await subscribeServiceStatus((payload) => {
        if (cancelled) return;
        const nextStatus = payload?.status || "idle";
        setServiceStatus(nextStatus);

        if (nextStatus.startsWith("running:")) {
          const runningServiceId = nextStatus.replace("running:", "");
          const nextTask = findTaskByProviderId(runningServiceId);
          setBusyServiceId(runningServiceId);
          setActiveServiceId(runningServiceId);
          setActiveProviderId(runningServiceId);
          setActiveTaskId(nextTask.id);
        } else if (
          nextStatus.startsWith("done:") ||
          nextStatus.startsWith("error:")
        ) {
          setBusyServiceId(null);
        }
      });
    }

    bind();

    return () => {
      cancelled = true;
      if (typeof unlistenLogs === "function") unlistenLogs();
      if (typeof unlistenStatus === "function") unlistenStatus();
    };
  }, []);

  useEffect(() => {
    const normalizedProjectPath =
      projectPath && String(projectPath).trim()
        ? String(projectPath).trim()
        : "";

    const previousProjectPath = lastProjectPathRef.current;

    if (!normalizedProjectPath) {
      resetPersistedServicePanelState();
      setLogsByService({});
      setActiveServiceId(DEFAULT_PROVIDER_ID);
      setActiveTaskId(DEFAULT_TASK_ID);
      setActiveProviderId(DEFAULT_PROVIDER_ID);
      setServiceStatus("idle");
      setBusyServiceId(null);
      setGithubRepoName("");
      setGithubVisibility("public");
      setGithubRepoState(null);
      setDetectedProjectKind("");
      setDetectedProjectTemplate(null);
      setShowSupabaseMoreInfo(false);
      lastProjectPathRef.current = "";
      return;
    }

    if (
      previousProjectPath &&
      normalizedProjectPath &&
      previousProjectPath !== normalizedProjectPath
    ) {
      resetPersistedServicePanelState();
      setLogsByService({});
      setActiveServiceId(DEFAULT_PROVIDER_ID);
      setActiveTaskId(DEFAULT_TASK_ID);
      setActiveProviderId(DEFAULT_PROVIDER_ID);
      setServiceStatus("idle");
      setBusyServiceId(null);
      setGithubRepoName("");
      setGithubVisibility("public");
      setGithubRepoState(null);
      setDetectedProjectKind("");
      setDetectedProjectTemplate(null);
      setShowSupabaseMoreInfo(false);
    }

    lastProjectPathRef.current = normalizedProjectPath;
  }, [projectPath]);

  useEffect(() => {
    let cancelled = false;

    async function loadGithubRepoState() {
      const normalizedProjectPath =
        projectPath && String(projectPath).trim()
          ? String(projectPath).trim()
          : "";

      if (!normalizedProjectPath) {
        setGithubRepoState(null);
        return;
      }

      try {
        const nextState = await detectGithubRepo(normalizedProjectPath);
        if (!cancelled) {
          setGithubRepoState(nextState);
        }
      } catch {
        if (!cancelled) {
          setGithubRepoState(null);
        }
      }
    }

    loadGithubRepoState();

    return () => {
      cancelled = true;
    };
  }, [projectPath, serviceStatus]);

  useEffect(() => {
    let cancelled = false;

    async function loadProjectIdentity() {
      const normalizedProjectPath =
        projectPath && String(projectPath).trim()
          ? String(projectPath).trim()
          : "";

      if (!normalizedProjectPath) {
        setDetectedProjectKind("");
        setDetectedProjectTemplate(null);
        return;
      }

      try {
        const result = await previewDetectTemplates(normalizedProjectPath);

        if (!cancelled) {
          setDetectedProjectKind(String(result?.kind || ""));
          setDetectedProjectTemplate(result?.detectedTemplate || null);
        }
      } catch {
        if (!cancelled) {
          setDetectedProjectKind("");
          setDetectedProjectTemplate(null);
        }
      }
    }

    loadProjectIdentity();

    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ block: "end" });
    }
  }, [activeLogs]);

  function appendLog(kind, line) {
    const targetServiceId =
      busyServiceIdRef.current ||
      activeProviderIdRef.current ||
      DEFAULT_PROVIDER_ID;

    setLogsByService((prev) => ({
      ...prev,
      [targetServiceId]: [
        ...(prev[targetServiceId] || []),
        {
          kind,
          line,
          ts: Date.now() + Math.random(),
        },
      ],
    }));
  }

  function appendLogSection(title) {
    const targetServiceId = activeProviderId || DEFAULT_PROVIDER_ID;

    setLogsByService((prev) => {
      const existingLogs = prev[targetServiceId] || [];

      return {
        ...prev,
        [targetServiceId]: [
          ...existingLogs,
          ...(existingLogs.length > 0
            ? [
                {
                  kind: "separator",
                  line: "────────────────────────────────────────",
                  ts: Date.now() + Math.random(),
                },
              ]
            : []),
          {
            kind: "section",
            line: title,
            ts: Date.now() + Math.random(),
          },
        ],
      };
    });
  }

  function selectTask(taskId) {
    const nextProviderId = getFirstProviderIdForTask(taskId);
    setActiveTaskId(taskId);
    setActiveProviderId(nextProviderId);
    setActiveServiceId(nextProviderId);
  }

  function selectProvider(providerId) {
    const nextTask = findTaskByProviderId(providerId);
    setActiveTaskId(nextTask.id);
    setActiveProviderId(providerId);
    setActiveServiceId(providerId);
  }

  async function handleSetup(service) {
    if (!projectPath || !String(projectPath).trim()) {
      appendLog("error", "Open a project folder before using Services.");
      return;
    }

    let options = {};

    if (service.id === "github") {
      const repoName = sanitizeRepoName(githubRepoName);

      if (!repoName) {
        appendLog("error", "GitHub repository name is required.");
        return;
      }

      options = {
        repoName,
        visibility: githubVisibility === "private" ? "private" : "public",
      };
    }

    const sectionTitle =
      service.id === "github"
        ? "GitHub — Publish"
        : service.id === "supabase"
          ? "Supabase — Check setup"
          : `${service.name} — Run`;

    appendLogSection(sectionTitle);

    setActiveServiceId(service.id);
    setActiveProviderId(service.id);
    setActiveTaskId(findTaskByProviderId(service.id).id);
    setBusyServiceId(service.id);
    appendLog(
      "status",
      service.id === "github"
        ? `Queued ${service.name} publish...`
        : `Queued ${service.name} setup...`,
    );

    try {
      await runServiceSetup(service.id, projectPath, options);
    } catch (error) {
      setBusyServiceId(null);
      appendLog("error", error?.message || String(error));
    }
  }

  async function handleGithubPush() {
    if (!projectPath || !String(projectPath).trim()) {
      appendLog("error", "Open a project folder before using GitHub actions.");
      return;
    }

    appendLogSection("GitHub — Push changes");

    try {
      await githubPush(projectPath);
    } catch (error) {
      appendLog("error", error?.message || String(error));
    }
  }

  async function handleGithubPull() {
    if (!projectPath || !String(projectPath).trim()) {
      appendLog("error", "Open a project folder before using GitHub actions.");
      return;
    }

    appendLogSection("GitHub — Pull latest");

    try {
      await githubPull(projectPath);
    } catch (error) {
      appendLog("error", error?.message || String(error));
    }
  }

  async function handleGithubOpenRepo() {
    if (!projectPath || !String(projectPath).trim()) {
      appendLog("error", "Open a project folder before using GitHub actions.");
      return;
    }

    appendLogSection("GitHub — Open repository");

    try {
      await githubOpenRepo(projectPath);
      appendLog("status", "Opened GitHub repository in browser.");
    } catch (error) {
      appendLog("error", error?.message || String(error));
    }
  }

  async function handleDeployOpen(providerId) {
    if (!projectPath || !String(projectPath).trim()) {
      appendLog("error", "Open a project folder before using deploy actions.");
      return;
    }

    const repoSlug = extractGithubRepoSlug(githubRepoState?.remoteUrl);
    const providerName = providerId === "vercel" ? "Vercel" : "Netlify";

    if (!repoSlug) {
      appendLog("error", "Connect this project to GitHub before deploying.");
      return;
    }

    appendLogSection(
      providerId === "vercel"
        ? "Deploy — Open Vercel"
        : "Deploy — Open Netlify",
    );

    const url =
      providerId === "vercel"
        ? buildVercelImportUrl(repoSlug)
        : buildNetlifyImportUrl();

    try {
      await openExternalUrl(url);

      appendLog(
        "status",
        providerId === "vercel"
          ? `Opened Vercel import for ${repoSlug}.`
          : `Opened Netlify import. Choose GitHub and select ${repoSlug}.`,
      );
    } catch (error) {
      appendLog(
        "error",
        error?.message || `Could not open ${providerName} in browser.`,
      );
    }
  }

  async function handleOpenSupabase() {
    appendLogSection("Supabase — Open dashboard");

    try {
      await openExternalUrl("https://supabase.com/dashboard");
      appendLog("status", "Opened Supabase in browser.");
    } catch (error) {
      appendLog(
        "error",
        error?.message || "Could not open Supabase in browser.",
      );
    }
  }
  async function handleSupabaseQuickConnect() {
    if (!projectPath || !String(projectPath).trim()) {
      appendLog(
        "error",
        "Open a project folder before running Supabase Quick Connect.",
      );
      return;
    }

    appendLogSection("Supabase — Quick Connect");

    try {
      await supabaseQuickConnect(projectPath);
    } catch (error) {
      appendLog(
        "error",
        error?.message ||
          "Could not complete Supabase Quick Connect. Check the log output above for more detail.",
      );
    }
  }
  async function handleCreateSupabaseEnvFile() {
    if (!projectPath || !String(projectPath).trim()) {
      appendLog("error", "Open a project folder before creating a .env file.");
      return;
    }

    appendLogSection("Supabase — Create .env file");

    try {
      await supabaseCreateEnvFile(projectPath);
    } catch (error) {
      appendLog("error", error?.message || "Could not create .env file.");
    }
  }

  async function handleInstallSupabaseClient() {
    if (!projectPath || !String(projectPath).trim()) {
      appendLog(
        "error",
        "Open a project folder before installing the Supabase client.",
      );
      return;
    }

    appendLogSection("Supabase — Install Supabase client");

    try {
      await supabaseInstallClient(projectPath);
    } catch (error) {
      appendLog(
        "error",
        error?.message ||
          "Could not install the Supabase client. Check the log output above for more detail.",
      );
    }
  }

  async function handleCreateSupabaseClientFile() {
    if (!projectPath || !String(projectPath).trim()) {
      appendLog(
        "error",
        "Open a project folder before creating a Supabase client file.",
      );
      return;
    }

    appendLogSection("Supabase — Create Supabase client file");

    try {
      await supabaseCreateClientFile(projectPath);
    } catch (error) {
      appendLog(
        "error",
        error?.message || "Could not create the Supabase client file.",
      );
    }
  }

  const isGithub = activeProvider?.id === "github";
  const isSupabase = activeProvider?.id === "supabase";
  const isDeploy = isDeployProvider(activeProvider?.id);
  const isBusy = busyServiceId === activeProvider?.id;
  const isPlanned = activeProvider?.status === "planned";
  const canOpenGithubRepo =
    isGithub &&
    githubRepoState?.isRepo &&
    githubRepoState?.hasRemote &&
    !!githubRepoState?.remoteUrl;

  const githubRepoSlug = extractGithubRepoSlug(githubRepoState?.remoteUrl);
  const canDeployFromGithub =
    isDeploy &&
    githubRepoState?.isRepo &&
    githubRepoState?.hasRemote &&
    !!githubRepoSlug;

  const activeDeployHint =
    activeProvider?.id === "vercel"
      ? deployProjectIdentity.vercelHint
      : deployProjectIdentity.netlifyHint;

  return (
    <div
      className="command-runner-panel"
      style={{
        padding: "16px 14px 14px",
      }}
    >
      <div
        className="command-runner-panel__header"
        style={{
          marginBottom: "14px",
          paddingBottom: "10px",
          borderBottom: "1px solid #27272a",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            color: "#a1a1aa",
            lineHeight: 1.4,
          }}
        >
          Services — connect your project to external tools.
        </div>
      </div>

      <div
        className="command-runner-panel__meta"
        style={{
          display: "grid",
          gap: "6px",
          marginBottom: "14px",
          padding: "10px 12px",
          border: "1px solid #27272a",
          borderRadius: "10px",
          background: "rgba(24, 24, 27, 0.5)",
          color: "#a1a1aa",
          fontSize: "13px",
        }}
      >
        <div>
          Project:{" "}
          {projectPath && String(projectPath).trim()
            ? projectPath
            : "No folder open"}
        </div>
        <div>State: {serviceStatus}</div>
      </div>

      <div
        className="service-task-tabs"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        {TASK_GROUPS.map((task) => {
          const isActiveTask = task.id === activeTaskId;

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => selectTask(task.id)}
              style={{
                padding: "7px 11px",
                borderRadius: "999px",
                border: isActiveTask
                  ? "1px solid rgba(244, 185, 66, 0.45)"
                  : "1px solid #27272a",
                background: isActiveTask
                  ? "rgba(244, 185, 66, 0.12)"
                  : "rgba(24, 24, 27, 0.4)",
                color: isActiveTask ? "#fde68a" : "#e4e4e7",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {task.label}
            </button>
          );
        })}
      </div>

      <div
        className="service-provider-tabs"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        {activeTask.providerIds.map((providerId) => {
          const provider = providerMap.get(providerId);
          if (!provider) return null;
          const isActiveProvider = provider.id === activeProviderId;

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => selectProvider(provider.id)}
              style={{
                padding: "5px 10px",
                borderRadius: "999px",
                border: isActiveProvider
                  ? "1px solid rgba(244, 185, 66, 0.4)"
                  : "1px solid #3f3f46",
                background: isActiveProvider
                  ? "rgba(244, 185, 66, 0.10)"
                  : "rgba(24, 24, 27, 0.35)",
                color: isActiveProvider ? "#fde68a" : "#d4d4d8",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {provider.name}
            </button>
          );
        })}
      </div>

      <div
        className="service-active-panel"
        style={{
          border: "1px solid #27272a",
          borderRadius: "10px",
          background: "rgba(9, 9, 11, 0.45)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "12px",
            padding: "12px",
          }}
        >
          {isSupabase ? (
            <div
              className="command-runner-item__meta"
              style={{
                display: "grid",
                gap: "8px",
                padding: "10px 12px",
                border: "1px solid #27272a",
                borderRadius: "8px",
                background: "rgba(24, 24, 27, 0.35)",
                fontSize: "13px",
                color: "#d4d4d8",
              }}
            >
              <div>Connect this project to a Supabase database.</div>

              <div style={{ color: "#a1a1aa" }}>
                Start by clicking{" "}
                <span style={{ color: "#f4b942", fontWeight: 600 }}>
                  "Quick Connect Supabase"
                </span>{" "}
                for the beginner-friendly path, or use{" "}
                <span style={{ color: "#f4b942", fontWeight: 600 }}>
                  "Check Supabase setup"
                </span>{" "}
                if you want to go step by step.
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowSupabaseMoreInfo((prev) => !prev)}
                  style={{
                    border: "1px solid #3f3f46",
                    background: "rgba(24, 24, 27, 0.35)",
                    color: "#d4d4d8",
                    borderRadius: "999px",
                    padding: "5px 10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    width: "fit-content",
                  }}
                >
                  {showSupabaseMoreInfo ? "Hide details" : "More info"}
                </button>
              </div>

              {showSupabaseMoreInfo ? (
                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                    paddingTop: "4px",
                  }}
                >
                  <div>
                    <span style={{ color: "#a1a1aa" }}>Connection values:</span>{" "}
                    {formatEnvVars(activeProvider?.envVars)}
                  </div>
                  <div style={{ color: "#a1a1aa" }}>
                    SUPABASE_URL is your Supabase project address.
                  </div>
                  <div style={{ color: "#a1a1aa" }}>
                    SUPABASE_ANON_KEY is the public key your frontend uses to
                    talk to Supabase.
                  </div>
                  <div style={{ color: "#a1a1aa" }}>
                    If this project uses Vite, frontend code will usually read
                    VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
                  </div>
                  <div style={{ color: "#a1a1aa" }}>
                    After your env file is ready, the next common steps are:
                    install the Supabase client and create a Supabase client
                    file such as src/lib/supabase.js.
                  </div>
                  <div style={{ color: "#a1a1aa" }}>
                    If you run Supabase locally, KForge will also check for a
                    local Supabase configuration.
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className="command-runner-item__meta"
              style={{
                fontSize: "13px",
                color: "#d4d4d8",
              }}
            >
              <span style={{ color: "#a1a1aa" }}>Env:</span>{" "}
              {formatEnvVars(activeProvider?.envVars)}
            </div>
          )}

          {isGithub && githubRepoState ? (
            <div
              className="command-runner-item__meta"
              style={{
                display: "grid",
                gap: "6px",
                padding: "10px 12px",
                border: "1px solid #27272a",
                borderRadius: "8px",
                background: "rgba(24, 24, 27, 0.35)",
                fontSize: "13px",
                color: "#d4d4d8",
              }}
            >
              <div>
                <span style={{ color: "#a1a1aa" }}>Git repo:</span>{" "}
                {githubRepoState.isRepo ? "Detected" : "Not detected"}
              </div>
              <div>
                <span style={{ color: "#a1a1aa" }}>Has commit:</span>{" "}
                {githubRepoState.hasCommit ? "Yes" : "No"}
              </div>
              <div>
                <span style={{ color: "#a1a1aa" }}>Has remote:</span>{" "}
                {githubRepoState.hasRemote ? "Yes" : "No"}
              </div>
              <div>
                <span style={{ color: "#a1a1aa" }}>Branch:</span>{" "}
                {githubRepoState.branch || "—"}
              </div>
            </div>
          ) : null}

          {isDeploy ? (
            <div
              className="command-runner-item__meta"
              style={{
                display: "grid",
                gap: "6px",
                padding: "10px 12px",
                border: "1px solid #27272a",
                borderRadius: "8px",
                background: "rgba(24, 24, 27, 0.35)",
                fontSize: "13px",
                color: "#d4d4d8",
              }}
            >
              {deployProjectIdentity.label ? (
                <div>
                  <span style={{ color: "#a1a1aa" }}>Project type:</span>{" "}
                  {deployProjectIdentity.label}
                </div>
              ) : null}
              <div>
                <span style={{ color: "#a1a1aa" }}>Recommendation:</span>{" "}
                {deployProjectIdentity.recommendation}
              </div>
              <div>
                <span style={{ color: "#a1a1aa" }}>GitHub repo:</span>{" "}
                {githubRepoSlug ? githubRepoSlug : "GitHub connection required"}
              </div>
              <div style={{ color: "#a1a1aa" }}>{activeDeployHint}</div>
              {githubRepoState?.isRepo &&
              githubRepoState?.hasRemote &&
              !githubRepoState?.hasCommit ? (
                <div style={{ color: "#fbbf24" }}>
                  Push changes before deploying.
                </div>
              ) : null}
            </div>
          ) : null}

          {isGithub ? (
            <div
              className="command-runner-item__meta"
              style={{
                display: "grid",
                gap: "10px",
                padding: "10px 12px",
                border: "1px solid #27272a",
                borderRadius: "8px",
                background: "rgba(24, 24, 27, 0.35)",
              }}
            >
              <label
                style={{
                  display: "grid",
                  gap: "4px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#a1a1aa" }}>
                  Repository name
                </span>
                <input
                  type="text"
                  value={githubRepoName}
                  onChange={(event) => setGithubRepoName(event.target.value)}
                  placeholder="my-kforge-project"
                  disabled={isBusy}
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                    WebkitTextFillColor: "#000000",
                    caretColor: "#000000",
                    paddingLeft: "12px",
                    paddingRight: "10px",
                  }}
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: "4px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#a1a1aa" }}>
                  Visibility
                </span>
                <select
                  value={githubVisibility}
                  onChange={(event) => setGithubVisibility(event.target.value)}
                  disabled={isBusy}
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                    WebkitTextFillColor: "#000000",
                    paddingLeft: "12px",
                    paddingRight: "10px",
                  }}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>
            </div>
          ) : null}

          <div
            className="command-runner-item__actions"
            style={{
              display: "grid",
              gap: "8px",
            }}
          >
            {isGithub ? (
              <button
                type="button"
                className="command-runner-runButton"
                onClick={() => handleSetup(activeProvider)}
                disabled={isBusy || isPlanned}
                title="Publish this project to GitHub"
              >
                {isBusy ? "Working..." : "Publish"}
              </button>
            ) : null}

            {isSupabase ? (
              <button
                type="button"
                className="command-runner-runButton"
                onClick={handleSupabaseQuickConnect}
                disabled={isBusy || isPlanned}
                title="Run the full Supabase setup flow automatically"
              >
                {isBusy ? "Working..." : "Quick Connect Supabase"}
              </button>
            ) : null}
            {isSupabase ? (
              <button
                type="button"
                className="command-runner-runButton"
                onClick={() => handleSetup(activeProvider)}
                disabled={isBusy || isPlanned}
                title="Check this project and prepare the Supabase connection setup"
              >
                {isBusy ? "Working..." : "Check Supabase setup"}
              </button>
            ) : null}
            {isSupabase ? (
              <button
                type="button"
                className="command-runner-runButton"
                onClick={handleCreateSupabaseEnvFile}
                disabled={isBusy}
                title="Create a .env file from .env.example"
              >
                Create .env file
              </button>
            ) : null}
            {isSupabase ? (
              <button
                type="button"
                className="command-runner-runButton"
                onClick={handleInstallSupabaseClient}
                disabled={isBusy}
                title="Install @supabase/supabase-js with pnpm"
              >
                Install Supabase client
              </button>
            ) : null}
            {isSupabase ? (
              <button
                type="button"
                className="command-runner-runButton"
                onClick={handleCreateSupabaseClientFile}
                disabled={isBusy}
                title="Create src/lib/supabase.js"
              >
                Create Supabase client file
              </button>
            ) : null}
            {isSupabase ? (
              <button
                type="button"
                className="command-runner-runButton"
                onClick={handleOpenSupabase}
                disabled={isBusy}
                title="Open your Supabase dashboard"
              >
                Open Supabase
              </button>
            ) : null}
            {canDeployFromGithub ? (
              <button
                type="button"
                className="command-runner-runButton"
                onClick={() => handleDeployOpen(activeProvider.id)}
                disabled={isBusy}
                title={
                  activeProvider?.id === "vercel"
                    ? "Open Vercel import for this GitHub repository"
                    : "Open Netlify import flow for this GitHub repository"
                }
              >
                {activeProvider?.id === "vercel"
                  ? "Deploy with Vercel"
                  : "Deploy with Netlify"}
              </button>
            ) : null}
            {isDeploy && !canDeployFromGithub ? (
              <button
                type="button"
                className="command-runner-runButton"
                disabled
                title="Publish or connect this project to GitHub first"
              >
                Connect GitHub first
              </button>
            ) : null}
            {canOpenGithubRepo ? (
              <button
                type="button"
                className="command-runner-runButton"
                onClick={handleGithubPush}
                disabled={isBusy}
                title="Commit and push local changes to origin"
              >
                Push changes
              </button>
            ) : null}
            {canOpenGithubRepo ? (
              <button
                type="button"
                className="command-runner-runButton"
                onClick={handleGithubPull}
                disabled={isBusy}
                title="Pull latest changes from origin"
              >
                Pull latest
              </button>
            ) : null}
            {canOpenGithubRepo ? (
              <button
                type="button"
                className="command-runner-runButton"
                onClick={handleGithubOpenRepo}
                disabled={isBusy}
                title="Open this repository on GitHub"
              >
                Open on GitHub
              </button>
            ) : null}
          </div>

          <div
            className="command-runner-logs"
            style={{
              border: "1px solid #27272a",
              borderRadius: "10px",
              background: "rgba(9, 9, 11, 0.35)",
              overflow: "hidden",
            }}
          >
            <div
              className="command-runner-logs__title"
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid #27272a",
                fontSize: "12px",
                color: "#a1a1aa",
                background: "rgba(24, 24, 27, 0.5)",
              }}
            >
              Activity log — {getLogLabel(activeProvider?.id)}
            </div>

            <div
              className="command-runner-logs__body"
              style={{
                padding: "10px 12px",
                maxHeight: "220px",
                overflow: "auto",
                fontSize: "13px",
                color: "#d4d4d8",
              }}
            >
              {" "}
              {activeLogs.length === 0 ? (
                <div className="command-runner-logs__empty">
                  No service activity yet.
                </div>
              ) : (
                activeLogs.map((entry) => {
                  const isSection = entry.kind === "section";
                  const isSeparator = entry.kind === "separator";

                  return (
                    <div
                      key={`${entry.ts}-${entry.line}`}
                      className={`command-runner-log command-runner-log--${entry.kind}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: isSeparator ? "1fr" : "72px 1fr",
                        gap: "10px",
                        alignItems: "start",
                        marginBottom: isSeparator ? "8px" : "6px",
                        color: isSection
                          ? "#fde68a"
                          : isSeparator
                            ? "#52525b"
                            : entry.kind === "error"
                              ? "#fca5a5"
                              : entry.kind === "status"
                                ? "#93c5fd"
                                : "#d4d4d8",
                        fontWeight: isSection ? 700 : 400,
                        letterSpacing: isSeparator ? "0.02em" : "normal",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {isSeparator ? null : (
                        <div
                          style={{
                            color: "#71717a",
                            fontSize: "11px",
                            fontVariantNumeric: "tabular-nums",
                            paddingTop: isSection ? "1px" : "0",
                          }}
                        >
                          {formatLogTimestamp(entry.ts)}
                        </div>
                      )}

                      <div>{renderHighlightedActionText(entry.line)}</div>
                    </div>
                  );
                })
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
