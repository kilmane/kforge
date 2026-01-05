import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";

import { openProjectFolder, readFolderTree, openFile, saveFile } from "./lib/fs";
import Explorer from "./components/Explorer";
import EditorPane from "./components/EditorPane";
import Tabs from "./components/Tabs.jsx"; // ✅ use existing tabs.jsx

function basename(p) {
  if (!p) return "";
  const normalized = p.replaceAll("\\", "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || p;
}

export default function App() {
  const [projectPath, setProjectPath] = useState(null);
  const [tree, setTree] = useState([]);

  // Tabs state
  const [tabs, setTabs] = useState([]); // { path, name, content, isDirty }
  const [activeFilePath, setActiveFilePath] = useState(null);

  const [saveStatus, setSaveStatus] = useState("");

  const activeTab = useMemo(() => {
    if (!activeFilePath) return null;
    return tabs.find((t) => t.path === activeFilePath) || null;
  }, [tabs, activeFilePath]);

  const handleOpenFolder = useCallback(async () => {
    const folder = await openProjectFolder();
    if (!folder) return;

    setProjectPath(folder);
    setTabs([]);
    setActiveFilePath(null);
    setSaveStatus("");

    const nextTree = await readFolderTree(folder);
    setTree(nextTree || []);
  }, []);

  const handleOpenFile = useCallback(
    async (path) => {
      if (!path) return;

      const existing = tabs.find((t) => t.path === path);
      if (existing) {
        setActiveFilePath(path);
        return;
      }

      try {
        const contents = await openFile(path);

        const newTab = {
          path,
          name: basename(path),
          content: contents ?? "",
          isDirty: false
        };

        setTabs((prev) => [...prev, newTab]);
        setActiveFilePath(path);
      } catch (err) {
        console.error("[kforge] Failed to open file:", err);
      }
    },
    [tabs]
  );

  const handleEditorChange = useCallback(
    (nextValue) => {
      if (!activeFilePath) return;

      setTabs((prev) =>
        prev.map((t) =>
          t.path === activeFilePath
            ? { ...t, content: nextValue, isDirty: true }
            : t
        )
      );
    },
    [activeFilePath]
  );

  const handleCloseTab = useCallback(
    (path) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.path === path);
        const next = prev.filter((t) => t.path !== path);

        if (activeFilePath === path) {
          if (next.length === 0) {
            setActiveFilePath(null);
          } else {
            const fallback = next[Math.min(idx, next.length - 1)];
            setActiveFilePath(fallback.path);
          }
        }

        return next;
      });
    },
    [activeFilePath]
  );

  const handleSaveActive = useCallback(async () => {
    if (!activeTab || !activeTab.isDirty) return;

    setSaveStatus("Saving...");
    try {
      await saveFile(activeTab.path, activeTab.content);

      setTabs((prev) =>
        prev.map((t) =>
          t.path === activeTab.path ? { ...t, isDirty: false } : t
        )
      );

      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus(""), 1200);
    } catch (err) {
      console.error("[kforge] Save failed:", err);
      setSaveStatus("Error (see console)");
      setTimeout(() => setSaveStatus(""), 2000);
    }
  }, [activeTab]);

  // Ctrl+S / Cmd+S
  useEffect(() => {
    const handler = (e) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSaveActive();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSaveActive]);

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top bar */}
      <div className="h-12 flex items-center gap-3 px-3 border-b border-zinc-800">
        <button
          className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
          onClick={handleOpenFolder}
        >
          Open Folder
        </button>

        <div className="text-sm opacity-80 truncate">
          {projectPath ? `Folder: ${projectPath}` : "No folder opened"}
        </div>

        {saveStatus && <div className="text-xs opacity-70">{saveStatus}</div>}

        {activeFilePath && (
          <div className="ml-auto text-xs opacity-70 truncate max-w-[45%]">
            {activeFilePath}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activePath={activeFilePath}
        onActivate={setActiveFilePath}
        onClose={handleCloseTab}
      />

      {/* Main layout */}
      <div className="flex-1 flex min-h-0">
        <div className="w-72 border-r border-zinc-800 min-h-0">
          <Explorer
            tree={tree}
            onOpenFile={handleOpenFile}
            activeFilePath={activeFilePath}
          />
        </div>

        <div className="flex-1 min-h-0">
          <EditorPane
            filePath={activeFilePath}
            value={activeTab?.content ?? ""}
            onChange={handleEditorChange}
          />
        </div>

        <div className="w-96 border-l border-zinc-800 min-h-0">
          <div className="h-full p-3 text-sm opacity-70">Chat Panel</div>
        </div>
      </div>
    </div>
  );
}
