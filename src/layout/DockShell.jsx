import React from "react";

export default function DockShell({ main, dockBar, dockPanel, expanded }) {
  return (
    <div className="relative h-full w-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Main app layout stays mounted ALWAYS */}
      <div className="h-full w-full flex flex-col">
        <div className="flex-1 min-h-0 overflow-hidden">{main}</div>

        {/* Bottom bar only in normal mode */}
        {!expanded ? dockBar : null}
      </div>

      {/* Focus / Expanded overlay */}
      {expanded ? (
        <>
          {/* Dim layer (IMPORTANT: separate layer, NOT opacity on main wrapper) */}
          <div className="absolute inset-0 z-10 bg-black/40 pointer-events-none" />

          {/* Focus surface — start BELOW the top toolbar so toolbar stays clickable.
              Adjust `top-12` if your toolbar is taller/shorter. */}
          <div className="absolute left-0 right-0 bottom-0 top-12 z-40 flex flex-col bg-zinc-950">
            {/* Reserve space for the dock bar so it doesn't cover the panel */}
            <div className="flex-1 min-h-0 overflow-hidden pb-12">
              <div className="h-full overflow-auto">{dockPanel}</div>
            </div>

            {/* Dock bar floats above as the "collapse" strip */}
            <div className="absolute bottom-0 left-0 right-0 z-50">
              {dockBar}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
