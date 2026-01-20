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
  buttonClass
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
  );
}
