import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  appendPreviewLog,
  clearPreviewLogBuffer,
  getPreviewLogBuffer,
  getPreviewStatusValue,
  onPreviewLog,
  onPreviewStatus,
  previewGetStatus,
  previewInstall,
  previewStart,
  previewStop,
  setPreviewStatusValue,
} from "./previewRunner";

const URL_RE = /(https?:\/\/(?:localhost|127\.0\.0\.1):\d+(?:\/\S*)?)/i;

function scaffoldPathStorageKey(projectPath) {
  return projectPath ? `kforge.preview.scaffoldPath:${projectPath}` : "";
}

function targetModeStorageKey(projectPath) {
  return projectPath ? `kforge.preview.useGeneratedTarget:${projectPath}` : "";
}
function getStatusLabel(status) {
  const value = String(status || "idle");

  if (value === "idle") return "Ready";
  if (value === "installing") return "Installing dependencies…";
  if (value === "running") return "Preview running";
  if (value === "scaffold:starting") return "Generating template…";
  if (value.startsWith("scaffold:done:")) return "Template generated";

  return value;
}

function persistScaffoldPath(projectPath, value) {
  if (!projectPath) return;
  try {
    const key = scaffoldPathStorageKey(projectPath);
    if (!key) return;
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function persistTargetMode(projectPath, useGeneratedTarget) {
  if (!projectPath) return;
  try {
    const key = targetModeStorageKey(projectPath);
    if (!key) return;
    localStorage.setItem(key, useGeneratedTarget ? "generated" : "base");
  } catch {
    // ignore
  }
}

export default function PreviewPanel({ projectPath }) {
  const [status, setStatus] = useState(getPreviewStatusValue());
  const [logs, setLogs] = useState(() => getPreviewLogBuffer());

  const [previewUrl, setPreviewUrl] = useState("");
  const endRef = useRef(null);

  const lastLogKeyRef = useRef("");

  const [viteAppName, setViteAppName] = useState("my-react-app");
  const [scaffoldBusy, setScaffoldBusy] = useState(false);
  const [scaffoldErr, setScaffoldErr] = useState("");
  const [scaffoldPath, setScaffoldPath] = useState("");
  const [useGeneratedTarget, setUseGeneratedTarget] = useState(true);

  useEffect(() => {
    setScaffoldErr("");
    setPreviewUrl("");
    lastLogKeyRef.current = "";
    setLogs(getPreviewLogBuffer());
    setStatus(getPreviewStatusValue());

    if (!projectPath) {
      setScaffoldPath("");
      setUseGeneratedTarget(true);
      return;
    }

    try {
      const savedScaffoldPath = localStorage.getItem(
        scaffoldPathStorageKey(projectPath),
      );
      setScaffoldPath(savedScaffoldPath || "");
    } catch {
      setScaffoldPath("");
    }

    try {
      const savedTargetMode = localStorage.getItem(
        targetModeStorageKey(projectPath),
      );
      setUseGeneratedTarget(savedTargetMode !== "base");
    } catch {
      setUseGeneratedTarget(true);
    }
  }, [projectPath]);

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

      unLog = await onPreviewLog(({ kind, line }) => {
        const raw = String(line ?? "");
        const text = raw.replace(/\x1b\[[0-9;]*m/g, "");

        const key = `${kind}|${text}`;
        if (key === lastLogKeyRef.current) return;
        lastLogKeyRef.current = key;

        const entry = { kind, line: text, ts: Date.now() };
        appendPreviewLog(entry);
        setLogs(getPreviewLogBuffer());

        const m = text.match(URL_RE);
        if (m && m[1]) setPreviewUrl((prev) => prev || m[1]);
      });

      unStatus = await onPreviewStatus(({ status }) => {
        const nextStatus = String(status || "idle");
        if (cancelled) return;

        setPreviewStatusValue(nextStatus);
        setStatus(nextStatus);

        if (nextStatus.startsWith("scaffold:done:")) {
          const maybePath = nextStatus.slice("scaffold:done:".length).trim();
          if (maybePath) {
            setScaffoldPath(maybePath);
            setUseGeneratedTarget(true);
            persistScaffoldPath(projectPath, maybePath);
            persistTargetMode(projectPath, true);
          }
        }
      });
    })();

    return () => {
      cancelled = true;
      if (unLog) unLog();
      if (unStatus) unStatus();
    };
  }, [projectPath]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const generatedAvailable = Boolean(scaffoldPath);

  const targetPath = useMemo(() => {
    if (useGeneratedTarget && scaffoldPath) return scaffoldPath;
    return projectPath;
  }, [useGeneratedTarget, scaffoldPath, projectPath]);

  const isRunnerIdle = useMemo(() => {
    if (!status) return true;
    if (status === "idle") return true;
    if (String(status).startsWith("scaffold:")) return true;
    return false;
  }, [status]);

  const disabled = !targetPath;

  async function handleOpen() {
    if (!previewUrl) return;
    await invoke("open_url", { url: previewUrl });
  }

  async function handleGenerate() {
    setScaffoldErr("");
    const name = String(viteAppName || "").trim();

    if (!projectPath) {
      setScaffoldErr("Open a folder first.");
      return;
    }
    if (!name) {
      setScaffoldErr("Enter an app name.");
      return;
    }

    setScaffoldBusy(true);
    try {
      const out = await invoke("scaffold_vite_react", {
        parentPath: projectPath,
        appName: name,
      });

      if (typeof out === "string" && out.length) {
        setScaffoldPath(out);
        setUseGeneratedTarget(true);
        persistScaffoldPath(projectPath, out);
        persistTargetMode(projectPath, true);
      }
    } catch (e) {
      setScaffoldErr(String(e));
    } finally {
      setScaffoldBusy(false);
    }
  }

  function handleUseBase() {
    setUseGeneratedTarget(false);
    persistTargetMode(projectPath, false);
  }

  function handleUseGenerated() {
    setUseGeneratedTarget(true);
    persistTargetMode(projectPath, true);
  }

  function handleResetGenerated() {
    setScaffoldPath("");
    setUseGeneratedTarget(false);
    setScaffoldErr("");
    persistScaffoldPath(projectPath, "");
    persistTargetMode(projectPath, false);
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
            Status: <span className="text-zinc-200">{status || "idle"}</span>
            Status:{" "}
            <span className="text-zinc-200">{getStatusLabel(status)}</span>
            {projectPath ? (
              <>
                <br />
                Base: <span className="text-zinc-300">{projectPath}</span>
              </>
            ) : (
              <>
                {" "}
                • <span className="text-zinc-300">No folder open</span>
              </>
            )}
            {targetPath ? (
              <>
                <br />
                Target: <span className="text-zinc-200">{targetPath}</span>
              </>
            ) : null}
            {previewUrl ? (
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

          <div className="w-full mt-3 flex items-center gap-2">
            <input
              className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-zinc-950/40 border border-zinc-700/40 text-zinc-100 text-sm"
              value={viteAppName}
              onChange={(e) => setViteAppName(e.target.value)}
              placeholder="my-react-app"
              disabled={!projectPath || scaffoldBusy}
            />
            <button
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
              disabled={
                !projectPath ||
                scaffoldBusy ||
                !String(viteAppName || "").trim()
              }
              onClick={handleGenerate}
              title="Generate a Vite + React app inside the base folder"
            >
              {scaffoldBusy ? "Generating…" : "Generate"}
            </button>

            <button
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
              disabled={!generatedAvailable}
              onClick={handleResetGenerated}
              title="Forget generated target"
            >
              Reset
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-zinc-400">Use:</span>
            <button
              className={
                "px-2 py-1 rounded-md border text-zinc-100 " +
                (!useGeneratedTarget
                  ? "border-zinc-500/70 bg-zinc-800/60"
                  : "border-zinc-700/50 bg-black/10 hover:bg-black/20")
              }
              disabled={!projectPath}
              onClick={handleUseBase}
              title="Use the base folder as the target"
            >
              Base
            </button>
            <button
              className={
                "px-2 py-1 rounded-md border text-zinc-100 " +
                (useGeneratedTarget
                  ? "border-zinc-500/70 bg-zinc-800/60"
                  : "border-zinc-700/50 bg-black/10 hover:bg-black/20")
              }
              disabled={!generatedAvailable}
              onClick={handleUseGenerated}
              title="Use the generated app folder as the target"
            >
              Generated
            </button>

            {scaffoldErr ? (
              <span className="ml-2 text-red-300">{scaffoldErr}</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={disabled || !isRunnerIdle}
            onClick={() => previewInstall(targetPath)}
            title="Run pnpm install in the target folder"
          >
            Install
          </button>

          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={disabled || !isRunnerIdle}
            onClick={() => previewStart(targetPath)}
            title="Run pnpm dev in the target folder"
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
            disabled={!previewUrl}
            onClick={handleOpen}
            title="Open preview URL in your browser"
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

      <div className="mt-3 h-44 overflow-auto rounded-lg bg-black/30 p-2 text-xs">
        {logs.length === 0 ? (
          <div className="text-zinc-500">No logs yet.</div>
        ) : (
          logs.map((l) => (
            <div
              key={l.ts + l.line}
              className={l.kind === "stderr" ? "text-red-300" : "text-zinc-200"}
            >
              {l.line}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
