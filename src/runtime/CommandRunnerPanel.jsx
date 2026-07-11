import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  appendCommandLog,
  clearCommandLogBuffer,
  commandRun,
  commandStop,
  getCommandLogBuffer,
  getCommandStatusValue,
  onCommandLog,
  onCommandStatus,
  setCommandStatusValue,
} from "./commandRunner";

const COMMAND_GROUPS = [
  {
    name: "Project",
    commands: [
      {
        label: "Install dependencies",
        command: "pnpm install",
        description:
          "Installs the packages required by the current project. This can change the lockfile and node_modules folder.",
      },
      {
        label: "Build project",
        command: "pnpm build",
        description:
          "Creates a production build and reports build errors. It does not start the app.",
      },
      {
        label: "Start dev server",
        command: "pnpm dev",
        description:
          "Starts the project's development server. Use Stop when you want to end it.",
      },
      {
        label: "Git status",
        command: "git status",
        description:
          "Shows changed, staged, and untracked files. This does not modify anything.",
      },
      {
        label: "Git diff",
        command: "git diff",
        description:
          "Shows unstaged file changes. This does not modify anything.",
      },
    ],
  },
  {
    name: "Files & folders",
    commands: [
      {
        label: "List files and folders",
        command: "dir",
        description:
          "Shows the files and folders in the current project folder. This does not modify anything.",
      },
      {
        label: "Show current folder",
        command: "cd",
        description:
          "Shows the folder where KForge Terminal is currently running. This does not modify anything.",
      },
      {
        label: "Show folder tree",
        command: "tree /F",
        description:
          "Shows the project's folder structure, including files. Large projects can produce a long result.",
      },
      {
        label: "Create a folder",
        command: 'mkdir "New folder"',
        description:
          "Creates a new folder in the current project. Replace the example name before running.",
      },
      {
        label: "Open in File Explorer",
        command: "explorer .",
        description:
          "Opens the current project folder in Windows File Explorer.",
      },
    ],
  },
  {
    name: "GitHub",
    advisory:
      "These commands use GitHub CLI (gh). It must be installed and signed in. Start with Check GitHub sign-in.",
    commands: [
      {
        label: "Check GitHub sign-in",
        command: "gh auth status",
        description:
          "Checks whether GitHub CLI is installed and signed in. This does not change the project.",
      },
      {
        label: "List my GitHub repositories",
        command: "gh repo list --limit 100",
        description:
          "Lists up to 100 repositories available to the GitHub account currently signed into GitHub CLI.",
      },
      {
        label: "Show current project remote",
        command: "git remote -v",
        description:
          "Shows the GitHub or Git remote connected to the current project. This does not modify anything.",
      },
      {
        label: "Open current repository on GitHub",
        command: "gh repo view --web",
        description:
          "Opens the current project's GitHub repository in your web browser. The project must already have a GitHub remote.",
      },
    ],
  },
  {
    name: "Git",
    commands: [
      {
        label: "Stage all changes",
        command: "git add .",
        description:
          "Stages all current project changes for the next commit. Review git status first when unsure.",
      },
      {
        label: "Commit with message",
        command: 'git commit -m "Describe your changes"',
        description:
          "Creates a commit from staged changes. Replace the example message before running.",
      },
      {
        label: "Push",
        command: "git push",
        description:
          "Uploads committed changes to the configured remote repository.",
      },
      {
        label: "Pull latest",
        command: "git pull",
        description:
          "Downloads and combines the latest remote changes with the current branch.",
      },
    ],
  },
];

function getStatusLabel(status) {
  const value = String(status || "idle");
  if (value === "running") return "Command running";
  return "Ready";
}

