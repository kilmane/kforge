// src/layout/TabsBar.js
import React from "react";

const PROVIDERS_MODELS_DOC_URL =
  "https://raw.githubusercontent.com/kilmane/kforge/refs/heads/main/PROVIDERS_AND_MODELS.md";

export default function TabsBar() {
  return (
    <div className="h-10 flex items-center justify-between px-4 bg-panel border-b border-border text-sm">
      {/* Left: tabs area (stub for now) */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="px-3 py-1 bg-bg rounded-t text-accent truncate">index.ts</div>
      </div>

      {/* Right: Help link */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-2 py-1 rounded border border-border bg-bg hover:opacity-90 text-xs"
          title="Open KForge docs (providers & models) on GitHub"
          onClick={() => {
            try {
              window.open(PROVIDERS_MODELS_DOC_URL, "_blank", "noopener,noreferrer");
            } catch {
              // ignore
            }
          }}
        >
          Help
        </button>
      </div>
    </div>
  );
}
