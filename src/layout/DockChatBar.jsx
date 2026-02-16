import React from "react";

export default function DockChatBar({ expanded, onToggleExpand, disabled }) {
  return (
    <div className="border-t border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="text-xs text-zinc-500">
          {expanded ? "AI expanded" : "AI collapsed"}
        </div>

        <button
          type="button"
          onClick={onToggleExpand}
          disabled={disabled}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
          title={expanded ? "Collapse AI" : "Expand AI"}
        >
          {expanded ? "Collapse AI" : "Expand AI"}
        </button>
      </div>
    </div>
  );
}
