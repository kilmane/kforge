// src/ai/panel/PatchPreviewPanel.jsx
import React from "react";

function looksLikeStandardFilePatch(text) {
  if (!text || typeof text !== "string") return false;

  const hasDiffGit = /^\s*diff --git\s+a\/.+\s+b\/.+/m.test(text);
  const hasOldFile = /^\s*---\s+(a\/.+|\/dev\/null|[^\s]+)/m.test(text);
  const hasNewFile = /^\s*\+\+\+\s+(b\/.+|\/dev\/null|[^\s]+)/m.test(text);
  const hasHunk = /^\s*@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@/m.test(text);

  return hasDiffGit || (hasOldFile && hasNewFile && hasHunk);
}

export default function PatchPreviewPanel({
  patchPreview,
  patchPreviewVisible,
  setPatchPreviewVisible,
  copyPatchToClipboard,
  discardPatchPreview,
  buttonClass
}) {
  if (!patchPreview) return null;

  const showPatchShapeWarning =
    patchPreviewVisible && !looksLikeStandardFilePatch(patchPreview);

  const footerMessage = showPatchShapeWarning
    ? "This preview may not be a standard file patch. Review carefully before copying or applying it manually."
    : "Review-only suggested changes. Nothing is applied automatically.";

  return (
    <div className="space-y-2">
      {patchPreviewVisible ? (
        <div className="overflow-hidden rounded border border-zinc-800 bg-zinc-950/40">
          <div className="max-h-[42vh] min-h-[180px] overflow-auto overscroll-contain p-3">
            <pre className="min-w-max text-[11px] leading-snug whitespace-pre font-mono text-zinc-100">
              {patchPreview}
            </pre>
          </div>

          <div className="flex flex-col gap-2 border-t border-zinc-800 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-[11px] leading-snug">
              <span className="mr-2 text-xs uppercase tracking-wide opacity-70">
                Patch Preview (read-only)
              </span>
              <span className={showPatchShapeWarning ? "text-yellow-200/90" : "opacity-60"}>
                {footerMessage}
              </span>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                className={buttonClass("ghost")}
                onClick={() => setPatchPreviewVisible(false)}
                type="button"
                title="Hide preview"
              >
                Hide
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
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded border border-zinc-800 bg-zinc-900/20 p-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-[11px] leading-snug">
            <span className="mr-2 text-xs uppercase tracking-wide opacity-70">
              Patch Preview (read-only)
            </span>
            <span className="opacity-60">Preview hidden.</span>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              className={buttonClass("ghost")}
              onClick={() => setPatchPreviewVisible(true)}
              type="button"
              title="Show preview"
            >
              Show
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
      )}
    </div>
  );
}
