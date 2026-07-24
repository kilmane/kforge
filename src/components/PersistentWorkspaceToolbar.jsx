import React, { useEffect, useMemo, useRef, useState } from "react";
import { redactSensitiveText } from "../utils/clipboardText.js";

export default function PersistentWorkspaceToolbar({
  copyText = "",
  onClose,
  copyLabel = "Copy all",
  ariaLabel = "Output controls",
}) {
  const [copyStatus, setCopyStatus] = useState("idle");
  const resetTimerRef = useRef(null);
  const safeCopyText = useMemo(
    () => redactSensitiveText(String(copyText || "")),
    [copyText],
  );
  const canCopy = Boolean(safeCopyText.trim());

  useEffect(() => {
    setCopyStatus("idle");
  }, [safeCopyText]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function handleCopyAll() {
    if (!canCopy) return;

    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable");
      }

      await navigator.clipboard.writeText(safeCopyText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }

    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setCopyStatus("idle");
    }, 1800);
  }

  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-end gap-2"
      aria-label={ariaLabel}
      role="toolbar"
    >
      <button
        type="button"
        className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={handleCopyAll}
        disabled={!canCopy}
        title={canCopy ? "Copy all readable output" : "Nothing to copy"}
      >
        {copyStatus === "copied" ? "Copied" : copyLabel}
      </button>

      {copyStatus === "error" ? (
        <span className="text-xs text-red-300" role="status">
          Copy failed
        </span>
      ) : null}

      {typeof onClose === "function" ? (
        <button
          type="button"
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
          onClick={onClose}
        >
          Close
        </button>
      ) : null}
    </div>
  );
}
