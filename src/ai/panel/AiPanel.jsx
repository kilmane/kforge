// src/ai/panel/AiPanel.jsx
import React from "react";
import PatchPreviewPanel from "./PatchPreviewPanel.jsx";
import TranscriptPanel from "./TranscriptPanel.jsx";

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

        {/* Always-visible, non-blocking hint + route */}
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

        {/* Provider switch note (ephemeral) */}
        {providerSwitchNote && (
          <div className="text-xs border border-zinc-800 rounded p-2 bg-zinc-900/20 flex items-start justify-between gap-2">
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
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* Provider + model */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide opacity-60">Provider</div>
            <button
              className={buttonClass("ghost")}
              onClick={() => openSettings(aiProvider, "Configure in Settings")}
              type="button"
              title="Configure in Settings"
            >
              Configure in Settings
            </button>
          </div>

          <select
            className={
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            }
            value={aiProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
          >
            {providerOptions.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.enabled && p.id !== aiProvider}>
                {p.label}
                {p.suffix}
              </option>
            ))}
          </select>

          {!providerReady && (
            <div className="text-xs opacity-60">
              Providers are disabled until configured. Use{" "}
              <span className="opacity-90">Configure in Settings</span> to add an API key (and an
              endpoint where required).
            </div>
          )}

          {!providerReady && (
            <div className="text-xs opacity-70 border border-zinc-800 rounded p-2 bg-zinc-900/40 flex items-center justify-between gap-2">
              <div className="leading-snug">{disabledProviderMessage(providerStatus)}</div>
              <button
                className={buttonClass("ghost")}
                onClick={() => openSettings(aiProvider, "Configure in Settings")}
                type="button"
              >
                Configure in Settings
              </button>
            </div>
          )}

          <div className="text-xs uppercase tracking-wide opacity-60 mt-3">Model</div>
          <input
            className={[
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
              !providerReady ? "opacity-60 cursor-not-allowed" : ""
            ].join(" ")}
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            placeholder={modelPlaceholder(aiProvider)}
            list={`model-suggestions-${aiProvider}`}
            disabled={!providerReady}
          />

          <datalist id={`model-suggestions-${aiProvider}`}>
            {modelSuggestions.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>

          {showModelHelper && (
            <div className="text-xs opacity-60">
              {modelHelperText(aiProvider) ||
                "Select a preset or enter a model ID. Some providers require manual model IDs."}
            </div>
          )}
        </div>

        {/* Patch Preview (read-only) */}
        <PatchPreviewPanel
          patchPreview={patchPreview}
          patchPreviewVisible={patchPreviewVisible}
          setPatchPreviewVisible={setPatchPreviewVisible}
          copyPatchToClipboard={copyPatchToClipboard}
          discardPatchPreview={discardPatchPreview}
          buttonClass={buttonClass}
        />

        {/* Transcript */}
        <TranscriptPanel
          messages={messages}
          TranscriptBubble={TranscriptBubble}
          transcriptBottomRef={transcriptBottomRef}
          CHAT_CONTEXT_TURNS={CHAT_CONTEXT_TURNS}
          lastSend={lastSend}
          aiRunning={aiRunning}
          handleRetryLast={handleRetryLast}
          clearConversation={clearConversation}
          buttonClass={buttonClass}
        />

        {/* Prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-wide opacity-60">Prompt</div>

            <div className="flex items-center gap-2">
              <button
                className={buttonClass("ghost", !activeTab || !providerReady)}
                onClick={handleUseActiveFileAsPrompt}
                disabled={!activeTab || !providerReady}
                title="Copy active editor content into the prompt box"
              >
                Use Active File
              </button>
            </div>
          </div>

          {/* Include active file toggle + indicator */}
          <div className="flex items-center justify-between gap-2 border border-zinc-800 rounded p-2 bg-zinc-900/20">
            <label
              className={[
                "flex items-center gap-2 text-xs",
                !activeTab || !providerReady ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              ].join(" ")}
              title={activeTab ? "Include active file in the next Send" : "Open a file to enable this"}
            >
              <input
                type="checkbox"
                className="accent-zinc-200"
                checked={includeActiveFile}
                disabled={!activeTab || !providerReady}
                onChange={(e) => {
                  const next = e.target.checked;

                  if (next && !activeTab) {
                    appendMessage?.("system", "Cannot include active file — no file is currently open.");
                    setIncludeActiveFile(false);
                    return;
                  }

                  setIncludeActiveFile(next);
                }}
              />
              <span className="opacity-80">Include active file</span>
            </label>

            <div className="flex items-center gap-2 min-w-0">
              {activeFileChip}

              {includeActiveFile && activeTab?.path ? (
                <button
                  className={buttonClass("ghost")}
                  onClick={() => setIncludeActiveFile(false)}
                  type="button"
                  title="Turn off active file inclusion"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          {/* Ask for patch toggle */}
          <div className="flex items-center justify-between gap-2 border border-zinc-800 rounded p-2 bg-zinc-900/20">
            <label
              className={[
                "flex items-center gap-2 text-xs",
                !providerReady ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              ].join(" ")}
              title="Ask the assistant to respond with a unified diff (read-only preview)"
            >
              <input
                type="checkbox"
                className="accent-zinc-200"
                checked={askForPatch}
                disabled={!providerReady}
                onChange={(e) => setAskForPatch(e.target.checked)}
              />
              <span className="opacity-80">Ask for patch (read-only preview)</span>
            </label>

            {patchPreview ? (
              <div className="flex items-center gap-2">
                <button
                  className={buttonClass("ghost")}
                  onClick={copyPatchToClipboard}
                  type="button"
                  title="Copy current patch"
                >
                  Copy
                </button>
                <button
                  className={buttonClass("ghost")}
                  onClick={() => setPatchPreviewVisible((v) => !v)}
                  type="button"
                  title={patchPreviewVisible ? "Hide preview" : "Show preview"}
                >
                  {patchPreviewVisible ? "Hide" : "Show"}
                </button>
                <button
                  className={buttonClass("danger")}
                  onClick={discardPatchPreview}
                  type="button"
                  title="Discard preview"
                >
                  Discard
                </button>
              </div>
            ) : (
              <div className="text-[11px] opacity-60">(Preview appears when the assistant returns a diff.)</div>
            )}
          </div>

          <div className="text-[11px] opacity-60 leading-snug">
            When enabled, the assistant is prompted to return a unified diff inside a{" "}
            <span className="opacity-90">```diff```</span> block. The preview is read-only (no apply).
          </div>

          {!activeTab && (
            <div className="text-xs opacity-60">
              Open a file to enable <span className="opacity-90">Include active file</span>.
            </div>
          )}

          <textarea
            className={[
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
              "min-h-[120px]",
              !providerReady ? "opacity-60 cursor-not-allowed" : ""
            ].join(" ")}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={handlePromptKeyDown}
            placeholder="Type your prompt… (Enter to send, Shift+Enter for newline)"
            disabled={!providerReady}
          />
        </div>

        {/* System (optional) */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide opacity-60">System (optional)</div>
          <textarea
            className={[
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
              "min-h-[70px]",
              !providerReady ? "opacity-60 cursor-not-allowed" : ""
            ].join(" ")}
            value={aiSystem}
            onChange={(e) => setAiSystem(e.target.value)}
            placeholder="Optional system instruction…"
            disabled={!providerReady}
          />
        </div>

        {/* Parameters */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide opacity-60">Parameters</div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs opacity-60 mb-1">Temperature</div>
              <input
                className={[
                  "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
                  !providerReady ? "opacity-60 cursor-not-allowed" : ""
                ].join(" ")}
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={aiTemperature}
                onChange={(e) => setAiTemperature(Number(e.target.value))}
                disabled={!providerReady}
              />
            </div>

            <div>
              <div className="text-xs opacity-60 mb-1">Max tokens</div>
              <input
                className={[
                  "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
                  !providerReady ? "opacity-60 cursor-not-allowed" : ""
                ].join(" ")}
                type="number"
                step="1"
                min="1"
                value={aiMaxTokens}
                onChange={(e) => setAiMaxTokens(Number(e.target.value))}
                disabled={!providerReady}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              className={buttonClass("primary", !providerReady || aiRunning)}
              onClick={handleSendChat}
              disabled={!providerReady || aiRunning}
            >
              {aiRunning ? "Running..." : "Send"}
            </button>

            <button
              className={buttonClass("ghost", !providerReady || aiRunning)}
              onClick={handleAiTest}
              disabled={!providerReady || aiRunning}
            >
              Test
            </button>
          </div>

          {!providerReady && (
            <div className="text-xs opacity-70 border border-zinc-800 rounded p-2 bg-zinc-900/30 flex items-center justify-between gap-2">
              <div className="leading-snug">{guardrailText}</div>
              <button
                className={buttonClass("ghost")}
                onClick={() => openSettings(aiProvider, "Configure this provider to enable Send.")}
                type="button"
              >
                Configure
              </button>
            </div>
          )}
        </div>

        {/* Output (kept for now) */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide opacity-60">Output</div>
          <textarea
            className={
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 min-h-[160px]"
            }
            value={aiOutput}
            readOnly
            placeholder="Output will appear here…"
          />
        </div>

        {/* Ollama helper */}
        {aiProvider === "ollama" && (
          <div className="border border-zinc-800 rounded p-3 space-y-2">
            <div className="text-sm font-semibold">Ollama Helper</div>
            <div className="text-xs opacity-60">List local models using the Rust command.</div>
            <button
              className={buttonClass("ghost", aiRunning)}
              onClick={async () => {
                setAiTestOutput?.("Listing Ollama models...");
                try {
                  const ep = (endpoints?.ollama || "").trim();
                  const models = await invoke("ai_ollama_list_models", {
                    endpoint: ep ? ep : undefined
                  });
                  if (Array.isArray(models) && models.length > 0) {
                    setAiTestOutput?.(`Ollama models: ${models.join(", ")}`);
                  } else {
                    setAiTestOutput?.("Ollama models: (none found)");
                  }
                  setRuntimeReachable?.((prev) => ({ ...prev, ollama: true }));
                } catch (err) {
                  const msg = formatTauriError ? formatTauriError(err) : String(err);
                  setAiTestOutput?.(`Ollama list models failed: ${msg}`);
                  setRuntimeReachable?.((prev) => ({ ...prev, ollama: false }));
                }
              }}
              disabled={aiRunning}
              type="button"
            >
              List Models
            </button>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-zinc-800 text-xs opacity-60">
        Provider: <span className="opacity-90">{aiProvider}</span> • Model:{" "}
        <span className="opacity-90">{aiModel || "(none)"}</span>
      </div>
    </div>
  );
}
