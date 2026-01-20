// src/ai/panel/PatchPreviewPanel.jsx
import React from "react";

export default function PatchPreviewPanel({
  patchPreview,
  patchPreviewVisible,
  setPatchPreviewVisible,
  copyPatchToClipboard,
  discardPatchPreview,
  buttonClass
}) {
  if (!patchPreview) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wide opacity-60">
          Patch Preview (read-only)
        </div>

        <div className="flex items-center gap-2">
          <button
            className={buttonClass("ghost")}
            onClick={() => setPatchPreviewVisible((v) => !v)}
            type="button"
            title={patchPreviewVisible ? "Hide preview" : "Show preview"}
          >
            {patchPreviewVisible ? "Hide" : "Show"}
          </button>

          <button
            className={buttonClass("ghost")}
            onClick={copyPatchToClipboard}
            type="button"
            title="Copy patch to clipboard"
          >
            Copy patch
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
      </div>

      {patchPreviewVisible ? (
        <div className="border border-zinc-800 rounded bg-zinc-950/30">
          <div className="max-h-[220px] overflow-auto p-2">
            <pre className="text-[11px] leading-snug whitespace-pre text-zinc-100">
              {patchPreview}
            </pre>
          </div>
          <div className="px-2 pb-2 text-[11px] opacity-60">
            Preview only — nothing is applied automatically.
          </div>
        </div>
      ) : (
        <div className="text-[11px] opacity-60 border border-zinc-800 rounded p-2 bg-zinc-900/20">
          Preview hidden.
        </div>
      )}
    </div>
  );
}
