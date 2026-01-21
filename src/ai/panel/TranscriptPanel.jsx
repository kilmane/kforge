// src/ai/panel/TranscriptPanel.jsx
import React, { useMemo } from "react";

export default function TranscriptPanel({
  messages,
  TranscriptBubble,
  transcriptBottomRef,

  // Existing controls (wherever you keep them)
  lastSend,
  aiRunning,
  handleRetryLast,
  clearConversation,

  // Phase 3.6.2 (optional): if provided, we show Req OK / Req Err
  onRequestToolOk,
  onRequestToolErr
}) {
  const safeMessages = useMemo(() => (Array.isArray(messages) ? messages.filter(Boolean) : []), [messages]);

  const canRetry = !!lastSend && typeof handleRetryLast === "function" && !aiRunning;
  const canClear = typeof clearConversation === "function";

  const showReqButtons =
    typeof onRequestToolOk === "function" || typeof onRequestToolErr === "function";

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      {/* Header row: title left, actions right (restore old feel) */}
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide opacity-70">Transcript</div>

        <div className="flex items-center gap-2">
          {showReqButtons ? (
            <>
              <span className="text-[11px] opacity-60 border border-zinc-800 bg-zinc-900/40 px-2 py-0.5 rounded">
                Tools
              </span>

              {typeof onRequestToolOk === "function" ? (
                <button
                  className="px-3 py-1.5 rounded bg-transparent border border-zinc-800 hover:bg-zinc-900 text-sm"
                  type="button"
                  onClick={onRequestToolOk}
                  title="Request tool (consent) OK"
                >
                  Req OK
                </button>
              ) : null}

              {typeof onRequestToolErr === "function" ? (
                <button
                  className="px-3 py-1.5 rounded bg-transparent border border-zinc-800 hover:bg-zinc-900 text-sm"
                  type="button"
                  onClick={onRequestToolErr}
                  title="Request tool (consent) error"
                >
                  Req Err
                </button>
              ) : null}

              <span className="mx-1 h-5 w-px bg-zinc-800" aria-hidden="true" />
            </>
          ) : null}

          {typeof handleRetryLast === "function" ? (
            <button
              className={[
                "px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm",
                canRetry ? "" : "opacity-60 cursor-not-allowed"
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

      {/* Transcript list */}
      <div className="flex-1 min-h-0 overflow-auto pr-1 flex flex-col gap-2">
        {safeMessages.length === 0 ? (
          <div className="text-sm opacity-60">No messages yet.</div>
        ) : (
          safeMessages.map((m) => {
            const actions = Array.isArray(m.actions)
              ? m.actions.filter((a) => a && a.label && typeof a.onClick === "function")
              : [];

            return (
              <div key={m.id} className="flex flex-col gap-1">
                <TranscriptBubble
                  role={m.role}
                  content={m.content}
                  ts={m.ts}
                  actionLabel={m.actionLabel}
                  onAction={m.action}
                />

                {/* Phase 3.6.2: render multi-actions under the bubble */}
                {actions.length > 0 ? (
                  <div className="flex flex-wrap gap-2 ml-2">
                    {actions.map((a, idx) => (
                      <button
                        key={`${m.id}_${a.label}_${idx}`}
                        className="text-xs underline opacity-90 hover:opacity-100"
                        type="button"
                        onClick={a.onClick}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}

        <div ref={transcriptBottomRef} />
      </div>
    </div>
  );
}
