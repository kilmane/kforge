// src/ai/panel/SystemPanel.jsx
import React from "react";

export default function SystemPanel({ aiSystem, setAiSystem, providerReady }) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide opacity-60">System (optional)</div>
      <textarea
        className={[
          "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
          "min-h-[70px]",
          !providerReady ? "opacity-60 cursor-not-allowed" : ""
        ].join(" ")}
        value={aiSystem}
        onChange={(e) => setAiSystem(e.target.value)}
        placeholder="Optional system instruction…"
        disabled={!providerReady}
      />
    </div>
  );
}
