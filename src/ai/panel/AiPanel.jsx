// src/ai/panel/AiPanel.jsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";
import PatchPreviewPanel from "./PatchPreviewPanel.jsx";
import TranscriptPanel from "./TranscriptPanel.jsx";
import ProviderControlsPanel from "./ProviderControlsPanel.jsx";
import PromptPanel from "./PromptPanel.jsx";
import SystemPanel from "./SystemPanel.jsx";
import ParametersPanel from "./ParametersPanel.jsx";
import ActionsPanel from "./ActionsPanel.jsx";
import OutputPanel from "./OutputPanel.jsx";
import OllamaHelperPanel from "./OllamaHelperPanel.jsx";

import { runToolCall } from "../tools/toolRuntime.js";
import { runToolHandler } from "../tools/handlers/index.js";

/**
 * ✅ Global caches to prevent repeated tool prompts when AiPanel is collapsed/re-opened.
 * These survive unmount/remount of the panel.
 *
 * We still clear them when the conversation is cleared (messages becomes empty).
 */
const GLOBAL_SEEN_TOOL_KEYS = new Set();

function uidShort() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(
    -6,
  );
}

function formatToolLine({ tool, status, id, detail }) {
  const t = String(tool || "tool").trim() || "tool";
  const i = String(id || "").trim();
  const d = String(detail || "").trim();

  let headline = "";
  if (status === "request")
    headline = `🛡 Tool request: ${t}${i ? ` (${i})` : ""}`;
  else if (status === "calling")
    headline = `🛠 Calling tool: ${t}${i ? ` (${i})` : ""}…`;
  else if (status === "ok")
    headline = `✅ Tool returned: ${t}${i ? ` (${i})` : ""}`;
  else if (status === "error")
    headline = `❌ Tool failed: ${t}${i ? ` (${i})` : ""}`;
  else if (status === "cancelled")
    headline = `🚫 Tool cancelled: ${t}${i ? ` (${i})` : ""}`;
  else headline = `🧩 Tool event: ${t}${i ? ` (${i})` : ""}`;

  const parts = [`[tool] ${headline}`];
  if (d) parts.push(`— ${d}`);
  return parts.join(" ");
}

