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
const CLI_HINT_RE = [/press h to show help/i, /use --host to expose/i];

function getStatusLabel(status) {
  const value = String(status || "idle");

  if (value === "idle") return "Ready";
  if (value === "installing") return "Installing dependencies…";
  if (value === "running") return "Preview running";
  if (value === "scaffold:starting") return "Generating template…";
  if (value.startsWith("scaffold:done:")) return "Template generated";

  return value;
}

export default function PreviewPanel({ projectPath }) {
  const [status, setStatus] = useState(getPreviewStatusValue());
  const [logs, setLogs] = useState(() => getPreviewLogBuffer());

  const [previewUrl, setPreviewUrl] = useState("");
  const endRef = useRef(null);

  const lastLogKeyRef = useRef("");

  const [scaffoldBusy, setScaffoldBusy] = useState(false);
  const [scaffoldErr, setScaffoldErr] = useState("");

  useEffect(() => {
    setScaffoldErr("");
    lastLogKeyRef.current = "";

    const bufferedLogs = getPreviewLogBuffer();
    setLogs(bufferedLogs);
    setStatus(getPreviewStatusValue());

    const restoredUrl =
      bufferedLogs.find((entry) => {
        const text = String(entry?.line ?? "");
        return URL_RE.test(text);
      })?.line ?? "";

    const match = restoredUrl.match(URL_RE);
    setPreviewUrl(match?.[1] || "");
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

        const m = text.match(URL_RE);
        if (m && m[1]) setPreviewUrl((prev) => prev || m[1]);
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

        // 🔁 After scaffold completes, refresh the workspace tree
        if (nextStatus.startsWith("scaffold:done:")) {
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
  }, []);

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

  async function handleOpen() {
    if (!previewUrl) return;
    await invoke("open_url", { url: previewUrl });
  }

  async function handleGenerate() {
    setScaffoldErr("");

    if (!projectPath) {
      setScaffoldErr("Open a folder first.");
      return;
    }

    setScaffoldBusy(true);
    try {
      await invoke("scaffold_vite_react", {
        parentPath: projectPath,
        appName: "vite-react-app",
      });
    } catch (e) {
      setScaffoldErr(String(e));
    } finally {
      setScaffoldBusy(false);
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
              </>
            ) : (
              <>
                {" "}
                • <span className="text-zinc-300">No folder open</span>
              </>
            )}
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

          {scaffoldErr ? (
            <div className="mt-2 text-xs text-red-300">{scaffoldErr}</div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={!projectPath || scaffoldBusy || !isRunnerIdle}
            onClick={handleGenerate}
            title="Generate a Vite + React app in the opened folder"
          >
            {scaffoldBusy ? "Generating…" : "Generate"}
          </button>

          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={disabled || !isRunnerIdle}
            onClick={() => previewInstall(targetPath)}
            title="Run pnpm install in the project folder"
          >
            Install
          </button>

          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={disabled || !isRunnerIdle}
            onClick={() => previewStart(targetPath)}
            title="Start the development server"
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
            title="Open the running preview in your browser"
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
      To preview your app: click{" "}
      <span className="font-semibold text-yellow-300">Install</span>,{" "}
      <span className="font-semibold text-yellow-300">Preview</span>, then{" "}
      <span className="font-semibold text-yellow-300">Open</span>
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
