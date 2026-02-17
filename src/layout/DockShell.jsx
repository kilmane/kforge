import React from "react";

export default function DockShell({ main, dockPanel, dockOpen }) {
  return (
    <div className="h-screen w-full flex flex-col">
      <div className="flex-1 min-h-0">{main}</div>

      {dockOpen ? (
        <div className="w-full border-t border-zinc-800 bg-zinc-950">
          {dockPanel}
        </div>
      ) : null}
    </div>
  );
}
