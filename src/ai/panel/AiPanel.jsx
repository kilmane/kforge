// src/ai/panel/AiPanel.jsx
import React, { useCallback, useEffect, useRef, useMemo } from "react";
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

function uidShort() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(-6);
}

function formatToolLine({ tool, status, id, detail }) {
  const t = String(tool || "tool").trim() || "tool";
  const i = String(id || "").trim();
  const d = String(detail || "").trim();

  let headline = "";
  if (status === "request") headline = `🛡 Tool request: ${t}${i ? ` (${i})` : ""}`;
  else if (status === "calling") headline = `🛠 Calling tool: ${t}${i ? ` (${i})` : ""}…`;
  else if (status === "ok") headline = `✅ Tool returned: ${t}${i ? ` (${i})` : ""}`;
  else if (status === "error") headline = `❌ Tool failed: ${t}${i ? ` (${i})` : ""}`;
  else if (status === "cancelled") headline = `🚫 Tool cancelled: ${t}${i ? ` (${i})` : ""}`;
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
const ALLOWED_MODEL_TOOLS = new Set(["read_file", "list_dir", "search_in_file"]);

function getMsgText(msg) {
  const v = msg?.content ?? msg?.text ?? msg?.message ?? msg?.body ?? "";
  return String(v || "");
}

function extractFencedBlocks(text) {
  if (!text || typeof text !== "string") return [];

  const blocks = [];

  // ```tool / ```tool_call
  const reTool = /```(?:tool|tool_call)\s*([\s\S]*?)```/g;
  let m;
  while ((m = reTool.exec(text)) !== null) {
    blocks.push({ payload: (m[1] || "").trim(), source: "tool_fence" });
  }

  // ```json blocks (some models put tool request JSON here)
  const reJson = /```json\s*([\s\S]*?)```/g;
  while ((m = reJson.exec(text)) !== null) {
    const payload = (m[1] || "").trim();
    if (payload.startsWith("{") && payload.endsWith("}")) {
      blocks.push({ payload, source: "json_fence" });
    }
  }

  return blocks;
}

function normalizeToolShape(obj) {
  if (!obj || typeof obj !== "object") return null;

  // Preferred:
  // { name: "tool", args: {...} }
  if (typeof obj.name === "string") return { name: obj.name, args: obj.args ?? {} };

  // Common alternates:
  // { tool: "toolName", input: {...} }
  if (typeof obj.tool === "string") return { name: obj.tool, args: obj.input ?? obj.args ?? {} };

  // { tool_name: "...", parameters: {...} }
  if (typeof obj.tool_name === "string") return { name: obj.tool_name, args: obj.parameters ?? obj.args ?? {} };

  // { function: "...", arguments: {...} }
  if (typeof obj.function === "string") return { name: obj.function, args: obj.arguments ?? obj.args ?? {} };

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
 *
 * Variant A (older):
 * <tool_call>
 *   <invoke name="search_in_file">
 *     <parameter name="query">function</parameter>
 *   </invoke>
 * </tool_call>
 *
 * Variant B (new DeepSeek-ish):
 * <tool_call>
 *   <function_name>search_in_file</function_name>
 *   <parameters>
 *     <search_term>toggle</search_term>
 *   </parameters>
 * </tool_call>
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

      const paramsMatch = s.match(/<parameters>\s*([\s\S]*?)\s*<\/parameters>/i);
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
          if (kLower === "search_term" || kLower === "term" || kLower === "search") key = "query";

          args[key] = val;
        }
      }

      calls.push({ name, args, source: "xml_function_name" });
    }
  }

  return calls;
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
  GearIcon
}) {
  // ✅ FIX: derive the current provider endpoint from endpoints map
  const aiEndpoint = (endpoints?.[aiProvider] || "").trim();

  // ✅ HARDEN: model can be string or {id,tier,note}; always display as string
  const aiModelStr = useMemo(() => {
    if (typeof aiModel === "string") return aiModel;
    if (aiModel && typeof aiModel === "object" && typeof aiModel.id === "string") return aiModel.id;
    return "";
  }, [aiModel]);

  // Holds the currently pending consent gate (one at a time).
  const pendingConsentRef = useRef(null);

  // Prevent double-execution if the same tool payload remains in transcript.
  const processedKeysRef = useRef(new Set());

  // Reset processed cache when conversation clears
  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) {
      processedKeysRef.current = new Set();
    }
  }, [messages]);

  const requestConsent = useCallback(
    async ({ toolName, args }) => {
      // If a prior consent is somehow still pending, cancel it to keep behavior deterministic.
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
        formatToolLine({ tool, status: "request", id, detail: detail || "Awaiting approval…" }),
        {
          actions: [
            {
              label: "Approve",
              onClick: () => {
                appendMessage(
                  "system",
                  formatToolLine({ tool, status: "calling", id, detail: "Approved by user — executing…" })
                );
                pendingConsentRef.current?.resolve?.("approved");
                pendingConsentRef.current = null;
              }
            },
            {
              label: "Cancel",
              onClick: () => {
                appendMessage("system", formatToolLine({ tool, status: "cancelled", id, detail: "User denied." }));
                pendingConsentRef.current?.resolve?.("cancelled");
                pendingConsentRef.current = null;
              }
            }
          ]
        }
      );

      return p;
    },
    [appendMessage]
  );

  const appendTranscript = useCallback(
    (entry) => {
      const meta = entry?.meta || {};
      const phase = meta.phase;

      // Ignore runtime "call" (we already show request + calling in our consent UI)
      if (phase === "call") return;

      // Ignore runtime "cancelled" (Cancel button already appends the cancelled bubble with id)
      if (phase === "cancelled") return;

      const tool = meta.toolName || "tool";
      const id = pendingConsentRef.current?.id || ""; // best-effort; may be empty if already cleared

      if (phase === "result") {
        const body = String(entry?.content || "");
        appendMessage("system", formatToolLine({ tool, status: "ok", id, detail: "" }) + (body ? `\n\n${body}` : ""));
        return;
      }

      if (phase === "error") {
        const detail = String(entry?.content || "");
        appendMessage("system", formatToolLine({ tool, status: "error", id, detail }));
        return;
      }

      // Fallback: pass through.
      appendMessage("system", String(entry?.content || ""));
    },
    [appendMessage]
  );

  const invokeTool = useCallback(async (toolName, args) => {
    return await runToolHandler(toolName, args);
  }, []);

  const runTool = useCallback(
    async ({ toolName, args }) => {
      const res = await runToolCall({
        toolCall: { name: toolName, args },
        appendTranscript,
        requestConsent: async ({ toolName, args }) => requestConsent({ toolName, args }),
        invokeTool: async (toolName2, args2) => {
          try {
            return await invokeTool(toolName2, args2);
          } catch (err) {
            const msg = formatTauriError ? formatTauriError(err) : String(err);
            throw new Error(msg);
          }
        },
        isConsentRequired: () => true
      });

      return res;
    },
    [appendTranscript, requestConsent, invokeTool, formatTauriError]
  );

  // Model-initiated tool detection: scan assistant + system messages.
  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) return;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role !== "assistant" && msg?.role !== "system") continue;

      const content = getMsgText(msg);
      if (!content) continue;

      // A) XML tool calls (two variants)
      const xmlCalls = extractXmlToolCalls(content);
      if (xmlCalls.length) {
        for (const c of xmlCalls) {
          const args = { ...(c.args || {}) };

          if (c.name === "search_in_file") {
            // infer current active file if missing
            if (!args.path && activeTab?.path) args.path = activeTab.path;

            // normalize missing query
            const q = String(args.query || "").trim();
            if (!q) {
              appendMessage("system", "[tool] ⚠️ search_in_file ignored: missing required arg: query");
              continue;
            }
            if (!args.path) {
              appendMessage("system", "[tool] ⚠️ search_in_file ignored: no active file and no path provided");
              continue;
            }
          }

          const key = `mtool:xml:${c.source}:${c.name}:${JSON.stringify(args)}`;
          if (processedKeysRef.current.has(key)) continue;

          processedKeysRef.current.add(key);
          runTool({ toolName: c.name, args });
          return;
        }
      }

      // B) Fenced blocks (```tool, ```tool_call, or ```json tool-shaped)
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
              appendMessage("system", "[tool] ⚠️ search_in_file ignored: missing required arg: query");
              continue;
            }
            if (!args.path) {
              appendMessage("system", "[tool] ⚠️ search_in_file ignored: no active file and no path provided");
              continue;
            }
          }

          const key = `mtool:fence:${b.source}:${b.payload}`;
          if (processedKeysRef.current.has(key)) continue;

          processedKeysRef.current.add(key);
          runTool({ toolName: parsed.name, args });
          return;
        }
      }

      // C) Bare JSON (whole message is JSON)
      const bare = tryParseBareToolJson(content);
      if (bare) {
        const args = { ...(bare.args || {}) };

        if (bare.name === "search_in_file") {
          if (!args.path && activeTab?.path) args.path = activeTab.path;

          const q = String(args.query || "").trim();
          if (!q) {
            appendMessage("system", "[tool] ⚠️ search_in_file ignored: missing required arg: query");
            return;
          }
          if (!args.path) {
            appendMessage("system", "[tool] ⚠️ search_in_file ignored: no active file and no path provided");
            return;
          }
        }

        const key = `mtool:bare:${content.trim()}`;
        if (processedKeysRef.current.has(key)) return;

        processedKeysRef.current.add(key);
        runTool({ toolName: bare.name, args });
        return;
      }
    }
  }, [messages, activeTab, appendMessage, runTool]);

  const handleRequestToolOk = useCallback(() => {
    if (!activeTab?.path) {
      appendMessage("system", "[tool] 🛡 Tool request blocked — open a file first, then click Req OK.");
      return;
    }
    runTool({ toolName: "read_file", args: { path: activeTab.path } });
  }, [activeTab, appendMessage, runTool]);

  const handleRequestToolErr = useCallback(() => {
    if (!activeTab?.path) {
      appendMessage("system", "[tool] 🛡 Tool request blocked — open a file first, then click Req Err.");
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
    <div className={`${aiPanelWidthClass} border-l border-zinc-800 min-h-0 flex flex-col`}>
      {/* AI header: status surface */}
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold flex items-center gap-2">
            <span>AI Panel</span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="text-[11px] px-2 py-0.5 rounded border whitespace-nowrap bg-zinc-900/40 border-zinc-800 text-zinc-200"
              title="Provider category"
            >
              {providerGroupLabel(providerMeta.group)}
            </div>

            <div className="text-xs opacity-70">
              {providerMeta.label}
              {providerReady ? "" : ` (${disabledExplainer})`}
            </div>

            <div
              className={[
                "text-[11px] px-2 py-0.5 rounded border whitespace-nowrap",
                statusChipClass(headerStatus.tone)
              ].join(" ")}
              title={providerMeta.id}
            >
              {headerStatus.label}
            </div>

            <button
              className={buttonClass("ghost")}
              onClick={() => setAiPanelWide((v) => !v)}
              type="button"
              title="Toggle panel width"
            >
              {aiPanelWide ? "Narrow" : "Wide"}
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

        <div className="text-xs opacity-70 border border-zinc-800 rounded p-2 bg-zinc-900/30 flex items-center justify-between gap-2">
          <div className="leading-snug">{showProviderSurfaceHint}</div>
          <button
            className={buttonClass("ghost")}
            onClick={() => openSettings(aiProvider, "Configure in Settings")}
            type="button"
            title="Configure this provider in Settings"
          >
            Configure
          </button>
        </div>

        {providerSwitchNote && (
          <div className="text-xs border border-zinc-800 rounded p-2 bg-zinc-900/20 flex items-start justify-between gap-2">
            <div className="opacity-80 leading-snug">{providerSwitchNote}</div>
            <button className={buttonClass("ghost")} onClick={handleDismissSwitchNote} type="button" title="Dismiss">
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
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
        />

        <SystemPanel aiSystem={aiSystem} setAiSystem={setAiSystem} providerReady={providerReady} />

        <ParametersPanel
          aiTemperature={aiTemperature}
          setAiTemperature={setAiTemperature}
          aiMaxTokens={aiMaxTokens}
          setAiMaxTokens={setAiMaxTokens}
          providerReady={providerReady}
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

      <div className="p-3 border-t border-zinc-800 text-xs opacity-60">
        Provider: <span className="opacity-90">{aiProvider}</span> • Model:{" "}
        <span className="opacity-90">{aiModelStr || "(none)"}</span>
      </div>
    </div>
  );
}
