// src/ai/panel/OutputPanel.jsx
import React from "react";

export default function OutputPanel({ aiOutput }) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide opacity-60">Output</div>
      <textarea
        className={
          "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 min-h-[160px]"
        }
        value={aiOutput}
        readOnly
        placeholder="Output will appear here…"
      />
    </div>
  );
}
