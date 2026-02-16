import React from "react";

export default function DockShell({ main, dockBar, dockPanel, expanded }) {
  return (
    <div className="relative h-full w-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {expanded ? (
        // Expanded: show ONLY the AI panel (no dock bar, otherwise it covers PromptPanel)
        <div className="flex-1 min-h-0 overflow-hidden">{dockPanel}</div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-hidden">{main}</div>
          {dockBar}
        </>
      )}
    </div>
  );
}
