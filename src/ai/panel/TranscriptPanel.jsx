// src/ai/panel/TranscriptPanel.jsx
import React from "react";

export default function TranscriptPanel({
  messages,
  TranscriptBubble,
  transcriptBottomRef,
  CHAT_CONTEXT_TURNS,
  lastSend,
  aiRunning,
  handleRetryLast,
  clearConversation,
  buttonClass
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide opacity-60">
          Transcript{" "}
          <span className="opacity-60 normal-case">(last {CHAT_CONTEXT_TURNS} used as context)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={buttonClass("ghost", !lastSend || aiRunning)}
            onClick={handleRetryLast}
            disabled={!lastSend || aiRunning}
            type="button"
            title="Retry last request"
          >
            Retry
          </button>
          <button
            className={buttonClass("danger", aiRunning)}
            onClick={clearConversation}
            disabled={aiRunning}
            type="button"
            title="Clear conversation"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="border border-zinc-800 rounded bg-zinc-950/30">
        <div className="h-[260px] overflow-auto p-2 space-y-2">
          {messages.length === 0 ? (
            <div className="text-xs opacity-60 p-2">
              No messages yet. Send a prompt to start a conversation.
            </div>
          ) : (
            messages.map((m) => (
              <TranscriptBubble
                key={m.id}
                role={m.role}
                content={m.content}
                ts={m.ts}
                actionLabel={m.actionLabel}
                onAction={m.action}
              />
            ))
          )}
          <div ref={transcriptBottomRef} />
        </div>
      </div>
    </div>
  );
}
