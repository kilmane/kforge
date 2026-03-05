import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  onPreviewLog,
  onPreviewStatus,
  previewInstall,
  previewStart,
  previewStop,
} from "./previewRunner";

const URL_RE = /(https?:\/\/(?:localhost|127\.0\.0\.1):\d+(?:\/\S*)?)/i;

function storageKey(projectPath) {
  return projectPath ? `kforge.preview.scaffoldPath:${projectPath}` : "";
}

export default function PreviewPanel({ projectPath }) {
  const [status, setStatus] = useState("idle"); // idle | installing | running | scaffold:...
  const [logs, setLogs] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const endRef = useRef(null);

  // De-dupe: ignore identical consecutive log lines
  const lastLogKeyRef = useRef("");

  // Scaffold state
  const [viteAppName, setViteAppName] = useState("my-react-app");
  const [scaffoldBusy, setScaffoldBusy] = useState(false);
  const [scaffoldErr, setScaffoldErr] = useState("");
  const [scaffoldPath, setScaffoldPath] = useState("");

  // B) Explicit target selection (base vs generated)
  const [useGeneratedTarget, setUseGeneratedTarget] = useState(true);

  // Load persisted scaffoldPath whenever projectPath changes
  useEffect(() => {
    setScaffoldErr("");
    setPreviewUrl("");
    lastLogKeyRef.current = "";

    if (!projectPath) {
      setScaffoldPath("");
      return;
    }

    try {
      const k = storageKey(projectPath);
      const saved = k ? localStorage.getItem(k) : "";
      setScaffoldPath(saved || "");
    } catch {
      setScaffoldPath("");
    }
  }, [projectPath]);

  // Persist scaffoldPath
  useEffect(() => {
    if (!projectPath) return;
    try {
      const k = storageKey(projectPath);
      if (!k) return;
      if (scaffoldPath) localStorage.setItem(k, scaffoldPath);
      else localStorage.removeItem(k);
    } catch {
      // ignore
    }
  }, [projectPath, scaffoldPath]);

  useEffect(() => {
    let unLog;
    let unStatus;

    (async () => {
      unLog = await onPreviewLog(({ kind, line }) => {
        const raw = String(line ?? "");
        // strip ANSI color codes so URL detection works
        const text = raw.replace(/\x1b\[[0-9;]*m/g, "");

        // A) de-dupe identical consecutive lines
        const key = `${kind}|${text}`;
        if (key === lastLogKeyRef.current) return;
        lastLogKeyRef.current = key;

        setLogs((prev) => {
          const next = [...prev, { kind, line: text, ts: Date.now() }];
          return next.slice(-600);
        });

        const m = text.match(URL_RE);
        if (m && m[1]) setPreviewUrl((prev) => prev || m[1]);
      });

      unStatus = await onPreviewStatus(({ status }) => {
        setStatus(status || "idle");
      });
    })();

    return () => {
      if (unLog) unLog();
      if (unStatus) unStatus();
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const generatedAvailable = Boolean(scaffoldPath);

  const targetPath = useMemo(() => {
    if (useGeneratedTarget && scaffoldPath) return scaffoldPath;
    return projectPath;
  }, [useGeneratedTarget, scaffoldPath, projectPath]);

  // Treat scaffold statuses as "idle enough" for enabling Install/Preview
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
        setUseGeneratedTarget(true); // B) automatically use the generated target after create
      }
    } catch (e) {
      setScaffoldErr(String(e));
    } finally {
      setScaffoldBusy(false);
    }
  }

  function handleResetGenerated() {
    setScaffoldPath("");
    setUseGeneratedTarget(false);
    setScaffoldErr("");
  }

  function clearLogs() {
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
            {/* C) URL pill (no auto-open) */}
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

          {/* Scaffold controls */}
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

          {/* B) Target toggle */}
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
              onClick={() => setUseGeneratedTarget(false)}
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
              onClick={() => setUseGeneratedTarget(true)}
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
