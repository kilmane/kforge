// src/ai/panel/ProviderControlsPanel.jsx
import React from "react";

export default function ProviderControlsPanel({
  providerOptions,
  handleProviderChange,
  providerStatus,
  disabledProviderMessage,

  aiProvider,
  providerReady,
  openSettings,

  aiModel,
  setAiModel,
  modelPlaceholder,
  modelSuggestions,
  showModelHelper,
  modelHelperText,

  buttonClass
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide opacity-60">Provider</div>
        <button
          className={buttonClass("ghost")}
          onClick={() => openSettings(aiProvider, "Configure in Settings")}
          type="button"
          title="Configure in Settings"
        >
          Configure in Settings
        </button>
      </div>

      <select
        className={
          "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        }
        value={aiProvider}
        onChange={(e) => handleProviderChange(e.target.value)}
      >
        {providerOptions.map((p) => (
          <option key={p.id} value={p.id} disabled={!p.enabled && p.id !== aiProvider}>
            {p.label}
            {p.suffix}
          </option>
        ))}
      </select>

      {!providerReady && (
        <div className="text-xs opacity-60">
          Providers are disabled until configured. Use{" "}
          <span className="opacity-90">Configure in Settings</span> to add an API key (and an endpoint
          where required).
        </div>
      )}

      {!providerReady && (
        <div className="text-xs opacity-70 border border-zinc-800 rounded p-2 bg-zinc-900/40 flex items-center justify-between gap-2">
          <div className="leading-snug">{disabledProviderMessage(providerStatus)}</div>
          <button
            className={buttonClass("ghost")}
            onClick={() => openSettings(aiProvider, "Configure in Settings")}
            type="button"
          >
            Configure in Settings
          </button>
        </div>
      )}

      <div className="text-xs uppercase tracking-wide opacity-60 mt-3">Model</div>
      <input
        className={[
          "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
          !providerReady ? "opacity-60 cursor-not-allowed" : ""
        ].join(" ")}
        value={aiModel}
        onChange={(e) => setAiModel(e.target.value)}
        placeholder={modelPlaceholder(aiProvider)}
        list={`model-suggestions-${aiProvider}`}
        disabled={!providerReady}
      />

      <datalist id={`model-suggestions-${aiProvider}`}>
        {modelSuggestions.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      {showModelHelper && (
        <div className="text-xs opacity-60">
          {modelHelperText(aiProvider) ||
            "Select a preset or enter a model ID. Some providers require manual model IDs."}
        </div>
      )}
    </div>
  );
}
