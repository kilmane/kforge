// src/ai/panel/SystemPanel.jsx
import React from "react";

const BEHAVIOR_TEMPLATES_URL =
  "https://kilmane.github.io/kforge/behavior-templates.html";

async function openBehaviorTemplates(invoke) {
  try {
    if (typeof invoke === "function") {
      await invoke("open_url", { url: BEHAVIOR_TEMPLATES_URL });
      return;
    }
  } catch {
    // Fall back to the browser below.
  }

  window.open(BEHAVIOR_TEMPLATES_URL, "_blank", "noopener,noreferrer");
}

export default function SystemPanel({
  aiSystem,
  setAiSystem,
  disabled = false,
  invoke,
  title = "Project behavior override",
  description = "",
  placeholder = "Optional instructions for this project…",
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>

          {description ? (
            <div className="text-xs opacity-60 mt-1 leading-snug">
              {description}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="shrink-0 text-[11px] text-orange-400 hover:text-orange-300 underline underline-offset-2"
          onClick={() => openBehaviorTemplates(invoke)}
          title="Open KForge behavior template examples"
        >
          Behavior Templates
        </button>
      </div>

      <textarea
        className={[
          "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
          "min-h-[96px]",
          disabled ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
        value={aiSystem}
        onChange={(event) => setAiSystem(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
