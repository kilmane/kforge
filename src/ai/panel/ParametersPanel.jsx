// src/ai/panel/ParametersPanel.jsx
import React from "react";

export default function ParametersPanel({
  aiTemperature,
  setAiTemperature,
  aiMaxTokens,
  setAiMaxTokens,
  disabled = false,
  title = "Expert model controls",
}) {
  const handleTemperatureChange = (event) => {
    const raw = String(event.target.value ?? "").trim();

    if (raw === "") {
      setAiTemperature(0);
      return;
    }

    const next = Number(raw);
    if (!Number.isFinite(next)) return;

    setAiTemperature(next);
  };

  const handleMaxTokensChange = (event) => {
    const raw = String(event.target.value ?? "").trim();

    if (raw === "") {
      setAiMaxTokens("");
      return;
    }

    const digitsOnly = raw.replace(/[^\d]/g, "");
    if (digitsOnly === "") {
      setAiMaxTokens("");
      return;
    }

    const normalized = String(parseInt(digitsOnly, 10));
    setAiMaxTokens(normalized === "NaN" ? "" : Number(normalized));
  };

  const handleMaxTokensBlur = () => {
    const next = Number(aiMaxTokens);

    if (!Number.isFinite(next) || next < 1) {
      setAiMaxTokens(4000);
      return;
    }

    setAiMaxTokens(Math.max(1, Math.floor(next)));
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs opacity-60 mt-1 leading-snug">
          Optional generation controls for experienced users. The defaults are
          suitable for normal KForge use.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <div className="text-xs opacity-70 mb-1">Temperature</div>
          <input
            className={[
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
              disabled ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={aiTemperature}
            onChange={handleTemperatureChange}
            disabled={disabled}
          />
        </label>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Max tokens</div>
          <input
            className={[
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
              disabled ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
            type="number"
            step="100"
            min="1"
            value={aiMaxTokens}
            onChange={handleMaxTokensChange}
            onBlur={handleMaxTokensBlur}
            disabled={disabled}
          />
        </label>
      </div>
    </div>
  );
}
