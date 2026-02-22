import React from "react";

export default function DockShell({
  main,
  dockPanel,
  dockOpen,
  dockMode = "bottom", // "bottom" | "full"
}) {
  return (
    <div className="h-full w-full flex flex-col min-h-0">
      {/* In full mode, the dock becomes the main surface */}
      {dockMode === "full" ? (
        <div className="flex-1 min-h-0">{dockOpen ? dockPanel : null}</div>
      ) : (
        <>
          <div className="flex-1 min-h-0">{main}</div>

          {dockOpen ? (
            <div className="w-full border-t border-zinc-800 bg-zinc-950 max-h-[55vh] min-h-0 overflow-hidden">
              {dockPanel}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
