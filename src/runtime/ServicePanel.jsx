import React, { useEffect, useMemo, useRef, useState } from "react";
import { SERVICE_REGISTRY } from "./serviceRegistry";
import {
  detectGithubRepo,
  githubOpenRepo,
  githubPull,
  githubPush,
  runServiceSetup,
  subscribeServiceLogs,
  subscribeServiceStatus,
} from "./serviceRunner";

const SERVICE_ACCENT = "#f4b942";

const persistedServicePanelState = {
  logs: [],
  activeServiceId: null,
  serviceStatus: "idle",
  busyServiceId: null,
  githubRepoName: "",
  githubVisibility: "public",
  githubRepoState: null,
};

function resetPersistedServicePanelState() {
  persistedServicePanelState.logs = [];
  persistedServicePanelState.activeServiceId = null;
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

function getServiceStatusTone(status) {
  if (status === "available") {
    return {
      background: "rgba(245, 158, 11, 0.10)",
      border: "1px solid rgba(245, 158, 11, 0.28)",
      color: "#fcd34d",
    };
  }

  if (status === "planned") {
    return {
      background: "rgba(113, 113, 122, 0.14)",
      border: "1px solid rgba(113, 113, 122, 0.24)",
      color: "#d4d4d8",
    };
  }

  return {
    background: "rgba(63, 63, 70, 0.16)",
    border: "1px solid rgba(82, 82, 91, 0.24)",
    color: "#e4e4e7",
  };
}

export default function ServicePanel({ projectPath }) {
  const [logs, setLogs] = useState(persistedServicePanelState.logs);
  const [activeServiceId, setActiveServiceId] = useState(
    persistedServicePanelState.activeServiceId,
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
  const logEndRef = useRef(null);
  const lastProjectPathRef = useRef(
    projectPath && String(projectPath).trim() ? String(projectPath).trim() : "",
  );

  useEffect(() => {
    persistedServicePanelState.logs = logs;
  }, [logs]);

  useEffect(() => {
    persistedServicePanelState.activeServiceId = activeServiceId;
  }, [activeServiceId]);

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
        setLogs((prev) => [
          ...prev,
          {
            kind: payload?.kind || "stdout",
            line: payload?.line || "",
            ts: Date.now(),
          },
        ]);
      });

      unlistenStatus = await subscribeServiceStatus((payload) => {
        if (cancelled) return;
        const nextStatus = payload?.status || "idle";
        setServiceStatus(nextStatus);

        if (nextStatus.startsWith("running:")) {
          setBusyServiceId(nextStatus.replace("running:", ""));
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
      setLogs([]);
      setActiveServiceId(null);
      setServiceStatus("idle");
      setBusyServiceId(null);
      setGithubRepoName("");
      setGithubVisibility("public");
      setGithubRepoState(null);
      lastProjectPathRef.current = "";
      return;
    }

    if (
      previousProjectPath &&
      normalizedProjectPath &&
      previousProjectPath !== normalizedProjectPath
    ) {
      resetPersistedServicePanelState();
      setLogs([]);
      setActiveServiceId(null);
      setServiceStatus("idle");
      setBusyServiceId(null);
      setGithubRepoName("");
      setGithubVisibility("public");
      setGithubRepoState(null);
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
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ block: "end" });
    }
  }, [logs]);

  const services = useMemo(() => SERVICE_REGISTRY, []);

  async function handleSetup(service) {
    if (!projectPath || !String(projectPath).trim()) {
      setLogs((prev) => [
        ...prev,
        {
          kind: "error",
          line: "Open a project folder before using Services.",
          ts: Date.now(),
        },
      ]);
      return;
    }

    let options = {};

    if (service.id === "github") {
      const repoName = sanitizeRepoName(githubRepoName);

      if (!repoName) {
        setLogs((prev) => [
          ...prev,
          {
            kind: "error",
            line: "GitHub repository name is required.",
            ts: Date.now(),
          },
        ]);
        return;
      }

      options = {
        repoName,
        visibility: githubVisibility === "private" ? "private" : "public",
      };
    }

    setActiveServiceId(service.id);
    setBusyServiceId(service.id);
    setLogs((prev) => [
      ...prev,
      {
        kind: "status",
        line:
          service.id === "github"
            ? `Queued ${service.name} publish...`
            : `Queued ${service.name} setup...`,
        ts: Date.now(),
      },
    ]);

    try {
      await runServiceSetup(service.id, projectPath, options);
    } catch (error) {
      setBusyServiceId(null);
      setLogs((prev) => [
        ...prev,
        {
          kind: "error",
          line: error?.message || String(error),
          ts: Date.now(),
        },
      ]);
    }
  }

  async function handleGithubPush() {
    if (!projectPath || !String(projectPath).trim()) {
      setLogs((prev) => [
        ...prev,
        {
          kind: "error",
          line: "Open a project folder before using GitHub actions.",
          ts: Date.now(),
        },
      ]);
      return;
    }

    try {
      await githubPush(projectPath);
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        {
          kind: "error",
          line: error?.message || String(error),
          ts: Date.now(),
        },
      ]);
    }
  }

  async function handleGithubPull() {
    if (!projectPath || !String(projectPath).trim()) {
      setLogs((prev) => [
        ...prev,
        {
          kind: "error",
          line: "Open a project folder before using GitHub actions.",
          ts: Date.now(),
        },
      ]);
      return;
    }

    try {
      await githubPull(projectPath);
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        {
          kind: "error",
          line: error?.message || String(error),
          ts: Date.now(),
        },
      ]);
    }
  }

  async function handleGithubOpenRepo() {
    if (!projectPath || !String(projectPath).trim()) {
      setLogs((prev) => [
        ...prev,
        {
          kind: "error",
          line: "Open a project folder before using GitHub actions.",
          ts: Date.now(),
        },
      ]);
      return;
    }

    try {
      await githubOpenRepo(projectPath);
      setLogs((prev) => [
        ...prev,
        {
          kind: "status",
          line: "Opened GitHub repository in browser.",
          ts: Date.now(),
        },
      ]);
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        {
          kind: "error",
          line: error?.message || String(error),
          ts: Date.now(),
        },
      ]);
    }
  }

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
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: "8px",
          }}
        >
          <div
            className="command-runner-panel__title"
            style={{
              fontSize: "16px",
              fontWeight: 700,
              lineHeight: 1.2,
              color: "#fafafa",
            }}
          >
            Services
          </div>

          <div
            className="command-runner-panel__subtitle"
            style={{
              fontSize: "13px",
              color: "#a1a1aa",
            }}
          >
            — Connect your project to external tools.
          </div>
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
        }}
      >
        <div>
          <strong>Project:</strong>{" "}
          {projectPath && String(projectPath).trim()
            ? projectPath
            : "No folder open"}
        </div>
        <div>
          <strong>State:</strong> {serviceStatus}
        </div>
      </div>

      <div
        className="command-runner-logs"
        style={{
          marginBottom: "16px",
          border: "1px solid #27272a",
          borderRadius: "10px",
          background: "rgba(9, 9, 11, 0.45)",
          overflow: "hidden",
        }}
      >
        <div
          className="command-runner-logs__title"
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid #27272a",
            fontSize: "14px",
            fontWeight: 700,
            color: "#f4f4f5",
            background: "rgba(24, 24, 27, 0.5)",
          }}
        >
          Activity log
          {activeServiceId ? ` — ${activeServiceId}` : ""}
        </div>

        <div
          className="command-runner-logs__body"
          style={{
            padding: "10px 12px",
            maxHeight: "180px",
            overflow: "auto",
          }}
        >
          {logs.length === 0 ? (
            <div className="command-runner-logs__empty">
              No service activity yet.
            </div>
          ) : (
            logs.map((entry) => (
              <div
                key={`${entry.ts}-${entry.line}`}
                className={`command-runner-log command-runner-log--${entry.kind}`}
              >
                {entry.line}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      <div
        className="command-runner-list"
        style={{
          display: "grid",
          gap: "14px",
        }}
      >
        {services.map((service) => {
          const isBusy = busyServiceId === service.id;
          const isPlanned = service.status === "planned";
          const isGithub = service.id === "github";
          const canOpenGithubRepo =
            isGithub &&
            githubRepoState?.isRepo &&
            githubRepoState?.hasRemote &&
            !!githubRepoState?.remoteUrl;
          const tone = getServiceStatusTone(service.status);

          return (
            <div
              key={service.id}
              className="command-runner-item"
              style={{
                border: "1px solid #27272a",
                borderRadius: "10px",
                background: "rgba(9, 9, 11, 0.45)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "10px 12px",
                  borderBottom: "1px solid #27272a",
                  background: "rgba(24, 24, 27, 0.45)",
                }}
              >
                <div
                  className="command-runner-item__title"
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: SERVICE_ACCENT,
                  }}
                >
                  {service.name}
                </div>

                <div
                  className="command-runner-item__badge"
                  style={{
                    padding: "3px 9px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "capitalize",
                    ...tone,
                  }}
                >
                  {service.status}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  padding: "12px",
                }}
              >
                <div className="command-runner-item__description">
                  {service.description}
                </div>

                <div className="command-runner-item__meta">
                  <strong>Env:</strong> {formatEnvVars(service.envVars)}
                </div>

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
                    }}
                  >
                    <div>
                      <strong>Git repo:</strong>{" "}
                      {githubRepoState.isRepo ? "Detected" : "Not detected"}
                    </div>
                    <div>
                      <strong>Has commit:</strong>{" "}
                      {githubRepoState.hasCommit ? "Yes" : "No"}
                    </div>
                    <div>
                      <strong>Has remote:</strong>{" "}
                      {githubRepoState.hasRemote ? "Yes" : "No"}
                    </div>
                    <div>
                      <strong>Branch:</strong> {githubRepoState.branch || "—"}
                    </div>
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
                      <span>
                        <strong>Repository name</strong>
                      </span>
                      <input
                        type="text"
                        value={githubRepoName}
                        onChange={(event) =>
                          setGithubRepoName(event.target.value)
                        }
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
                      <span>
                        <strong>Visibility</strong>
                      </span>
                      <select
                        value={githubVisibility}
                        onChange={(event) =>
                          setGithubVisibility(event.target.value)
                        }
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
                  <button
                    type="button"
                    className="command-runner-runButton"
                    onClick={() => handleSetup(service)}
                    disabled={isBusy || isPlanned}
                    title={
                      isPlanned
                        ? "Planned for a future phase"
                        : isGithub
                          ? "Publish this project to GitHub"
                          : `Set up ${service.name}`
                    }
                  >
                    {isPlanned
                      ? "Planned"
                      : isBusy
                        ? "Working..."
                        : isGithub
                          ? "Publish"
                          : "Connect"}
                  </button>

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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
