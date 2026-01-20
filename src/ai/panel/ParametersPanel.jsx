// src/ai/panel/ParametersPanel.jsx
import React from "react";

export default function ParametersPanel({
  aiTemperature,
  setAiTemperature,
  aiMaxTokens,
  setAiMaxTokens,
  providerReady
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide opacity-60">Parameters</div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs opacity-60 mb-1">Temperature</div>
          <input
            className={[
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
              !providerReady ? "opacity-60 cursor-not-allowed" : ""
            ].join(" ")}
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={aiTemperature}
            onChange={(e) => setAiTemperature(Number(e.target.value))}
            disabled={!providerReady}
          />
        </div>

        <div>
          <div className="text-xs opacity-60 mb-1">Max tokens</div>
          <input
            className={[
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
              !providerReady ? "opacity-60 cursor-not-allowed" : ""
            ].join(" ")}
            type="number"
            step="1"
            min="1"
            value={aiMaxTokens}
            onChange={(e) => setAiMaxTokens(Number(e.target.value))}
            disabled={!providerReady}
          />
        </div>
      </div>
    </div>
  );
}
