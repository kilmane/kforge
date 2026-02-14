// src/ai/panel/PromptPanel.jsx
import React from "react";

export default function PromptPanel({
  // prompt header + actions
  activeTab,
  handleUseActiveFileAsPrompt,

  // include active file
  includeActiveFile,
  setIncludeActiveFile,
  activeFileChip,

  // ask for patch
  askForPatch,
  setAskForPatch,

  // preview controls (still owned by App)
  patchPreview,
  patchPreviewVisible,
  copyPatchToClipboard,
  setPatchPreviewVisible,
  discardPatchPreview,

  // prompt box
  aiPrompt,
  setAiPrompt,
  handlePromptKeyDown,

  // gating + helpers
  providerReady,
  appendMessage,

  // UI helpers
  buttonClass,

  // NEW: whether advanced settings are shown
  advancedOpen = false,
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wide opacity-60">Prompt</div>

        <div className="flex items-center gap-2">
          <button
            className={buttonClass("ghost", !activeTab || !providerReady)}
            onClick={handleUseActiveFileAsPrompt}
            disabled={!activeTab || !providerReady}
            title="Copy the current file into the prompt box"
            type="button"
          >
            Use current file
          </button>
        </div>
      </div>

      {/* Advanced-only controls */}
      {advancedOpen ? (
        <div className="space-y-2">
          {/* Send current file toggle */}
          <div className="flex items-center justify-between gap-2 border border-zinc-800 rounded p-2 bg-zinc-900/20">
            <label
              className={[
                "flex items-center gap-2 text-xs",
                !activeTab || !providerReady
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer",
              ].join(" ")}
              title={
                activeTab
                  ? "Also send the current file with your prompt"
                  : "Open a file to use this"
              }
            >
              <input
                type="checkbox"
                className="accent-zinc-200"
                checked={includeActiveFile}
                disabled={!activeTab || !providerReady}
                onChange={(e) => {
                  const next = e.target.checked;

                  if (next && !activeTab) {
                    appendMessage?.(
                      "system",
                      "Open a file first, then you can send it with your prompt.",
                    );
                    setIncludeActiveFile(false);
                    return;
                  }

                  setIncludeActiveFile(next);
                }}
              />
              <span className="opacity-80">Send current file with prompt</span>
            </label>

            <div className="flex items-center gap-2 min-w-0">
              {activeFileChip}

              {includeActiveFile && activeTab?.path ? (
                <button
                  className={buttonClass("ghost")}
                  onClick={() => setIncludeActiveFile(false)}
                  type="button"
                  title="Turn off sending the current file"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          {/* Suggest edits toggle */}
          <div className="flex items-center justify-between gap-2 border border-zinc-800 rounded p-2 bg-zinc-900/20">
            <label
              className={[
                "flex items-center gap-2 text-xs",
                !providerReady
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer",
              ].join(" ")}
              title="If on, the assistant will suggest edits as a preview first"
            >
              <input
                type="checkbox"
                className="accent-zinc-200"
                checked={askForPatch}
                disabled={!providerReady}
                onChange={(e) => setAskForPatch(e.target.checked)}
              />
              <span className="opacity-80">Suggest edits (preview)</span>
            </label>

            {patchPreview ? (
              <div className="flex items-center gap-2">
                <button
                  className={buttonClass("ghost")}
                  onClick={copyPatchToClipboard}
                  type="button"
                  title="Copy the suggested edits"
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
                  title="Discard the suggested edits"
                >
                  Discard
                </button>
              </div>
            ) : (
              <div className="text-[11px] opacity-60">
                If the assistant suggests edits, you’ll see a preview here.
              </div>
            )}
          </div>

          <div className="text-[11px] opacity-60 leading-snug">
            Tip: turn on{" "}
            <span className="opacity-90">Suggest edits (preview)</span> if you
            want to review changes before applying them.
          </div>

          {!activeTab ? (
            <div className="text-xs opacity-60">
              Open a file to use{" "}
              <span className="opacity-90">Send current file with prompt</span>.
            </div>
          ) : null}
        </div>
      ) : null}

      <textarea
        className={[
          "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
          "min-h-[120px]",
          !providerReady ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
        onKeyDown={handlePromptKeyDown}
        placeholder="Type your prompt… (Enter to send, Shift+Enter for newline)"
        disabled={!providerReady}
      />
    </div>
  );
}
