import React from "react";

export default function DockChatBar({
  value,
  onChange,
  onKeyDown,
  onSend,
  onToggleExpand, // kept for collapsed mode only (optional)
  expanded,
  disabled,
  lastMessagePreview,
}) {
  // Focus mode: no bottom composer, no arrow.
  if (expanded) return null;

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 text-zinc-100 px-3 py-2">
      <div className="text-xs opacity-70 px-1 pb-2 truncate">
        {lastMessagePreview ? lastMessagePreview : "No messages yet"}
      </div>

      <div className="flex items-center gap-2">
        {/* Optional: keep a small expand button for collapsed mode.
            If you truly want expand ONLY from top bar, delete this button. */}
        <button
          type="button"
          className="px-3 py-2 rounded border text-sm border-zinc-800 hover:bg-zinc-900"
          onClick={onToggleExpand}
          title="Expand AI"
        >
          ▲
        </button>

        <input
          className="flex-1 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          placeholder="Message KForge…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />

        <button
          type="button"
          className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-50"
          onClick={onSend}
          disabled={disabled || !String(value || "").trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