function dirnameOfPath(p) {
  const raw = String(p || "");
  if (!raw.trim()) return "";

  const normalized = raw.replaceAll("\\", "/");
  const m = normalized.match(/^([A-Za-z]:)\/?$/);
  if (m) return `${m[1]}/`;

  const parts = normalized.split("/").filter((x) => x.length > 0);
  const drive = normalized.match(/^([A-Za-z]:)\//)?.[1] || "";

  if (parts.length <= 1) return drive ? `${drive}/` : "/";

  const dirParts = parts.slice(0, -1);
  const dir = dirParts.join("/");

  return drive ? `${drive}/${dirParts.slice(1).join("/")}` : `/${dir}`;
}

/**
 * Phase 3.6.4 — Model-initiated tool calls (consent-gated)
 *
 * We accept:
 * - ```tool / ```tool_call fenced JSON
 * - ```json fenced JSON (if it parses to a tool request)
 * - bare JSON tool request
 * - XML-ish tool calls (two common variants)
 *
 * Safety:
 * - whitelist only read-only tools
 * - ALWAYS route through toolRuntime.runToolCall => consent UI
 */
const ALLOWED_MODEL_TOOLS = new Set([
  "read_file",
  "list_dir",
  "search_in_file",
  "write_file",
  "mkdir",
]);

function getMsgText(msg) {
  const v = msg?.content ?? msg?.text ?? msg?.message ?? msg?.body ?? "";
  return String(v || "");
}

/**
 * Small stable hash so we don't store huge payload strings in the key.
 * (Not crypto, just a compact fingerprint.)
 */
function hashString(s) {
  const str = String(s || "");
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function extractFencedBlocks(text) {
  if (!text || typeof text !== "string") return [];

  const blocks = [];

  // 1️⃣ ```tool / ```tool_call
  const reTool = /```(?:tool|tool_call)\s*([\s\S]*?)```/g;
  let m;
  while ((m = reTool.exec(text)) !== null) {
    blocks.push({ payload: (m[1] || "").trim(), source: "tool_fence" });
  }

  // 2️⃣ ```json blocks
  const reJson = /```json\s*([\s\S]*?)```/g;
  while ((m = reJson.exec(text)) !== null) {
    const payload = (m[1] || "").trim();
    if (payload.startsWith("{") && payload.endsWith("}")) {
      blocks.push({ payload, source: "json_fence" });
    }
  }

  // 3️⃣ Any other code block
  const reAnyFence = /```[a-zA-Z0-9_-]*\s*([\s\S]*?)```/g;
  while ((m = reAnyFence.exec(text)) !== null) {
    const payload = (m[1] || "").trim();
    if (!payload) continue;

    // Entire block is JSON
    if (payload.startsWith("{") && payload.endsWith("}")) {
      blocks.push({ payload, source: "any_fence_json" });
      continue;
    }

    // JSON objects inside a code block
    const objRe = /({[\s\S]*?})/g;
    let o;
    while ((o = objRe.exec(payload)) !== null) {
      const candidate = (o[1] || "").trim();
      if (candidate.startsWith("{") && candidate.endsWith("}")) {
        blocks.push({ payload: candidate, source: "any_fence_json_fragment" });
      }
    }
  }

  return blocks;
}

function normalizeToolShape(obj) {
  if (!obj || typeof obj !== "object") return null;

  if (typeof obj.name === "string")
    return { name: obj.name, args: obj.args ?? {} };
  if (typeof obj.tool === "string")
    return { name: obj.tool, args: obj.input ?? obj.args ?? {} };
  if (typeof obj.tool_name === "string")
    return { name: obj.tool_name, args: obj.parameters ?? obj.args ?? {} };
  if (typeof obj.function === "string")
    return { name: obj.function, args: obj.arguments ?? obj.args ?? {} };

  return null;
}

function safeParseToolRequestJson(payload) {
  try {
    const obj = JSON.parse(payload);
    const normalized = normalizeToolShape(obj);
    if (!normalized) return null;

    const name = String(normalized.name || "").trim();
    const args = normalized.args ?? {};

    if (!ALLOWED_MODEL_TOOLS.has(name)) return null;

    return { name, args };
  } catch {
    return null;
  }
}

function tryParseBareToolJson(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) return null;
  return safeParseToolRequestJson(trimmed);
}

/**
 * Parse XML-ish tool calls.
 */
function extractXmlToolCalls(text) {
  const s = String(text || "");
  if (!s.includes("<tool_call")) return [];

  const calls = [];

  // Variant A: <invoke name="..."> ... </invoke>
  const invokeRe = /<invoke\s+name="([^"]+)"\s*>([\s\S]*?)<\/invoke>/g;
  let m;
  while ((m = invokeRe.exec(s)) !== null) {
    const name = String(m[1] || "").trim();
    const body = String(m[2] || "");

    if (!ALLOWED_MODEL_TOOLS.has(name)) continue;

    const args = {};
    const paramRe = /<parameter\s+name="([^"]+)"\s*>([\s\S]*?)<\/parameter>/g;
    let p;
    while ((p = paramRe.exec(body)) !== null) {
      const k = String(p[1] || "").trim();
      const v = String(p[2] || "").trim();
      if (k) args[k] = v;
    }

    calls.push({ name, args, source: "xml_invoke" });
  }

  // Variant B: <function_name>...</function_name> + <parameters>...</parameters>
  const fnMatch = s.match(/<function_name>\s*([^<]+)\s*<\/function_name>/i);
  if (fnMatch) {
    const name = String(fnMatch[1] || "").trim();
    if (ALLOWED_MODEL_TOOLS.has(name)) {
      const args = {};

      const paramsMatch = s.match(
        /<parameters>\s*([\s\S]*?)\s*<\/parameters>/i,
      );
      if (paramsMatch) {
        const body = String(paramsMatch[1] || "");

        const childRe = /<([A-Za-z0-9_:-]+)>\s*([\s\S]*?)\s*<\/\1>/g;
        let c;
        while ((c = childRe.exec(body)) !== null) {
          const rawKey = String(c[1] || "").trim();
          const val = String(c[2] || "").trim();
          if (!rawKey) continue;

          const kLower = rawKey.toLowerCase();
          let key = rawKey;
          if (
            kLower === "search_term" ||
            kLower === "term" ||
            kLower === "search"
          )
            key = "query";

          args[key] = val;
        }
      }

      calls.push({ name, args, source: "xml_function_name" });
    }
  }
  return calls;
}

