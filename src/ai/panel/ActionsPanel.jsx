// src/ai/panel/ActionsPanel.jsx
import React from "react";

export default function ActionsPanel({
  providerReady,
  aiRunning,
  handleSendChat,
  handleAiTest,
  guardrailText,
  openSettings,
  aiProvider,
  buttonClass,
  showTest = false,
  showGuardrail = false,
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          className={buttonClass("primary", !providerReady || aiRunning)}
          onClick={handleSendChat}
          disabled={!providerReady || aiRunning}
          type="button"
        >
          {aiRunning ? "Running..." : "Send"}
        </button>

        {showTest ? (
          <button
            className={buttonClass("ghost", !providerReady || aiRunning)}
            onClick={handleAiTest}
            disabled={!providerReady || aiRunning}
            type="button"
            title="Quick check that your provider/model config is working"
          >
            Test connection
          </button>
        ) : null}
      </div>

      {!providerReady && showGuardrail ? (
        <div className="text-xs opacity-70 border border-zinc-800 rounded p-2 bg-zinc-900/30 flex items-center justify-between gap-2">
          <div className="leading-snug">{guardrailText}</div>
          <button
            className={buttonClass("ghost")}
            onClick={() =>
              openSettings(
                aiProvider,
                "Configure this provider to enable Send.",
              )
            }
            type="button"
          >
            Configure
          </button>
        </div>
      ) : null}
    </div>
  );
}
