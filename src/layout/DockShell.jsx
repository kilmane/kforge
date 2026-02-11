import React from "react";

export default function DockShell({ main, dockBar, dockPanel, expanded }) {
  return (
    <div className="h-full w-full flex flex-col bg-zinc-950 text-zinc-100">
      <div className="flex-1 min-h-0">{main}</div>

      {/* Always-visible bottom bar */}
      {dockBar}

      {/* Expandable panel area */}
      {expanded ? (
        <div className="border-t border-zinc-800 shrink-0 bg-zinc-950 overflow-visible">
          <div className="h-[360px] min-h-[240px] max-h-[45vh] overflow-visible">
            <div className="h-full overflow-auto">{dockPanel}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
