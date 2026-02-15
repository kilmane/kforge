import React from "react";

export default function DockShell({ main, dockBar, dockPanel, expanded }) {
  return (
    <div className="h-full w-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {expanded ? (
        <>
          {/* Focus mode: panel takes all available height */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-auto">{dockPanel}</div>
          </div>

          {/* Keep bar for now (we'll remove it in expanded mode in Step 2) */}
          {dockBar}
        </>
      ) : (
        <>
          {/* Normal app layout */}
          <div className="flex-1 min-h-0 overflow-hidden">{main}</div>

          {/* Always-visible bottom bar */}
          {dockBar}
        </>
      )}
    </div>
  );
}
