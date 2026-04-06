import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  appendPreviewLog,
  clearPreviewLogBuffer,
  getPreviewLogBuffer,
  getPreviewStatusValue,
  onPreviewLog,
  onPreviewStatus,
  previewDetectTemplates,
  previewGetStatus,
  previewInstall,
  previewStart,
  previewStop,
  setPreviewStatusValue,
} from "./previewRunner";
import {
  getTemplateById,
  listScaffoldTemplates,
  templateInstallsDuringScaffold,
} from "./templateRegistry";

const URL_RE = /(https?:\/\/(?:localhost|127\.0\.0\.1):\d+(?:\/\S*)?)/i;
const CLI_HINT_RE = [/press h to show help/i, /use --host to expose/i];

function getStatusLabel(status) {
  const value = String(status || "idle");

  if (value === "idle") return "Ready";
  if (value === "installing") return "Installing dependencies...";
  if (value === "running") return "Preview running";
  if (value === "scaffold:starting") return "Generating template...";
  if (value.startsWith("scaffold:done:")) return "Template generated";

  return value;
}

function findPreviewUrl(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "";
  }

  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const text = String(entries[i]?.line ?? "");
    const match = text.match(URL_RE);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

export default function PreviewPanel({ projectPath }) {
  const [status, setStatus] = useState(getPreviewStatusValue());
  const [logs, setLogs] = useState(() => getPreviewLogBuffer());

  const [previewUrl, setPreviewUrl] = useState("");
  const endRef = useRef(null);

  const lastLogKeyRef = useRef("");

  const [activeScaffold, setActiveScaffold] = useState("");
  const [generateMenuOpen, setGenerateMenuOpen] = useState(false);
  const [lastGeneratedTemplateId, setLastGeneratedTemplateId] = useState("");
  const [scaffoldErr, setScaffoldErr] = useState("");
  const [hasPackageJson, setHasPackageJson] = useState(false);
  const [hasIndexHtml, setHasIndexHtml] = useState(false);
  const [detectedKind, setDetectedKind] = useState("");
  const [compatibleTemplates, setCompatibleTemplates] = useState([]);
  const [detectedTemplate, setDetectedTemplate] = useState(null);
  const [showExpoGuidance, setShowExpoGuidance] = useState(false);

  const scaffoldTemplates = useMemo(() => listScaffoldTemplates(), []);

  const refreshProjectShape = useCallback(async () => {
    if (!projectPath) {
      setHasPackageJson(false);
      setHasIndexHtml(false);
      setDetectedKind("");
      setCompatibleTemplates([]);
      setDetectedTemplate(null);
      return;
    }

    try {
      const result = await previewDetectTemplates(projectPath);
      const kind = String(result?.kind || "");
      const templates = Array.isArray(result?.compatibleTemplates)
        ? result.compatibleTemplates
        : [];

      setHasPackageJson(kind === "package");
      setHasIndexHtml(kind === "static");
      setDetectedKind(kind);
      setCompatibleTemplates(templates);
      setDetectedTemplate(result?.detectedTemplate || null);
    } catch {
      setHasPackageJson(false);
      setHasIndexHtml(false);
      setDetectedKind("");
      setCompatibleTemplates([]);
      setDetectedTemplate(null);
    }
  }, [projectPath]);

  useEffect(() => {
    setScaffoldErr("");
    setLastGeneratedTemplateId("");
    setShowExpoGuidance(false);
    lastLogKeyRef.current = "";

    setLogs(getPreviewLogBuffer());
    setStatus(getPreviewStatusValue());
    setPreviewUrl("");
  }, [projectPath]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (cancelled) return;
      await refreshProjectShape();
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [refreshProjectShape]);

  useEffect(() => {
    let unLog;
    let unStatus;
    let cancelled = false;

    (async () => {
      try {
        const currentStatus = await previewGetStatus();
        const nextStatus = currentStatus || "idle";
        setPreviewStatusValue(nextStatus);
        if (!cancelled) setStatus(nextStatus);
      } catch {
        setPreviewStatusValue("idle");
        if (!cancelled) setStatus("idle");
      }

      const logUnlisten = await onPreviewLog(({ kind, line }) => {
        const raw = String(line ?? "");
        const text = raw.replace(/\x1b\[[0-9;]*m/g, "");
        if (CLI_HINT_RE.some((r) => r.test(text))) {
          return;
        }

        const key = `${kind}|${text}`;
        if (key === lastLogKeyRef.current) return;
        lastLogKeyRef.current = key;

        const entry = { kind, line: text, ts: Date.now() };
        appendPreviewLog(entry);
        setLogs(getPreviewLogBuffer());
      });

      if (cancelled) {
        if (typeof logUnlisten === "function") logUnlisten();
      } else {
        unLog = logUnlisten;
      }

      const statusUnlisten = await onPreviewStatus(({ status }) => {
        const nextStatus = String(status || "idle");
        if (cancelled) return;

        setPreviewStatusValue(nextStatus);
        setStatus(nextStatus);

        if (nextStatus.startsWith("scaffold:done:")) {
          refreshProjectShape();

          try {
            window.dispatchEvent(new CustomEvent("kforge://workspace/refresh"));
          } catch {
            // ignore
          }
        }
      });

      if (cancelled) {
        if (typeof statusUnlisten === "function") statusUnlisten();
      } else {
        unStatus = statusUnlisten;
      }
    })();

    return () => {
      cancelled = true;

      if (typeof unLog === "function") unLog();
      else if (unLog && typeof unLog.then === "function") {
        unLog.then((fn) => {
          if (typeof fn === "function") fn();
        });
      }

      if (typeof unStatus === "function") unStatus();
      else if (unStatus && typeof unStatus.then === "function") {
        unStatus.then((fn) => {
          if (typeof fn === "function") fn();
        });
      }
    };
  }, [refreshProjectShape]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: logs.length > 1 ? "smooth" : "auto",
    });
  }, [logs]);

  const targetPath = useMemo(() => projectPath || "", [projectPath]);

  const isRunnerIdle = useMemo(() => {
    if (!status) return true;
    if (status === "idle") return true;
    if (String(status).startsWith("scaffold:")) return true;
    return false;
  }, [status]);

  const disabled = !targetPath;
  const isStaticOnlyProject = hasIndexHtml && !hasPackageJson;
  const showInstallButton = !isStaticOnlyProject;

  const detectedTemplateLabel = useMemo(() => {
    if (detectedTemplate?.name) {
      return detectedTemplate.name;
    }

    if (compatibleTemplates.length === 1) {
      return compatibleTemplates[0]?.name || "";
    }

    return "";
  }, [compatibleTemplates, detectedTemplate]);

  const compatibleTemplateNames = useMemo(() => {
    return compatibleTemplates
      .map((template) => template?.name)
      .filter(Boolean)
      .join(", ");
  }, [compatibleTemplates]);

  const isExpoProject = detectedTemplate?.id === "expo-react-native";

  useEffect(() => {
    if (isExpoProject) {
      setPreviewUrl("");
      return;
    }

    setPreviewUrl(findPreviewUrl(logs));
  }, [isExpoProject, logs]);

  const installGuidance = useMemo(() => {
    if (!showInstallButton) {
      return "Static projects do not need Install.";
    }

    if (
      lastGeneratedTemplateId &&
      templateInstallsDuringScaffold(lastGeneratedTemplateId)
    ) {
      const templateName =
        getTemplateById(lastGeneratedTemplateId)?.name || "This template";

      return `${templateName} usually installs dependencies during generation, so Install may not be needed immediately.`;
    }

    return "Use Install if dependencies are not already installed.";
  }, [lastGeneratedTemplateId, showInstallButton]);

  const showLogPanel = useMemo(() => {
    if (!isExpoProject) return true;
    if (logs.length > 0) return true;
    if (status !== "idle") return true;
    return false;
  }, [isExpoProject, logs.length, status]);

  async function handleOpen() {
    if (!previewUrl || isExpoProject) return;
    await invoke("open_url", { url: previewUrl });
  }

  async function handlePreview() {
    if (disabled || !isRunnerIdle) return;

    if (isExpoProject) {
      setShowExpoGuidance((prev) => !prev);
      return;
    }

    await previewStart(targetPath);
  }

  async function handleGenerateTemplate(template) {
    if (activeScaffold) return;

    setScaffoldErr("");

    if (!projectPath) {
      setScaffoldErr("Open a folder first.");
      return;
    }

    if (!template?.scaffold?.command) {
      setScaffoldErr("This template cannot be generated yet.");
      return;
    }

    setActiveScaffold(template.id);
    setGenerateMenuOpen(false);
    try {
      await invoke(template.scaffold.command, {
        parentPath: projectPath,
        appName: template.scaffold.appName,
      });
      setLastGeneratedTemplateId(template.id);
      await refreshProjectShape();
    } catch (e) {
      setScaffoldErr(String(e));
    } finally {
      setActiveScaffold("");
    }
  }

  function clearLogs() {
    clearPreviewLogBuffer();
    setLogs([]);
    setPreviewUrl("");
    lastLogKeyRef.current = "";
  }

  return (
    <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 w-full">
          <div className="text-sm font-semibold text-zinc-100">Preview</div>

          <div className="text-xs text-zinc-400 mt-0.5">
            Status:{" "}
            <span className="text-zinc-200">{getStatusLabel(status)}</span>
            {projectPath ? (
              <>
                <br />
                Project: <span className="text-zinc-300">{projectPath}</span>
                {detectedTemplateLabel ? (
                  <>
                    <br />
                    <span className="text-zinc-200">
                      {detectedTemplateLabel}
                    </span>{" "}
                    project detected
                  </>
                ) : detectedKind ? (
                  <>
                    <br />
                    <span className="text-zinc-200">{detectedKind}</span>{" "}
                    project detected
                  </>
                ) : null}
                {!detectedTemplateLabel && compatibleTemplateNames ? (
                  <>
                    <br />
                    <span className="text-zinc-400">
                      Compatible templates: {compatibleTemplateNames}
                    </span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                {" "}
                — <span className="text-zinc-300">No folder open</span>
              </>
            )}
            {previewUrl && !isExpoProject ? (
              <div className="mt-2">
                <button
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-zinc-700/60 bg-black/20 hover:bg-black/30"
                  onClick={handleOpen}
                  title="Open preview URL"
                >
                  <span className="text-zinc-500">URL</span>
                  <span className="font-mono text-[11px] text-blue-400 hover:text-blue-300 underline">
                    {previewUrl}
                  </span>
                </button>
              </div>
            ) : null}
          </div>

          {scaffoldErr ? (
            <div className="mt-2 text-xs text-red-300">{scaffoldErr}</div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <div className="relative">
            <button
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
              disabled={!projectPath || !isRunnerIdle}
              onClick={() => setGenerateMenuOpen((v) => !v)}
              title="Generate a project template"
            >
              Generate ▾
            </button>

            {generateMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg z-10">
                {scaffoldTemplates.map((template) => (
                  <button
                    key={template.id}
                    className="block w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                    onClick={() => {
                      setGenerateMenuOpen(false);
                      handleGenerateTemplate(template);
                    }}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {showInstallButton ? (
            <button
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
              disabled={disabled || !isRunnerIdle}
              onClick={() => previewInstall(targetPath)}
              title="Run install for projects that need dependencies"
            >
              Install
            </button>
          ) : null}

          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={disabled || !isRunnerIdle}
            onClick={handlePreview}
            title={
              isExpoProject
                ? "Show how to preview this Expo app outside KForge"
                : isStaticOnlyProject
                  ? "Start static preview"
                  : "Start the development server"
            }
          >
            Preview
          </button>

          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={
              status === "idle" || String(status).startsWith("scaffold:")
            }
            onClick={() => previewStop()}
            title="Stop the running preview process"
          >
            Stop
          </button>

          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={!previewUrl || isExpoProject}
            onClick={handleOpen}
            title={
              isExpoProject
                ? "Expo preview opens outside KForge"
                : "Open the running preview in your browser"
            }
          >
            Open
          </button>

          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={logs.length === 0 && !previewUrl}
            onClick={clearLogs}
            title="Clear preview logs"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-zinc-400">
        {!projectPath && <>Open a folder to enable preview tools.</>}

        {projectPath && isExpoProject && !showExpoGuidance && (
          <>
            Expo app detected. Run{" "}
            <span className="font-semibold text-yellow-300">Install</span> if
            needed, then click{" "}
            <span className="font-semibold text-yellow-300">Preview</span> to
            see the external preview steps.
          </>
        )}

        {projectPath && isExpoProject && showExpoGuidance && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium text-yellow-200">
                Expo preview opens outside KForge
              </div>

              <button
                className="shrink-0 rounded-md border border-zinc-700/60 bg-black/20 px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-black/30"
                onClick={() => setShowExpoGuidance(false)}
                title="Hide Expo preview help"
              >
                Close
              </button>
            </div>

            <div className="mt-1">
              If you have not run{" "}
              <span className="font-semibold text-yellow-300">Install</span>{" "}
              yet, do that first. Then open{" "}
              <span className="text-zinc-200">KForge Terminal</span> in this
              project folder and run one of these:
            </div>

            <div className="mt-2 space-y-1 text-zinc-300">
              <div>
                <span className="font-mono text-blue-300">pnpm dev</span> —
                phone with Expo Go, scan the QR code in Terminal
              </div>

              <div>
                <span className="font-mono text-blue-300">pnpm run web</span> —
                web browser preview
              </div>

              <div>
                <span className="font-mono text-blue-300">
                  pnpm run android
                </span>{" "}
                — Android Studio or device required
              </div>

              <div>
                <span className="font-mono text-blue-300">pnpm run ios</span> —
                macOS with Xcode required
              </div>
            </div>

            <div className="mt-2 text-zinc-500">
              Terminal folder:{" "}
              <span className="font-mono text-zinc-400">{projectPath}</span>
            </div>
          </div>
        )}

        {projectPath && !isExpoProject && (
          <>
            Click <span className="font-semibold text-yellow-300">Preview</span>{" "}
            to start your app. When a preview URL is ready,{" "}
            <span className="font-semibold text-yellow-300">Open</span> will
            launch it in your browser.
            <span className="text-zinc-400"> {installGuidance}</span>
          </>
        )}
      </div>

      {showLogPanel ? (
        <div className="mt-3 h-44 overflow-auto rounded-lg bg-black/30 p-2 text-xs">
          {logs.length === 0 ? (
            <div className="text-zinc-500">No logs yet.</div>
          ) : (
            logs.map((l) => (
              <div
                key={l.ts + l.line}
                className={
                  l.kind === "stderr" ? "text-red-300" : "text-zinc-200"
                }
              >
                {l.line}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      ) : null}
    </div>
  );
}
