// src/App.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";

import { invoke } from "@tauri-apps/api/core";

import { openProjectFolder, readFolderTree, openFile, saveFile } from "./lib/fs";
import Explorer from "./components/Explorer";
import EditorPane from "./components/EditorPane";
import Tabs from "./components/Tabs.jsx"; // ✅ use existing tabs.jsx

import { aiGenerate } from "./ai/client";

function basename(p) {
  if (!p) return "";
  const normalized = p.replaceAll("\\", "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || p;
}

// Try hard to get a useful message out of Tauri invoke errors / Rust payloads
function formatTauriError(err) {
  if (!err) return "Unknown error";

  if (typeof err === "string") return err;

  if (err instanceof Error && err.message) return err.message;

  if (typeof err.message === "string" && err.message.trim()) return err.message;

  if (typeof err.kind === "string" && typeof err.message === "string") {
    return `${err.kind}: ${err.message}`;
  }

  if (err.error && typeof err.error.message === "string") {
    return err.error.message;
  }

  if (
    err.error &&
    typeof err.error.kind === "string" &&
    typeof err.error.message === "string"
  ) {
    return `${err.error.kind}: ${err.error.message}`;
  }

  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error (unserializable)";
  }
}

export default function App() {
  const [projectPath, setProjectPath] = useState(null);
  const [tree, setTree] = useState([]);

  // Tabs state
  const [tabs, setTabs] = useState([]); // { path, name, content, isDirty }
  const [activeFilePath, setActiveFilePath] = useState(null);

  const [saveStatus, setSaveStatus] = useState("");

  // AI test output (top bar)
  const [aiTestOutput, setAiTestOutput] = useState("");

  const activeTab = useMemo(() => {
    if (!activeFilePath) return null;
    return tabs.find((t) => t.path === activeFilePath) || null;
  }, [tabs, activeFilePath]);

  const handleOpenFolder = useCallback(async () => {
    const folder = await openProjectFolder();
    if (!folder) return;

    try {
      await invoke("fs_allow_directory", { path: folder });
      console.log("[kforge] FS scope allowed folder:", folder);
    } catch (err) {
      console.error("[kforge] Failed to allow folder in FS scope:", err);
    }

    setProjectPath(folder);
    setTabs([]);
    setActiveFilePath(null);
    setSaveStatus("");
    setAiTestOutput("");

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

  const handleAiCoreTest = useCallback(async () => {
    setAiTestOutput("Running AI Core test (mock)...");
    try {
      const res = await aiGenerate({
        provider_id: "mock",
        model: "mock-1",
        input: "Hello KForge AI Core"
      });

      console.log("[kforge][ai-test][mock] response:", res);
      setAiTestOutput(res.output_text);
    } catch (err) {
      console.error("[kforge][ai-test][mock] failed:", err);
      setAiTestOutput(`AI Core failed: ${formatTauriError(err)}`);
    }
  }, []);

  const handleAiOpenAITest = useCallback(async () => {
    setAiTestOutput("Running pipeline test (openai)...");
    try {
      const res = await aiGenerate({
        provider_id: "openai",
        model: "gpt-4o-mini",
        input: "Reply with exactly: PIPELINE_OK",
        system: "You are a concise test bot. Output only the requested token.",
        temperature: 0,
        max_output_tokens: 32
      });

      console.log("[kforge][ai-test][openai] response:", res);
      setAiTestOutput(res.output_text);
    } catch (err) {
      console.error("[kforge][ai-test][openai] failed:", err);
      setAiTestOutput(`OpenAI failed: ${formatTauriError(err)}`);
    }
  }, []);

  const handleAiDeepSeekTest = useCallback(async () => {
    setAiTestOutput("Running pipeline test (deepseek)...");
    try {
      const res = await aiGenerate({
        provider_id: "deepseek",
        model: "deepseek-chat",
        input: "Reply with exactly: PIPELINE_OK",
        system: "You are a concise test bot. Output only the requested token.",
        temperature: 0,
        max_output_tokens: 32
      });

      console.log("[kforge][ai-test][deepseek] response:", res);
      setAiTestOutput(res.output_text);
    } catch (err) {
      console.error("[kforge][ai-test][deepseek] failed:", err);
      setAiTestOutput(`DeepSeek failed: ${formatTauriError(err)}`);
    }
  }, []);

  const handleAiOllamaTest = useCallback(async () => {
    setAiTestOutput("Running pipeline test (ollama)...");
    try {
      const res = await aiGenerate({
        provider_id: "ollama",
        model: "llama3.1",
        input: "Reply with exactly: PIPELINE_OK",
        system: "You are a concise test bot. Output only the requested token.",
        temperature: 0,
        max_output_tokens: 32
      });

      console.log("[kforge][ai-test][ollama] response:", res);
      setAiTestOutput(res.output_text);
    } catch (err) {
      console.error("[kforge][ai-test][ollama] failed:", err);
      setAiTestOutput(`Ollama test failed: ${formatTauriError(err)}`);
    }
  }, []);

  const handleAiOllamaListModels = useCallback(async () => {
    setAiTestOutput("Listing Ollama models...");
    try {
      const models = await invoke("ai_ollama_list_models", {});
      console.log("[kforge][ai-test][ollama] models:", models);

      if (Array.isArray(models) && models.length > 0) {
        setAiTestOutput(`Ollama models: ${models.join(", ")}`);
      } else {
        setAiTestOutput("Ollama models: (none found)");
      }
    } catch (err) {
      console.error("[kforge][ai-test][ollama] list models failed:", err);
      setAiTestOutput(`Ollama list models failed: ${formatTauriError(err)}`);
    }
  }, []);

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

        <button
          className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
          onClick={handleAiCoreTest}
          title="Phase 3.1.0: quick end-to-end test (mock provider)"
        >
          AI Core Test
        </button>

        <button
          className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
          onClick={handleAiOpenAITest}
          title="Sanity check: OpenAI provider end-to-end"
        >
          Test OpenAI
        </button>

        <button
          className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
          onClick={handleAiDeepSeekTest}
          title="Sanity check: DeepSeek provider end-to-end"
        >
          Test DeepSeek
        </button>

        <button
          className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
          onClick={handleAiOllamaTest}
          title="Sanity check: Ollama provider end-to-end (local)"
        >
          Test Ollama
        </button>

        <button
          className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
          onClick={handleAiOllamaListModels}
          title="Ollama helper: list locally available models"
        >
          List Ollama Models
        </button>

        <div className="text-sm opacity-80 truncate">
          {projectPath ? `Folder: ${projectPath}` : "No folder opened"}
        </div>

        {saveStatus && <div className="text-xs opacity-70">{saveStatus}</div>}

        {aiTestOutput && (
          <div
            className="text-xs opacity-70 truncate max-w-[35%]"
            title={aiTestOutput}
          >
            {aiTestOutput}
          </div>
        )}

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
