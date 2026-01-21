// src/ai/panel/AiPanel.jsx
import React, { useCallback } from "react";
import PatchPreviewPanel from "./PatchPreviewPanel.jsx";
import TranscriptPanel from "./TranscriptPanel.jsx";
import ProviderControlsPanel from "./ProviderControlsPanel.jsx";
import PromptPanel from "./PromptPanel.jsx";
import SystemPanel from "./SystemPanel.jsx";
import ParametersPanel from "./ParametersPanel.jsx";
import ActionsPanel from "./ActionsPanel.jsx";
import OutputPanel from "./OutputPanel.jsx";
import OllamaHelperPanel from "./OllamaHelperPanel.jsx";

import { openFile, readFolderTree } from "../../lib/fs";

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

function summarizeText(text, maxChars = 700) {
  const s = String(text ?? "");
  if (s.length <= maxChars) return s;
  return `${s.slice(0, maxChars)}\n…(truncated)`;
}

function dirnameOfPath(p) {
  const raw = String(p || "");
  if (!raw.trim()) return "";

  const normalized = raw.replaceAll("\\", "/");

  // Handle "C:/" root-ish
  const m = normalized.match(/^([A-Za-z]:)\/?$/);
  if (m) return `${m[1]}/`;

  const parts = normalized.split("/").filter((x) => x.length > 0);

  // If it's something like "C:/foo/bar.txt"
  const drive = normalized.match(/^([A-Za-z]:)\//)?.[1] || "";

  if (parts.length <= 1) {
    return drive ? `${drive}/` : "/";
  }

  const dirParts = parts.slice(0, -1);
  const dir = dirParts.join("/");

  return drive ? `${drive}/${dirParts.slice(1).join("/")}` : `/${dir}`;
}

function basenameOfPath(p) {
  const raw = String(p || "");
  const normalized = raw.replaceAll("\\", "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || raw;
}

function isDirNode(node) {
  if (!node || typeof node !== "object") return false;
  if (node.type === "dir" || node.kind === "dir") return true;
  if (Array.isArray(node.children)) return true;
  return false;
}

function labelNode(node) {
  if (!node) return "(unknown)";
  if (typeof node === "string") return node;
  const name = node.name || basenameOfPath(node.path || "");
  return name || "(unnamed)";
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
  /**
   * Phase 3.6.3 — Real tools (consent-gated)
   * Tools implemented here:
   * - read_file(path)   -> openFile(path)
   * - list_dir(path)    -> readFolderTree(path) (top-level summary)
   */

  const requestToolConsent = useCallback(
    ({ tool, detail, onApprove }) => {
      const id = uidShort();

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
                onApprove?.(id);
              }
            },
            {
              label: "Cancel",
              onClick: () => {
                appendMessage("system", formatToolLine({ tool, status: "cancelled", id, detail: "User denied." }));
              }
            }
          ]
        }
      );
    },
    [appendMessage]
  );

  const doReadFile = useCallback(
    async ({ id, path }) => {
      const tool = "read_file";
      const filePath = String(path || "").trim();

      try {
        const content = await openFile(filePath);
        const text = String(content ?? "");
        const byteLen = new TextEncoder().encode(text).length;
        const preview = summarizeText(text, 700);

        appendMessage(
          "system",
          formatToolLine({ tool, status: "ok", id, detail: `Read ${byteLen} bytes (Path: ${filePath})` }) +
            `\n\n--- File preview ---\n${preview}`
        );
      } catch (err) {
        appendMessage(
          "system",
          formatToolLine({
            tool,
            status: "error",
            id,
            detail: formatTauriError ? formatTauriError(err) : String(err)
          })
        );
      }
    },
    [appendMessage, formatTauriError]
  );

  const doListDir = useCallback(
    async ({ id, dirPath }) => {
      const tool = "list_dir";
      const dp = String(dirPath || "").trim();

      try {
        const tree = await readFolderTree(dp);

        // readFolderTree likely returns an array of nodes; handle defensively.
        const nodes = Array.isArray(tree) ? tree.filter(Boolean) : [];

        const top = nodes.slice(0, 40).map((n) => {
          const kind = isDirNode(n) ? "dir" : "file";
          return `- [${kind}] ${labelNode(n)}`;
        });

        const dirs = nodes.filter((n) => isDirNode(n)).length;
        const files = Math.max(0, nodes.length - dirs);

        appendMessage(
          "system",
          formatToolLine({
            tool,
            status: "ok",
            id,
            detail: `Listed ${nodes.length} entries (dirs: ${dirs}, files: ${files}) (Path: ${dp})`
          }) +
            (top.length ? `\n\n--- Directory listing (top-level) ---\n${top.join("\n")}` : "\n\n(empty)")
        );
      } catch (err) {
        appendMessage(
          "system",
          formatToolLine({
            tool,
            status: "error",
            id,
            detail: formatTauriError ? formatTauriError(err) : String(err)
          })
        );
      }
    },
    [appendMessage, formatTauriError]
  );

  const handleRequestToolOk = useCallback(() => {
    // Real tool: read active file
    if (!activeTab?.path) {
      appendMessage("system", "[tool] 🛡 Tool request blocked — open a file first, then click Req OK.");
      return;
    }

    const p = activeTab.path;
    requestToolConsent({
      tool: "read_file",
      detail: `Read active file (Path: ${p})`,
      onApprove: (id) => {
        doReadFile({ id, path: p });
      }
    });
  }, [activeTab, appendMessage, requestToolConsent, doReadFile]);

  const handleRequestToolErr = useCallback(() => {
    // Next real tool: list directory of the active file
    if (!activeTab?.path) {
      appendMessage("system", "[tool] 🛡 Tool request blocked — open a file first, then click Req Err.");
      return;
    }

    const dir = dirnameOfPath(activeTab.path);
    requestToolConsent({
      tool: "list_dir",
      detail: `List directory of active file (Path: ${dir})`,
      onApprove: (id) => {
        doListDir({ id, dirPath: dir });
      }
    });
  }, [activeTab, appendMessage, requestToolConsent, doListDir]);

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
        <span className="opacity-90">{aiModel || "(none)"}</span>
      </div>
    </div>
  );
}
