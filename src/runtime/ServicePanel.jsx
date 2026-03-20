import React, { useEffect, useMemo, useRef, useState } from "react";
import { SERVICE_REGISTRY } from "./serviceRegistry";
import {
  runServiceSetup,
  subscribeServiceLogs,
  subscribeServiceStatus,
} from "./serviceRunner";

function formatEnvVars(envVars) {
  if (!Array.isArray(envVars) || envVars.length === 0) {
    return "No environment variables declared yet.";
  }
  return envVars.join(", ");
}

export default function ServicePanel({ projectPath }) {
  const [logs, setLogs] = useState([]);
  const [activeServiceId, setActiveServiceId] = useState(null);
  const [serviceStatus, setServiceStatus] = useState("idle");
  const [busyServiceId, setBusyServiceId] = useState(null);
  const logEndRef = useRef(null);

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
        } else if (nextStatus.startsWith("done:")) {
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

    setActiveServiceId(service.id);
    setBusyServiceId(service.id);
    setLogs((prev) => [
      ...prev,
      {
        kind: "status",
        line: `Queued ${service.name} setup...`,
        ts: Date.now(),
      },
    ]);

    try {
      await runServiceSetup(service.id, projectPath);
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
                      : `Set up ${service.name}`
                  }
                >
                  {isPlanned ? "Planned" : isBusy ? "Working..." : "Connect"}
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
