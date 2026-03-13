// src/ai/panel/ParametersPanel.jsx
import React from "react";

export default function ParametersPanel({
  aiTemperature,
  setAiTemperature,
  aiMaxTokens,
  setAiMaxTokens,
  providerReady,
}) {
  const handleTemperatureChange = (e) => {
    const raw = String(e.target.value ?? "").trim();
    if (raw === "") {
      setAiTemperature(0);
      return;
    }

    const next = Number(raw);
    if (!Number.isFinite(next)) return;

    setAiTemperature(next);
  };

  const handleMaxTokensChange = (e) => {
    const raw = String(e.target.value ?? "").trim();

    // Allow clearing while editing without forcing weird values.
    if (raw === "") {
      setAiMaxTokens("");
      return;
    }

    // Digits only for a clean integer field.
    const digitsOnly = raw.replace(/[^\d]/g, "");
    if (digitsOnly === "") {
      setAiMaxTokens("");
      return;
    }

    // Normalize away leading zeros: "04000" -> 4000
    const normalized = String(parseInt(digitsOnly, 10));
    setAiMaxTokens(normalized === "NaN" ? "" : Number(normalized));
  };

  const handleMaxTokensBlur = () => {
    const n = Number(aiMaxTokens);
    if (!Number.isFinite(n) || n < 1) {
      setAiMaxTokens(4000);
      return;
    }
    setAiMaxTokens(Math.max(1, Math.floor(n)));
  };

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide opacity-60">
        Parameters
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs opacity-60 mb-1">Temperature</div>
          <input
            className={[
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
              !providerReady ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={aiTemperature}
            onChange={handleTemperatureChange}
            disabled={!providerReady}
          />
        </div>

        <div>
          <div className="text-xs opacity-60 mb-1">Max tokens</div>
          <input
            className={[
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
              !providerReady ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
            type="number"
            step="100"
            min="1"
            value={aiMaxTokens}
            onChange={handleMaxTokensChange}
            onBlur={handleMaxTokensBlur}
            disabled={!providerReady}
          />
        </div>
      </div>
    </div>
  );
}
