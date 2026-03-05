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

  // Scaffold state
  const [viteAppName, setViteAppName] = useState("my-react-app");
  const [scaffoldBusy, setScaffoldBusy] = useState(false);
  const [scaffoldErr, setScaffoldErr] = useState("");
  const [scaffoldPath, setScaffoldPath] = useState("");

  // Load persisted scaffoldPath whenever projectPath changes
  useEffect(() => {
    setScaffoldErr("");
    setPreviewUrl("");

    if (!projectPath) {
      setScaffoldPath("");
      return;
    }

    try {
      const k = storageKey(projectPath);
      const saved = k ? localStorage.getItem(k) : "";
      setScaffoldPath(saved || "");
    } catch {
      // ignore storage errors
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

        // remove ANSI color codes
        const text = raw.replace(/\x1b\[[0-9;]*m/g, "");

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

  const effectivePath = scaffoldPath || projectPath;

  // Treat scaffold statuses as "idle enough" for enabling Install/Preview
  const isRunnerIdle = useMemo(() => {
    if (!status) return true;
    if (status === "idle") return true;
    if (String(status).startsWith("scaffold:")) return true;
    return false;
  }, [status]);

  const disabled = !effectivePath;

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
        setScaffoldPath(out); // becomes new effective target
      }
    } catch (e) {
      setScaffoldErr(String(e));
    } finally {
      setScaffoldBusy(false);
    }
  }

  function handleResetTarget() {
    setScaffoldPath("");
    setScaffoldErr("");
  }

  function clearLogs() {
    setLogs([]);
    setPreviewUrl("");
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
            {effectivePath ? (
              <>
                <br />
                Target: <span className="text-zinc-200">{effectivePath}</span>
              </>
            ) : null}
            {previewUrl ? (
              <>
                <br />
                URL: <span className="text-zinc-200">{previewUrl}</span>
              </>
            ) : null}
          </div>

          {/* Scaffold controls */}
          <div className="w-full mt-2 flex items-center gap-2">
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
              disabled={!scaffoldPath}
              onClick={handleResetTarget}
              title="Reset target back to the base folder"
            >
              Reset
            </button>
          </div>

          {scaffoldErr ? (
            <div className="mt-2 text-xs text-red-300">{scaffoldErr}</div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={disabled || !isRunnerIdle}
            onClick={() => previewInstall(effectivePath)}
            title="Run pnpm install in the target folder"
          >
            Install
          </button>

          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={disabled || !isRunnerIdle}
            onClick={() => previewStart(effectivePath)}
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
