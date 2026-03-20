import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  appendCommandLog,
  clearCommandLogBuffer,
  commandRun,
  getCommandLogBuffer,
  getCommandStatusValue,
  onCommandLog,
  onCommandStatus,
  setCommandStatusValue,
} from "./commandRunner";

function getStatusLabel(status) {
  const value = String(status || "idle");
  if (value === "running") return "Command running";
  return "Ready";
}

export default function CommandRunnerPanel({ projectPath }) {
  const [status, setStatus] = useState(getCommandStatusValue());
  const [logs, setLogs] = useState(() => getCommandLogBuffer());
  const [command, setCommand] = useState("");

  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setLogs(getCommandLogBuffer());
    setStatus(getCommandStatusValue());
  }, [projectPath]);

  useEffect(() => {
    let unLog;
    let unStatus;
    let cancelled = false;

    (async () => {
      const logUnlisten = await onCommandLog((payload) => {
        const line =
          typeof payload === "string"
            ? payload
            : String(payload?.line ?? payload ?? "");

        const entry = {
          kind: "stdout",
          line,
          ts: Date.now(),
        };

        appendCommandLog(entry);
        if (!cancelled) {
          setLogs(getCommandLogBuffer());
        }
      });

      if (cancelled) {
        if (typeof logUnlisten === "function") logUnlisten();
      } else {
        unLog = logUnlisten;
      }

      const statusUnlisten = await onCommandStatus((payload) => {
        const nextStatus =
          typeof payload === "string"
            ? payload
            : String(payload?.status ?? "idle");

        setCommandStatusValue(nextStatus);

        if (!cancelled) {
          setStatus(nextStatus);
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

  const disabled = !projectPath;
  const isRunning = useMemo(() => status === "running", [status]);

  async function handleRun() {
    const trimmed = String(command || "").trim();
    if (!trimmed || !projectPath || isRunning) return;

    const entry = {
      kind: "stdin",
      line: `> ${trimmed}`,
      ts: Date.now(),
    };

    appendCommandLog(entry);
    setLogs(getCommandLogBuffer());

    try {
      await commandRun(trimmed, projectPath);
      setCommand("");
      inputRef.current?.focus();
    } catch (e) {
      const errorEntry = {
        kind: "stderr",
        line: String(e),
        ts: Date.now(),
      };
      appendCommandLog(errorEntry);
      setLogs(getCommandLogBuffer());
    }
  }

  function clearLogs() {
    clearCommandLogBuffer();
    setLogs([]);
  }

  return (
    <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 w-full">
          <div className="text-sm font-semibold text-zinc-100">Terminal</div>

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
                — <span className="text-zinc-300">No folder open</span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
            disabled={logs.length === 0}
            onClick={clearLogs}
            title="Clear terminal logs"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          ref={inputRef}
          className="flex-1 rounded-lg border border-zinc-700 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
          placeholder={projectPath ? "Enter command..." : "Open a folder first"}
          value={command}
          disabled={disabled || isRunning}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleRun();
            }
          }}
        />

        <button
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm disabled:opacity-40"
          disabled={disabled || isRunning || !String(command || "").trim()}
          onClick={handleRun}
          title="Run command in the project root"
        >
          Run
        </button>
      </div>

      <div className="mt-2 text-xs text-zinc-400">
        Commands run in the workspace root. Each command runs independently.
      </div>

      <div className="mt-3 h-44 overflow-auto rounded-lg bg-black/30 p-2 text-xs">
        {logs.length === 0 ? (
          <div className="text-zinc-500">No logs yet.</div>
        ) : (
          logs.map((l) => (
            <div
              key={l.ts + l.line}
              className={
                l.kind === "stderr"
                  ? "text-red-300"
                  : l.kind === "stdin"
                    ? "text-yellow-300"
                    : "text-zinc-200"
              }
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
