import React, { useMemo, useState } from "react";

function isDir(node) {
  return Array.isArray(node.children);
}

function sortNodes(nodes) {
  const safe = Array.isArray(nodes) ? nodes : [];
  const dirs = safe.filter(isDir).sort((a, b) => a.name.localeCompare(b.name));
  const files = safe.filter((n) => !isDir(n)).sort((a, b) => a.name.localeCompare(b.name));
  return [...dirs, ...files];
}

function NodeRow({ node, depth, expanded, setExpanded, onOpenFile, activeFilePath }) {
  const dir = isDir(node);
  const open = expanded[node.path] ?? false;
  const active = !dir && activeFilePath === node.path;

  return (
    <div>
      <button
        className={[
          "w-full text-left flex items-center gap-2 px-2 py-1 rounded",
          "hover:bg-zinc-800/60",
          active ? "bg-zinc-800" : ""
        ].join(" ")}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => {
          if (dir) {
            setExpanded((prev) => ({ ...prev, [node.path]: !prev[node.path] }));
          } else {
            console.log("[kforge] Explorer click file:", node.path);
            onOpenFile(node.path);
          }
        }}
        title={node.path}
        type="button"
      >
        <span className="opacity-80 w-4 inline-block">{dir ? (open ? "▾" : "▸") : "•"}</span>
        <span className="truncate">{node.name}</span>
      </button>

      {dir && open && node.children?.length > 0 && (
        <div>
          {sortNodes(node.children).map((child) => (
            <NodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              setExpanded={setExpanded}
              onOpenFile={onOpenFile}
              activeFilePath={activeFilePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Explorer({ tree, onOpenFile, activeFilePath }) {
  const [expanded, setExpanded] = useState({});

  const rootNodes = useMemo(() => sortNodes(tree), [tree]);

  return (
    <div className="h-full overflow-auto p-2">
      {rootNodes.length === 0 ? (
        <div className="text-sm opacity-70 p-2">No folder opened.</div>
      ) : (
        rootNodes.map((node) => (
          <NodeRow
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            setExpanded={setExpanded}
            onOpenFile={onOpenFile}
            activeFilePath={activeFilePath}
          />
        ))
      )}
    </div>
  );
}
