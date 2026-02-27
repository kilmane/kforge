import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  onPreviewLog,
  onPreviewStatus,
  previewInstall,
  previewStart,
  previewStop,
} from "./previewRunner";

const URL_RE = /(https?:\/\/(?:localhost|127\.0\.0\.1):\d+(?:\/\S*)?)/i;

export default function PreviewPanel({ projectPath }) {
  const [status, setStatus] = useState("idle"); // idle | installing | running
  const [logs, setLogs] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    let unLog;
    let unStatus;

    (async () => {
      unLog = await onPreviewLog(({ kind, line }) => {
        const text = String(line ?? "");

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

  const disabled = !projectPath;

  async function handleOpen() {
    if (!previewUrl) return;
    await invoke("open_url", { url: previewUrl });
  }

  function clearLogs() {
    setLogs([]);
    setPreviewUrl("");
  }

  return (
    <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-100">Preview</div>
          <div className="text-xs text-zinc-400 mt-0.5">
            Status: <span className="text-zinc-200">{status}</span>
            {projectPath ? (
              <>
                {" "}
                • <span className="text-zinc-300 truncate">{projectPath}</span>
              </>
            ) : (
              " • No folder open"
            )}
            {previewUrl ? (
              <>
                <br />
                URL: <span className="text-zinc-200">{previewUrl}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={disabled || status !== "idle"}
            onClick={() => previewInstall(projectPath)}
            title="Run pnpm install in the project folder"
          >
            Install
          </button>

          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={disabled || status !== "idle"}
            onClick={() => previewStart(projectPath)}
            title="Run pnpm dev in the project folder"
          >
            Preview
          </button>

          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={status === "idle"}
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
