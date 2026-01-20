// src/ai/panel/OllamaHelperPanel.jsx
import React from "react";

export default function OllamaHelperPanel({
  aiRunning,
  endpoints,
  invoke,
  setAiTestOutput,
  setRuntimeReachable,
  formatTauriError,
  buttonClass
}) {
  return (
    <div className="border border-zinc-800 rounded p-3 space-y-2">
      <div className="text-sm font-semibold">Ollama Helper</div>
      <div className="text-xs opacity-60">List local models using the Rust command.</div>
      <button
        className={buttonClass("ghost", aiRunning)}
        onClick={async () => {
          setAiTestOutput?.("Listing Ollama models...");
          try {
            const ep = (endpoints?.ollama || "").trim();
            const models = await invoke("ai_ollama_list_models", {
              endpoint: ep ? ep : undefined
            });
            if (Array.isArray(models) && models.length > 0) {
              setAiTestOutput?.(`Ollama models: ${models.join(", ")}`);
            } else {
              setAiTestOutput?.("Ollama models: (none found)");
            }
            setRuntimeReachable?.((prev) => ({ ...prev, ollama: true }));
          } catch (err) {
            const msg = formatTauriError ? formatTauriError(err) : String(err);
            setAiTestOutput?.(`Ollama list models failed: ${msg}`);
            setRuntimeReachable?.((prev) => ({ ...prev, ollama: false }));
          }
        }}
        disabled={aiRunning}
        type="button"
      >
        List Models
      </button>
    </div>
  );
}
