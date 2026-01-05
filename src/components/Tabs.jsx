import React from "react";

export default function Tabs({ tabs, activePath, onActivate, onClose }) {
  if (!tabs || tabs.length === 0) {
    return (
      <div className="h-10 flex items-center px-3 text-sm opacity-70 border-b border-zinc-800">
        No file open
      </div>
    );
  }

  return (
    <div className="h-10 flex items-center gap-1 px-2 border-b border-zinc-800 overflow-x-auto">
      {tabs.map((t) => {
        const isActive = t.path === activePath;

        return (
          <div
            key={t.path}
            className={[
              "group flex items-center gap-2 px-3 h-8 rounded",
              "border border-transparent",
              isActive ? "bg-zinc-800 border-zinc-700" : "hover:bg-zinc-900"
            ].join(" ")}
            title={t.path}
          >
            <button
              type="button"
              className="text-sm truncate max-w-[220px]"
              onClick={() => onActivate(t.path)}
            >
              {t.name}
              {t.isDirty ? " •" : ""}
            </button>

            <button
              type="button"
              className="text-xs opacity-60 hover:opacity-100 px-1"
              onClick={() => onClose(t.path)}
              title="Close"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
