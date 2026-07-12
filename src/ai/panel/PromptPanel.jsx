// src/ai/panel/PromptPanel.jsx
import React from "react";

export default function PromptPanel({
  // include active file
  activeTab,
  includeActiveFile,
  setIncludeActiveFile,
  activeFileChip,

  // prompt box
  aiPrompt,
  setAiPrompt,
  handlePromptKeyDown,

  // gating + helpers
  providerReady,
  appendMessage,

  // UI helpers
  buttonClass,
}) {
  return (
    <div className="space-y-2">
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
              ? "Attach the current file to your prompt"
              : "Open a file to attach it"
          }
        >
          <input
            type="checkbox"
            className="accent-zinc-200"
            checked={includeActiveFile}
            disabled={!activeTab || !providerReady}
            onChange={(event) => {
              const next = event.target.checked;

              if (next && !activeTab) {
                appendMessage?.(
                  "system",
                  "Open a file first, then you can attach it to your prompt.",
                );
                setIncludeActiveFile(false);
                return;
              }

              setIncludeActiveFile(next);
            }}
          />

          <span className="opacity-80">Attach current file</span>
        </label>

        <div className="flex items-center gap-2 min-w-0">
          {activeFileChip}

          {includeActiveFile && activeTab?.path ? (
            <button
              className={buttonClass("ghost")}
              onClick={() => setIncludeActiveFile(false)}
              type="button"
              title="Stop attaching the current file"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <textarea
        className={[
          "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
          "min-h-[120px]",
          !providerReady ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
        value={aiPrompt}
        onChange={(event) => setAiPrompt(event.target.value)}
        onKeyDown={handlePromptKeyDown}
        placeholder="Type your prompt… (Enter to send, Shift+Enter for newline)"
        disabled={!providerReady}
      />
    </div>
  );
}
