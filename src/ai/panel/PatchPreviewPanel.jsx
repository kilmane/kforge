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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60">
            Patch Preview (read-only)
          </div>
          <div className="text-[11px] opacity-50">
            Review-only suggested changes. Nothing is applied automatically.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
        <div className="overflow-hidden rounded border border-zinc-800 bg-zinc-950/40">
          <div className="max-h-[42vh] min-h-[180px] overflow-auto overscroll-contain p-3">
            <pre className="min-w-max text-[11px] leading-snug whitespace-pre font-mono text-zinc-100">
              {patchPreview}
            </pre>
          </div>
          <div className="border-t border-zinc-800 px-3 py-2 text-[11px] opacity-60">
            Patch Preview is read-only. Copy the patch if you want to review or apply it manually.
          </div>
        </div>
      ) : (
        <div className="rounded border border-zinc-800 bg-zinc-900/20 p-2 text-[11px] opacity-60">
          Preview hidden.
        </div>
      )}
    </div>
  );
}