function ProviderMenuButton({
  provider,
  model,
  configured,
  advancedOpen,
  onToggleAdvanced,
  onChangeProviderModel,
  onConfigure,
}) {
  const [open, setOpen] = React.useState(false);

  const label = `${provider || "No Provider"} / ${model || "(none)"}`;

  const buttonTone = configured
    ? "bg-emerald-600/90 hover:bg-emerald-600 border-emerald-500/60"
    : "bg-red-600/90 hover:bg-red-600 border-red-500/60";

  return (
    <div className="relative">
      <button
        type="button"
        title={label}
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-2 px-3 py-1.5 rounded-md border",
          "text-sm font-semibold text-white",
          "max-w-[520px]",
          buttonTone,
        ].join(" ")}
      >
        <span className="truncate max-w-[460px]">{label}</span>
        <span className="text-yellow-300 font-extrabold text-xs leading-none">
          ▼
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 mt-2 w-64 rounded-md border border-zinc-800 bg-zinc-950 shadow-lg z-50 overflow-hidden">
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-900"
            onClick={() => {
              setOpen(false);
              onChangeProviderModel();
            }}
          >
            Change Provider / Model
          </button>

          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-900"
            onClick={() => {
              setOpen(false);
              onConfigure();
            }}
          >
            Configure AI
          </button>

          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-900"
            onClick={() => {
              setOpen(false);
              onToggleAdvanced();
            }}
          >
            {advancedOpen ? "Advanced settings ▴" : "Advanced settings ▾"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function AiPanel({
  // layout / open state
  aiPanelOpen,
  aiPanelWidthClass,
  aiPanelWide,
  setAiPanelWide,
  setAiPanelOpen,

  // provider header surface
  providerMeta,
  providerReady,
  disabledExplainer,
  headerStatus,
  providerGroupLabel,
  statusChipClass,
  showProviderSurfaceHint,

  // settings routing
  openSettings,
  aiProvider,

  // ephemeral switch note
  providerSwitchNote,
  handleDismissSwitchNote,

  // provider + model controls
  providerOptions,
  handleProviderChange,
  providerStatus,
  disabledProviderMessage,

  aiModel,
  setAiModel,
  modelPlaceholder,
  modelSuggestions,
  showModelHelper,
  modelHelperText,

  // transcript
  messages,
  TranscriptBubble,
  transcriptBottomRef,
  CHAT_CONTEXT_TURNS,
  lastSend,
  aiRunning,
  handleRetryLast,
  clearConversation,

  // prompt
  activeTab,
  handleUseActiveFileAsPrompt,
  includeActiveFile,
  setIncludeActiveFile,
  activeFileChip,

  askForPatch,
  setAskForPatch,

  // patch preview state/handlers (kept in App)
  patchPreview,
  patchPreviewVisible,
  copyPatchToClipboard,
  setPatchPreviewVisible,
  discardPatchPreview,
  appendMessage,

  aiPrompt,
  setAiPrompt,
  handlePromptKeyDown,

  // system + params
  aiSystem,
  setAiSystem,
  aiTemperature,
  setAiTemperature,
  aiMaxTokens,
  setAiMaxTokens,

  // actions
  handleSendChat,
  handleAiTest,
  guardrailText,

  // output + ollama helper
  aiOutput,
  endpoints,
  invoke,
  setAiTestOutput,
  setRuntimeReachable,
  formatTauriError,
  buttonClass,
  iconButtonClass,
  GearIcon,

  // focus layout (dock expanded)
  focusLayout,
}) {
  const aiEndpoint = (endpoints?.[aiProvider] || "").trim();
  const isFocusLayout = !!focusLayout;

  // ✅ Advanced settings (power user knobs). Calm by default.
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // ✅ Provider/Model picker (not "advanced")
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // ✅ Dev tools are for KForge development only (not for end users).
  // Hidden by default. Toggle with Ctrl+Shift+T (dev builds only).
  const isDevBuild = process.env.NODE_ENV === "development";
  const [devToolsEnabled, setDevToolsEnabled] = useState(() => {
    if (!isDevBuild) return false;
    return localStorage.getItem("kforge:devToolsEnabled") === "1";
  });

  useEffect(() => {
    if (!isDevBuild) return;

    const onKeyDown = (e) => {
      const key = String(e.key || "").toLowerCase();
      if (e.ctrlKey && e.shiftKey && key === "t") {
        e.preventDefault();
        setDevToolsEnabled((v) => {
          const next = !v;
          localStorage.setItem("kforge:devToolsEnabled", next ? "1" : "0");
          return next;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDevBuild]);

  const aiModelStr = useMemo(() => {
    if (typeof aiModel === "string") return aiModel;
    if (
      aiModel &&
      typeof aiModel === "object" &&
      typeof aiModel.id === "string"
    )
      return aiModel.id;
    return "";
  }, [aiModel]);

  const pendingConsentRef = useRef(null);

  // Local cache still used, but global is the real guard.
  const processedKeysRef = useRef(new Set());

  // ✅ Reset caches when conversation clears
  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) {
      processedKeysRef.current = new Set();
      GLOBAL_SEEN_TOOL_KEYS.clear();
    }
  }, [messages]);

  const requestConsent = useCallback(
    async ({ toolName, args }) => {
      if (pendingConsentRef.current?.resolve) {
        try {
          pendingConsentRef.current.resolve("cancelled");
        } catch {
          // ignore
        }
        pendingConsentRef.current = null;
      }

      const tool = String(toolName || "tool");
      const id = uidShort();

      let resolve;
      const p = new Promise((r) => {
        resolve = r;
      });

      const gate = { settled: false, resolve };

      pendingConsentRef.current = { id, tool, resolve };

      const detail =
        tool === "read_file"
          ? `Read file (Path: ${String(args?.path || "").trim()})`
          : tool === "list_dir"
            ? `List directory (Path: ${String(args?.path || "").trim()})`
            : tool === "search_in_file"
              ? `Search in file (Path: ${String(args?.path || "").trim()} | Query: ${String(args?.query || "").trim()})`
              : "Awaiting approval…";

      appendMessage(
        "system",
        formatToolLine({
          tool,
          status: "request",
          id,
          detail: detail || "Awaiting approval…",
        }),
        {
          actions: [
            {
              label: "Approve",
              onClick: () => {
                if (gate.settled) return;
                gate.settled = true;

                pendingConsentRef.current = null;

                appendMessage(
                  "system",
                  formatToolLine({
                    tool,
                    status: "calling",
                    id,
                    detail: "Approved by user — executing…",
                  }),
                );

                try {
                  gate.resolve("approved");
                } catch {
                  // ignore
                }
              },
            },
            {
              label: "Cancel",
              onClick: () => {
                if (gate.settled) return;
                gate.settled = true;

                pendingConsentRef.current = null;

                appendMessage(
                  "system",
                  formatToolLine({
                    tool,
                    status: "cancelled",
                    id,
                    detail: "User denied.",
                  }),
                );

                try {
                  gate.resolve("cancelled");
                } catch {
                  // ignore
                }
              },
            },
          ],
        },
      );

      return p;
    },
    [appendMessage],
  );

  const appendTranscript = useCallback(
    (entry) => {
      const meta = entry?.meta || {};
      const phase = meta.phase;

      if (phase === "call") return;
      if (phase === "cancelled") return;

      const tool = meta.toolName || "tool";
      const id = pendingConsentRef.current?.id || "";

      if (phase === "result") {
        const body = String(entry?.content || "");
        appendMessage(
          "system",
          formatToolLine({ tool, status: "ok", id, detail: "" }) +
            (body ? `\n\n${body}` : ""),
        );
        return;
      }

      if (phase === "error") {
        const detail = String(entry?.content || "");
        appendMessage(
          "system",
          formatToolLine({ tool, status: "error", id, detail }),
        );
        return;
      }

      appendMessage("system", String(entry?.content || ""));
    },
    [appendMessage],
  );

  const invokeTool = useCallback(async (toolName, args) => {
    return await runToolHandler(toolName, args);
  }, []);

  const runTool = useCallback(
    async ({ toolName, args }) => {
      const res = await runToolCall({
        toolCall: { name: toolName, args },
        appendTranscript,
        requestConsent,
        invokeTool: async (toolName2, args2) => {
          try {
            return await invokeTool(toolName2, args2);
          } catch (err) {
            const msg = formatTauriError ? formatTauriError(err) : String(err);
            throw new Error(msg);
          }
        },
        isConsentRequired: () => true,
      });

      return res;
    },
    [appendTranscript, requestConsent, invokeTool, formatTauriError],
  );

  // Model-initiated tool detection: scan assistant messages.
  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) return;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role !== "assistant") continue;

      const content = getMsgText(msg);
      if (!content) continue;

      const msgKey = String(msg?.id ?? msg?.ts ?? i);

      // A) XML tool calls
      const xmlCalls = extractXmlToolCalls(content);
      if (xmlCalls.length) {
        for (const c of xmlCalls) {
          const args = { ...(c.args || {}) };

          if (c.name === "search_in_file") {
            if (!args.path && activeTab?.path) args.path = activeTab.path;

            const q = String(args.query || "").trim();
            if (!q) {
              appendMessage(
                "system",
                "[tool] ⚠️ search_in_file ignored: missing required arg: query",
              );
              continue;
            }
            if (!args.path) {
              appendMessage(
                "system",
                "[tool] ⚠️ search_in_file ignored: no active file and no path provided",
              );
              continue;
            }
          }

          const tiny = hashString(`${c.name}|${JSON.stringify(args)}`);
          const key = `mtool:xml:${msgKey}:${tiny}`;

          if (
            GLOBAL_SEEN_TOOL_KEYS.has(key) ||
            processedKeysRef.current.has(key)
          )
            continue;

          GLOBAL_SEEN_TOOL_KEYS.add(key);
          processedKeysRef.current.add(key);
          runTool({ toolName: c.name, args });
          return;
        }
      }

      // B) Fenced blocks
      if (content.includes("```")) {
        const blocks = extractFencedBlocks(content);
        for (const b of blocks) {
          const parsed = safeParseToolRequestJson(b.payload);
          if (!parsed) continue;

          const args = { ...(parsed.args || {}) };

          if (parsed.name === "search_in_file") {
            if (!args.path && activeTab?.path) args.path = activeTab.path;

            const q = String(args.query || "").trim();
            if (!q) {
              appendMessage(
                "system",
                "[tool] ⚠️ search_in_file ignored: missing required arg: query",
              );
              continue;
            }
            if (!args.path) {
              appendMessage(
                "system",
                "[tool] ⚠️ search_in_file ignored: no active file and no path provided",
              );
              continue;
            }
          }

          const tiny = hashString(`${parsed.name}|${b.payload}`);
          const key = `mtool:fence:${msgKey}:${tiny}`;

          if (
            GLOBAL_SEEN_TOOL_KEYS.has(key) ||
            processedKeysRef.current.has(key)
          )
            continue;

          GLOBAL_SEEN_TOOL_KEYS.add(key);
          processedKeysRef.current.add(key);
          runTool({ toolName: parsed.name, args });
          return;
        }
      }

      // C) Bare JSON
      const bare = tryParseBareToolJson(content);
      if (bare) {
        const args = { ...(bare.args || {}) };

        if (bare.name === "search_in_file") {
          if (!args.path && activeTab?.path) args.path = activeTab.path;

          const q = String(args.query || "").trim();
          if (!q) {
            appendMessage(
              "system",
              "[tool] ⚠️ search_in_file ignored: missing required arg: query",
            );
            return;
          }
          if (!args.path) {
            appendMessage(
              "system",
              "[tool] ⚠️ search_in_file ignored: no active file and no path provided",
            );
            return;
          }
        }

        const tiny = hashString(`${bare.name}|${content.trim()}`);
        const key = `mtool:bare:${msgKey}:${tiny}`;

        if (GLOBAL_SEEN_TOOL_KEYS.has(key) || processedKeysRef.current.has(key))
          return;

        GLOBAL_SEEN_TOOL_KEYS.add(key);
        processedKeysRef.current.add(key);
        runTool({ toolName: bare.name, args });
        return;
      }
    }
  }, [messages, activeTab, appendMessage, runTool]);

  const handleRequestToolOk = useCallback(() => {
    if (!activeTab?.path) {
      appendMessage(
        "system",
        "[tool] 🛡 Tool request blocked — open a file first, then click Tool: OK.",
      );
      return;
    }
    runTool({ toolName: "read_file", args: { path: activeTab.path } });
  }, [activeTab, appendMessage, runTool]);

  const handleRequestToolErr = useCallback(() => {
    if (!activeTab?.path) {
      appendMessage(
        "system",
        "[tool] 🛡 Tool request blocked — open a file first, then click Tool: Err.",
      );
      return;
    }
    const dir = dirnameOfPath(activeTab.path);
    runTool({ toolName: "list_dir", args: { path: dir } });
  }, [activeTab, appendMessage, runTool]);

  // Collapsed rail
  if (!aiPanelOpen) {
    return (
      <div className="w-10 border-l border-zinc-800 min-h-0 flex flex-col items-center justify-start py-2">
        <button
          className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs"
          onClick={() => setAiPanelOpen(true)}
          title="Show AI panel (Ctrl/Cmd+J)"
          type="button"
        >
          AI
        </button>

        <button
          className="mt-2 w-8 h-8 rounded bg-transparent border border-zinc-800 hover:bg-zinc-900 flex items-center justify-center"
          onClick={() => openSettings(null, "Opened from collapsed rail")}
          title="Settings"
          type="button"
        >
          <GearIcon className="w-4 h-4 text-zinc-200" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${aiPanelWidthClass} border-l border-zinc-800 min-h-0 h-full flex flex-col`}
    >
      {/* AI header: GPT-clean control */}
      <div className="p-3 border-b border-zinc-800 sticky top-0 z-30 bg-zinc-950">
        <div className="flex items-center justify-between gap-2">
          <ProviderMenuButton
            provider={aiProvider}
            model={aiModelStr || "(none)"}
            configured={providerReady}
            advancedOpen={advancedOpen}
            onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
            onChangeProviderModel={() => setModelPickerOpen(true)}
            onConfigure={() =>
              openSettings(aiProvider, "Configure in Settings")
            }
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs text-zinc-400 hover:text-zinc-200"
              onClick={() => setShowTranscript((v) => !v)}
              title={
                showTranscript ? "Return to chat view" : "Open full transcript"
              }
            >
              {showTranscript ? "Back to Chat" : "View Transcript"}
            </button>

            <button
              className={iconButtonClass(false)}
              onClick={() => setAiPanelOpen(false)}
              title="Hide AI panel"
              type="button"
            >
              <span className="text-sm opacity-80">✕</span>
            </button>
          </div>
        </div>

        {providerSwitchNote ? (
          <div className="mt-2 text-xs border border-zinc-800 rounded p-2 bg-zinc-900/20 flex items-start justify-between gap-2">
            <div className="opacity-80 leading-snug">{providerSwitchNote}</div>
            <button
              className={buttonClass("ghost")}
              onClick={handleDismissSwitchNote}
              type="button"
              title="Dismiss"
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </div>

      {/* MAIN AREA */}
      {isFocusLayout ? (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Top content area (no page scrolling) */}
          <div className="flex-1 min-h-0 overflow-hidden p-3 flex flex-col gap-2">
            {/* Patch preview stays above chat when present */}
            {patchPreviewVisible || patchPreview ? (
              <div className="shrink-0">
                <PatchPreviewPanel
                  patchPreview={patchPreview}
                  patchPreviewVisible={patchPreviewVisible}
                  setPatchPreviewVisible={setPatchPreviewVisible}
                  copyPatchToClipboard={copyPatchToClipboard}
                  discardPatchPreview={discardPatchPreview}
                  buttonClass={buttonClass}
                />
              </div>
            ) : null}

            {/* Advanced panels only when toggled */}
            {advancedOpen ? (
              <div className="shrink-0 space-y-4">
                <SystemPanel
                  aiSystem={aiSystem}
                  setAiSystem={setAiSystem}
                  providerReady={providerReady}
                />

                <ParametersPanel
                  aiTemperature={aiTemperature}
                  setAiTemperature={setAiTemperature}
                  aiMaxTokens={aiMaxTokens}
                  setAiMaxTokens={setAiMaxTokens}
                  providerReady={providerReady}
                />

                <OutputPanel aiOutput={aiOutput} />

                {aiProvider === "ollama" && (
                  <OllamaHelperPanel
                    aiRunning={aiRunning}
                    endpoints={endpoints}
                    invoke={invoke}
                    setAiTestOutput={setAiTestOutput}
                    setRuntimeReachable={setRuntimeReachable}
                    formatTauriError={formatTauriError}
                    buttonClass={buttonClass}
                  />
                )}
              </div>
            ) : null}

            {/* CHAT / TRANSCRIPT AREA */}
            <div className="flex-1 min-h-0 overflow-hidden rounded border border-zinc-800/60 bg-zinc-950/30">
              <div className="h-full min-h-0 overflow-y-auto p-3">
                {showTranscript ? (
                  <TranscriptPanel
                    messages={messages}
                    TranscriptBubble={TranscriptBubble}
                    transcriptBottomRef={transcriptBottomRef}
                    CHAT_CONTEXT_TURNS={CHAT_CONTEXT_TURNS}
                    lastSend={lastSend}
                    aiRunning={aiRunning}
                    handleRetryLast={handleRetryLast}
                    clearConversation={clearConversation}
                    onRequestToolOk={handleRequestToolOk}
                    onRequestToolErr={handleRequestToolErr}
                    showDevTools={isDevBuild && devToolsEnabled && advancedOpen}
                    hideChrome={false}
                  />
                ) : (
                  <>
                    {/* GPT-clean chat view: user + assistant only */}
                    {messages
                      .filter(
                        (m) => m?.role === "user" || m?.role === "assistant",
                      )
                      .map((m, i) => (
                        <TranscriptBubble key={m.id || i} message={m} msg={m} />
                      ))}
                    <div ref={transcriptBottomRef} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Prompt pinned (BIG GUNS): sticky bottom to survive parent scroll/overflow quirks */}
          <div className="sticky bottom-0 z-20 shrink-0 border-t border-zinc-800 p-3 space-y-3 bg-zinc-950">
            <PromptPanel
              activeTab={activeTab}
              handleUseActiveFileAsPrompt={handleUseActiveFileAsPrompt}
              includeActiveFile={includeActiveFile}
              setIncludeActiveFile={setIncludeActiveFile}
              activeFileChip={activeFileChip}
              askForPatch={askForPatch}
              setAskForPatch={setAskForPatch}
              patchPreview={patchPreview}
              patchPreviewVisible={patchPreviewVisible}
              copyPatchToClipboard={copyPatchToClipboard}
              setPatchPreviewVisible={setPatchPreviewVisible}
              discardPatchPreview={discardPatchPreview}
              aiPrompt={aiPrompt}
              setAiPrompt={setAiPrompt}
              handlePromptKeyDown={handlePromptKeyDown}
              providerReady={providerReady}
              appendMessage={appendMessage}
              buttonClass={buttonClass}
              advancedOpen={advancedOpen}
            />

            <ActionsPanel
              providerReady={providerReady}
              aiRunning={aiRunning}
              handleSendChat={handleSendChat}
              handleAiTest={handleAiTest}
              guardrailText={guardrailText}
              openSettings={openSettings}
              aiProvider={aiProvider}
              buttonClass={buttonClass}
              showTest={true}
              showGuardrail={advancedOpen}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-3 space-y-4">
          {/* Classic / non-focus layout keeps provider controls inline */}
          <ProviderControlsPanel
            providerOptions={providerOptions}
            handleProviderChange={handleProviderChange}
            providerStatus={providerStatus}
            disabledProviderMessage={disabledProviderMessage}
            aiProvider={aiProvider}
            providerReady={providerReady}
            openSettings={openSettings}
            aiModel={aiModel}
            setAiModel={setAiModel}
            modelPlaceholder={modelPlaceholder}
            modelSuggestions={modelSuggestions}
            showModelHelper={showModelHelper}
            modelHelperText={modelHelperText}
            aiEndpoint={aiEndpoint}
            buttonClass={buttonClass}
          />

          <PatchPreviewPanel
            patchPreview={patchPreview}
            patchPreviewVisible={patchPreviewVisible}
            setPatchPreviewVisible={setPatchPreviewVisible}
            copyPatchToClipboard={copyPatchToClipboard}
            discardPatchPreview={discardPatchPreview}
            buttonClass={buttonClass}
          />

          <TranscriptPanel
            messages={messages}
            TranscriptBubble={TranscriptBubble}
            transcriptBottomRef={transcriptBottomRef}
            CHAT_CONTEXT_TURNS={CHAT_CONTEXT_TURNS}
            lastSend={lastSend}
            aiRunning={aiRunning}
            handleRetryLast={handleRetryLast}
            clearConversation={clearConversation}
            onRequestToolOk={handleRequestToolOk}
            onRequestToolErr={handleRequestToolErr}
            showDevTools={isDevBuild && devToolsEnabled && advancedOpen}
          />

          <PromptPanel
            activeTab={activeTab}
            handleUseActiveFileAsPrompt={handleUseActiveFileAsPrompt}
            includeActiveFile={includeActiveFile}
            setIncludeActiveFile={setIncludeActiveFile}
            activeFileChip={activeFileChip}
            askForPatch={askForPatch}
            setAskForPatch={setAskForPatch}
            patchPreview={patchPreview}
            patchPreviewVisible={patchPreviewVisible}
            copyPatchToClipboard={copyPatchToClipboard}
            setPatchPreviewVisible={setPatchPreviewVisible}
            discardPatchPreview={discardPatchPreview}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            handlePromptKeyDown={handlePromptKeyDown}
            providerReady={providerReady}
            appendMessage={appendMessage}
            buttonClass={buttonClass}
            advancedOpen={advancedOpen}
          />

          <ActionsPanel
            providerReady={providerReady}
            aiRunning={aiRunning}
            handleSendChat={handleSendChat}
            handleAiTest={handleAiTest}
            guardrailText={guardrailText}
            openSettings={openSettings}
            aiProvider={aiProvider}
            buttonClass={buttonClass}
            showTest={true}
            showGuardrail={advancedOpen}
          />

          {advancedOpen ? (
            <div className="space-y-4">
              <SystemPanel
                aiSystem={aiSystem}
                setAiSystem={setAiSystem}
                providerReady={providerReady}
              />

              <ParametersPanel
                aiTemperature={aiTemperature}
                setAiTemperature={setAiTemperature}
                aiMaxTokens={aiMaxTokens}
                setAiMaxTokens={setAiMaxTokens}
                providerReady={providerReady}
              />

              <OutputPanel aiOutput={aiOutput} />

              {aiProvider === "ollama" && (
                <OllamaHelperPanel
                  aiRunning={aiRunning}
                  endpoints={endpoints}
                  invoke={invoke}
                  setAiTestOutput={setAiTestOutput}
                  setRuntimeReachable={setRuntimeReachable}
                  formatTauriError={formatTauriError}
                  buttonClass={buttonClass}
                />
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Change Provider/Model modal */}
      {modelPickerOpen ? (
        <div className="fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setModelPickerOpen(false)}
          />
          <div
            className="absolute left-1/2 top-1/2 w-[min(820px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div className="text-sm font-semibold text-zinc-100">
                Change Provider/Model
              </div>
              <button
                type="button"
                onClick={() => setModelPickerOpen(false)}
                className="text-[11px] px-2 py-0.5 rounded border border-zinc-800 hover:bg-zinc-900"
                title="Close"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <ProviderControlsPanel
                providerOptions={providerOptions}
                handleProviderChange={handleProviderChange}
                providerStatus={providerStatus}
                disabledProviderMessage={disabledProviderMessage}
                aiProvider={aiProvider}
                providerReady={providerReady}
                openSettings={openSettings}
                aiModel={aiModel}
                setAiModel={setAiModel}
                modelPlaceholder={modelPlaceholder}
                modelSuggestions={modelSuggestions}
                showModelHelper={showModelHelper}
                modelHelperText={modelHelperText}
                aiEndpoint={aiEndpoint}
                buttonClass={buttonClass}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
