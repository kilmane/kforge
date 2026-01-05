import { useEffect, useState } from "react";
import { commands } from "../commands/commands";

export default function CommandPalette({ open, onClose, context }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(query.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-32">
      <div className="bg-zinc-900 w-[500px] rounded-lg shadow-xl border border-zinc-700">
        <input
          autoFocus
          className="w-full px-4 py-3 bg-zinc-800 text-white outline-none rounded-t-lg"
          placeholder="Type a command…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && filtered[0]) {
              filtered[0].run(context);
              onClose();
            }
          }}
        />

        <ul className="max-h-64 overflow-y-auto">
          {filtered.map(cmd => (
            <li
              key={cmd.id}
              className="px-4 py-2 hover:bg-zinc-700 cursor-pointer flex justify-between"
              onClick={() => {
                cmd.run(context);
                onClose();
              }}
            >
              <span>{cmd.title}</span>
              <span className="text-xs text-zinc-400">{cmd.shortcut}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
