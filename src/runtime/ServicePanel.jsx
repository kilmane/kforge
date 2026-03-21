import React, { useEffect, useMemo, useRef, useState } from "react";
import { SERVICE_REGISTRY } from "./serviceRegistry";
import {
  runServiceSetup,
  subscribeServiceLogs,
  subscribeServiceStatus,
} from "./serviceRunner";

const persistedServicePanelState = {
  logs: [],
  activeServiceId: null,
  serviceStatus: "idle",
  busyServiceId: null,
  githubRepoName: "",
  githubVisibility: "public",
};
function resetPersistedServicePanelState() {
  persistedServicePanelState.logs = [];
  persistedServicePanelState.activeServiceId = null;
  persistedServicePanelState.serviceStatus = "idle";
  persistedServicePanelState.busyServiceId = null;
  persistedServicePanelState.githubRepoName = "";
  persistedServicePanelState.githubVisibility = "public";
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
    }

    lastProjectPathRef.current = normalizedProjectPath;
  }, [projectPath]);
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

  return (
    <div className="command-runner-panel">
      <div className="command-runner-panel__header">
        <div>
          <div className="command-runner-panel__title">Services</div>
          <div className="command-runner-panel__subtitle">
            Foundation for guided external integrations.
          </div>
        </div>
      </div>

      <div className="command-runner-panel__meta">
        <div>
          <strong>Project root:</strong>{" "}
          {projectPath && String(projectPath).trim()
            ? projectPath
            : "No folder open"}
        </div>
        <div>
          <strong>Status:</strong> {serviceStatus}
        </div>
      </div>

      <div className="command-runner-list">
        {services.map((service) => {
          const isBusy = busyServiceId === service.id;
          const isPlanned = service.status === "planned";
          const isGithub = service.id === "github";

          return (
            <div key={service.id} className="command-runner-item">
              <div className="command-runner-item__body">
                <div className="command-runner-item__titleRow">
                  <div className="command-runner-item__title">
                    {service.name}
                  </div>
                  <div className="command-runner-item__badge">
                    {service.status}
                  </div>
                </div>

                <div className="command-runner-item__description">
                  {service.description}
                </div>

                <div className="command-runner-item__meta">
                  <strong>Env:</strong> {formatEnvVars(service.envVars)}
                </div>

                {isGithub ? (
                  <div
                    className="command-runner-item__meta"
                    style={{
                      display: "grid",
                      gap: "8px",
                      marginTop: "10px",
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
              </div>

              <div className="command-runner-item__actions">
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
              </div>
            </div>
          );
        })}
      </div>

      <div className="command-runner-logs">
        <div className="command-runner-logs__title">
          Service log
          {activeServiceId ? ` — ${activeServiceId}` : ""}
        </div>

        <div className="command-runner-logs__body">
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
    </div>
  );
}