export default function CommandRunnerPanel({ projectPath }) {
  const [status, setStatus] = useState(getCommandStatusValue());
  const [logs, setLogs] = useState(() => getCommandLogBuffer());
  const [command, setCommand] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState(null);

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

  function insertSuggestedCommand(item) {
    setCommand(item.command);
    setSelectedCommand(item);
    setLibraryOpen(false);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

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
      setSelectedCommand(null);
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

  async function handleStop() {
    try {
      await commandStop();
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

          <div className="mt-0.5 text-xs text-zinc-400">
            Status:{" "}
            <span className="text-zinc-200">{getStatusLabel(status)}</span>

            {projectPath ? (
              <>
                <br />
                Running in:{" "}
                <span className="break-all text-zinc-300">{projectPath}</span>
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
            type="button"
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-40"
            disabled={logs.length === 0}
            onClick={clearLogs}
            title="Clear terminal logs"
          >
            Clear
          </button>

          <button
            type="button"
            className="rounded-lg bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-40"
            disabled={!isRunning}
            onClick={handleStop}
            title="Stop running command"
          >
            Stop
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-700/60 bg-black/20 p-2.5 text-xs text-zinc-300">
        KForge Terminal runs one command at a time in the open project folder.
        On Windows it uses CMD-style command syntax.
      </div>

      <div className="relative mt-3">
        <button
          type="button"
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-40"
          disabled={disabled || isRunning}
          onClick={() => setLibraryOpen((open) => !open)}
        >
          Suggested commands {libraryOpen ? "▲" : "▼"}
        </button>

        {libraryOpen ? (
          <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-2 shadow-xl">
            <div className="mb-2 text-xs text-zinc-400">
              Choose a command to place it in the box. Nothing runs
              automatically.
            </div>

            <div className="space-y-3">
              {COMMAND_GROUPS.map((group) => (
                <div key={group.name}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {group.name}
                  </div>

                  {group.advisory ? (
                    <div className="mb-2 rounded-lg border border-sky-800/50 bg-sky-950/20 p-2 text-xs text-sky-200">
                      {group.advisory}
                    </div>
                  ) : null}

                  <div className="grid gap-1">
                    {group.commands.map((item) => (
                      <button
                        key={`${group.name}-${item.label}`}
                        type="button"
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left hover:border-zinc-600 hover:bg-zinc-800"
                        onClick={() => insertSuggestedCommand(item)}
                      >
                        <div className="text-sm font-medium text-zinc-100">
                          {item.label}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-zinc-400">
                          {item.command}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          ref={inputRef}
          className="flex-1 rounded-lg border border-zinc-700 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
          placeholder={projectPath ? "Enter or choose a command..." : "Open a folder first"}
          value={command}
          disabled={disabled || isRunning}
          onChange={(e) => {
            setCommand(e.target.value);
            setSelectedCommand(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleRun();
            }
          }}
        />

        <button
          type="button"
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-40"
          disabled={disabled || isRunning || !String(command || "").trim()}
          onClick={handleRun}
          title="Run command in the open project folder"
        >
          Run
        </button>
      </div>

      {selectedCommand ? (
        <div className="mt-2 rounded-lg border border-amber-700/40 bg-amber-950/20 p-2.5 text-xs">
          <div className="font-semibold text-amber-200">
            {selectedCommand.label}
          </div>
          <div className="mt-1 text-zinc-300">
            {selectedCommand.description}
          </div>
          <div className="mt-1 text-amber-200">
            Review or edit the command, then choose Run.
          </div>
        </div>
      ) : (
        <div className="mt-2 text-xs text-zinc-400">
          Suggested commands are inserted for review and never run
          automatically. Long-running commands can be stopped with Stop.
        </div>
      )}

      <div className="mt-3 h-44 overflow-auto rounded-lg bg-black/30 p-2 text-xs">
        {logs.length === 0 ? (
          <div className="text-zinc-500">No logs yet.</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.ts + log.line}
              className={
                log.kind === "stderr"
                  ? "text-red-300"
                  : log.kind === "stdin"
                    ? "text-yellow-300"
                    : "text-zinc-200"
              }
            >
              {log.line}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}