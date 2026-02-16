import React, { useMemo, useEffect } from "react";

function parseToolIdFromLine(text) {
  const s = String(text || "");
  if (!s.includes("[tool]")) return null;
  const m = s.match(/\(([^)]+)\)/);
  return m ? String(m[1] || "").trim() : null;
}

function toolLineKind(text) {
  const s = String(text || "");
  if (!s.startsWith("[tool]")) return null;

  if (s.includes("🛡 Tool request:")) return "request";
  if (s.includes("🛠 Calling tool:")) return "calling";
  if (s.includes("✅ Tool returned:")) return "ok";
  if (s.includes("❌ Tool failed:")) return "error";
  if (s.includes("🚫 Tool cancelled:")) return "cancelled";

  return "other";
}

function statusTextFor(kind) {
  if (kind === "calling" || kind === "ok") return "✅ Approved";
  if (kind === "cancelled") return "⛔ Cancelled";
  if (kind === "error") return "❌ Failed";
  return "✅ Done";
}

export default function TranscriptPanel({
  messages,
  TranscriptBubble,
  transcriptBottomRef,
  lastSend,
  aiRunning,
  handleRetryLast,
  clearConversation,
  onRequestToolOk,
  onRequestToolErr,
  showDevTools = false,
}) {
  const safeMessages = useMemo(
    () => (Array.isArray(messages) ? messages.filter(Boolean) : []),
    [messages],
  );

  const canRetry =
    !!lastSend && typeof handleRetryLast === "function" && !aiRunning;
  const canClear = typeof clearConversation === "function";

  const showReqButtons =
    showDevTools &&
    (typeof onRequestToolOk === "function" ||
      typeof onRequestToolErr === "function");

  // ✅ Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    transcriptBottomRef?.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [safeMessages.length, transcriptBottomRef]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide opacity-70">
          Transcript
        </div>

        <div className="flex items-center gap-2">
          {showReqButtons ? (
            <>
              <span className="text-[11px] opacity-70 border border-zinc-800 bg-zinc-900/40 px-2 py-0.5 rounded">
                Dev tools
              </span>

              {typeof onRequestToolOk === "function" ? (
                <button
                  className="px-3 py-1.5 rounded bg-transparent border border-zinc-800 hover:bg-zinc-900 text-sm"
                  type="button"
                  onClick={onRequestToolOk}
                >
                  Tool: OK
                </button>
              ) : null}

              {typeof onRequestToolErr === "function" ? (
                <button
                  className="px-3 py-1.5 rounded bg-transparent border border-zinc-800 hover:bg-zinc-900 text-sm"
                  type="button"
                  onClick={onRequestToolErr}
                >
                  Tool: Err
                </button>
              ) : null}

              <span className="mx-1 h-5 w-px bg-zinc-800" />
            </>
          ) : null}

          {typeof handleRetryLast === "function" ? (
            <button
              className={[
                "px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm",
                canRetry ? "" : "opacity-60 cursor-not-allowed",
              ].join(" ")}
              type="button"
              onClick={canRetry ? handleRetryLast : undefined}
              disabled={!canRetry}
              title={lastSend ? "Retry last request" : "Nothing to retry"}
            >
              Retry
            </button>
          ) : null}

          {canClear ? (
            <button
              className="px-3 py-1.5 rounded bg-transparent border border-zinc-800 hover:bg-zinc-900 text-sm"
              type="button"
              onClick={clearConversation}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {/* Scrollable transcript area only */}
      <div className="flex-1 min-h-0 overflow-auto pr-1 flex flex-col gap-2">
        {safeMessages.map((m) => (
          <div key={m.id} className="flex flex-col gap-1">
            <TranscriptBubble
              role={m.role}
              content={m.content}
              ts={m.ts}
              actionLabel={m.actionLabel}
              onAction={m.action}
            />
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={transcriptBottomRef} />
      </div>
    </div>
  );
}
