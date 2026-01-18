// src/App.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";

import { invoke } from "@tauri-apps/api/core";

import { openProjectFolder, readFolderTree, openFile, saveFile } from "./lib/fs";
import Explorer from "./components/Explorer";
import EditorPane from "./components/EditorPane";
import Tabs from "./components/Tabs.jsx";

import { aiGenerate, aiSetApiKey, aiHasApiKey, aiClearApiKey } from "./ai/client";
import SettingsModal from "./components/settings/SettingsModal.jsx";

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

function GearIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 15a8.4 8.4 0 0 0 .05-1l1.55-1.2-1.6-2.8-1.86.6c-.52-.42-1.1-.77-1.72-1.03L15.5 6h-3l-.32 1.57c-.64.26-1.22.61-1.75 1.05L8.6 8.02 7 10.82 8.55 12c-.04.33-.05.67-.05 1 0 .34.01.68.05 1L7 16.2l1.6 2.8 1.83-.6c.53.44 1.12.8 1.77 1.06L12.5 22h3l.31-1.56c.64-.26 1.23-.62 1.75-1.06l1.84.62 1.6-2.8L19.4 15Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Provider registry (UI-facing)
const ALL_PROVIDERS = [
  { id: "openai", label: "OpenAI", group: "cloud", needsKey: true, needsEndpoint: false, alwaysEnabled: false },
  { id: "gemini", label: "Gemini", group: "cloud", needsKey: true, needsEndpoint: false, alwaysEnabled: false },
  { id: "claude", label: "Claude", group: "cloud", needsKey: true, needsEndpoint: false, alwaysEnabled: false },

  { id: "deepseek", label: "DeepSeek", group: "compatible", needsKey: true, needsEndpoint: false, alwaysEnabled: false },
  { id: "groq", label: "Groq", group: "compatible", needsKey: true, needsEndpoint: false, alwaysEnabled: false },
  { id: "openrouter", label: "OpenRouter", group: "compatible", needsKey: true, needsEndpoint: false, alwaysEnabled: false },
  { id: "huggingface", label: "Hugging Face", group: "compatible", needsKey: true, needsEndpoint: true, alwaysEnabled: false },
  { id: "custom", label: "Custom Endpoint (OpenAI-compatible)", group: "compatible", needsKey: true, needsEndpoint: true, alwaysEnabled: false },

  // Phase 3.3 UI prep
  { id: "ollama", label: "Ollama (local/remote)", group: "local", needsKey: false, needsEndpoint: false, alwaysEnabled: true },
  { id: "lmstudio", label: "LM Studio", group: "local", needsKey: false, needsEndpoint: false, alwaysEnabled: true },
  { id: "mock", label: "Mock", group: "local", needsKey: false, needsEndpoint: false, alwaysEnabled: true }
];

// Minimal presets
const MODEL_PRESETS = {
  openai: ["gpt-4o-mini", "gpt-4o"],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro"],
  claude: ["claude-3-5-sonnet", "claude-3-5-haiku"],

  deepseek: ["deepseek-chat"],
  groq: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"],
  // Kept as suggestions only; UX treats OpenRouter as manual entry.
  openrouter: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"],

  huggingface: [],
  custom: [],

  ollama: ["llama3.1", "llama3", "mistral", "qwen2.5"],
  lmstudio: [],
  mock: ["mock-1"]
};

function inputClass(disabled = false) {
  return [
    "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
    disabled ? "opacity-60 cursor-not-allowed" : ""
  ].join(" ");
}

function buttonClass(variant = "primary", disabled = false) {
  const base =
    variant === "ghost"
      ? "px-3 py-1.5 rounded bg-transparent border border-zinc-800 hover:bg-zinc-900 text-sm"
      : variant === "danger"
        ? "px-3 py-1.5 rounded bg-red-900/40 border border-red-900/70 hover:bg-red-900/55 text-sm"
        : "px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm";

  return [base, disabled ? "opacity-60 cursor-not-allowed" : ""].join(" ");
}

function endpointStorageKey(providerId) {
  return `kforge.endpoint.${providerId}`;
}

function statusForProviderUI(providerMeta, hasKeyMap, endpointsMap) {
  if (!providerMeta) return { label: "Unknown", tone: "warn" };

  const hasKey = !!hasKeyMap[providerMeta.id];
  const endpoint = (endpointsMap[providerMeta.id] || "").trim();

  const keyOk = !providerMeta.needsKey || providerMeta.alwaysEnabled || hasKey;
  const endpointOk = !providerMeta.needsEndpoint || endpoint.length > 0;

  if (keyOk && endpointOk) return { label: "Configured", tone: "ok" };
  if (!keyOk) return { label: "Missing API key", tone: "warn", missing: "key" };
  if (!endpointOk) return { label: "Missing endpoint", tone: "warn", missing: "endpoint" };
  return { label: "Not configured", tone: "warn" };
}

function statusChipClass(tone) {
  return tone === "ok"
    ? "bg-emerald-900/30 border-emerald-900/60 text-emerald-200"
    : "bg-amber-900/25 border-amber-900/60 text-amber-200";
}

function shortSuffixForDisabled(status) {
  if (!status) return "";
  if (status.missing === "key") return "(API key)";
  if (status.missing === "endpoint") return "(Endpoint)";
  if (typeof status.label === "string" && status.label.trim()) return `(${status.label})`;
  return "(Not configured)";
}

// Providers where the user should enter model IDs manually (no preset-driven UX)
function manualModelProviders(providerId) {
  return (
    providerId === "openrouter" ||
    providerId === "custom" ||
    providerId === "huggingface" ||
    providerId === "lmstudio"
  );
}

function modelPlaceholder(providerId) {
  return manualModelProviders(providerId) ? "Enter a model ID" : "model";
}

function modelHelperText(providerId) {
  if (!manualModelProviders(providerId)) return null;

  if (providerId === "openrouter") {
    return "No presets for OpenRouter. Enter a model ID (e.g., openai/gpt-4o-mini).";
  }
  if (providerId === "huggingface") {
    return "No presets for Hugging Face. Enter the model ID required by your endpoint.";
  }
  if (providerId === "custom") {
    return "No presets for custom endpoints. Enter the model name required by your endpoint.";
  }
  if (providerId === "lmstudio") {
    return "No presets for LM Studio. Enter the model ID your server expects.";
  }
  return "This provider has no presets. Enter a model ID.";
}

function disabledProviderMessage(status) {
  if (status?.missing === "key") {
    return "Disabled — Missing API key. Add it in Settings to enable this provider.";
  }
  if (status?.missing === "endpoint") {
    return "Disabled — Missing endpoint. Add it in Settings to enable this provider.";
  }
  return "Disabled — Not configured. Configure in Settings to enable this provider.";
}

export default function App() {
  const [projectPath, setProjectPath] = useState(null);
  const [tree, setTree] = useState([]);

  // Tabs state
  const [tabs, setTabs] = useState([]); // { path, name, content, isDirty }
  const [activeFilePath, setActiveFilePath] = useState(null);

  const [saveStatus, setSaveStatus] = useState("");

  // AI panel open/close
  const [aiPanelOpen, setAiPanelOpen] = useState(true);

  // AI state
  const [aiProvider, setAiProvider] = useState("openai");
  const [aiModel, setAiModel] = useState("gpt-4o-mini");

  const [endpoints, setEndpoints] = useState({}); // providerId -> string

  const [aiSystem, setAiSystem] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTemperature, setAiTemperature] = useState(0.2);
  const [aiMaxTokens, setAiMaxTokens] = useState(512);

  const [aiRunning, setAiRunning] = useState(false);
  const [aiOutput, setAiOutput] = useState("");

  // Key status map
  const [hasKey, setHasKey] = useState({}); // providerId -> boolean

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsFocusProviderId, setSettingsFocusProviderId] = useState(null);
  const [settingsMessage, setSettingsMessage] = useState("");

  // Debug line
  const [aiTestOutput, setAiTestOutput] = useState("");

  const activeTab = useMemo(() => {
    if (!activeFilePath) return null;
    return tabs.find((t) => t.path === activeFilePath) || null;
  }, [tabs, activeFilePath]);

  const providerMeta = useMemo(() => {
    return ALL_PROVIDERS.find((p) => p.id === aiProvider) || {
      id: aiProvider,
      label: aiProvider,
      needsKey: true,
      needsEndpoint: false,
      alwaysEnabled: false,
      group: "compatible"
    };
  }, [aiProvider]);

  const modelSuggestions = useMemo(() => MODEL_PRESETS[aiProvider] || [], [aiProvider]);

  // Load endpoints from localStorage (boot)
  useEffect(() => {
    const next = {};
    for (const p of ALL_PROVIDERS) {
      const v = window.localStorage.getItem(endpointStorageKey(p.id));
      if (typeof v === "string" && v.length > 0) next[p.id] = v;
    }
    setEndpoints(next);
  }, []);

  const setEndpointForProvider = useCallback((providerId, value) => {
    setEndpoints((prev) => ({ ...prev, [providerId]: value }));
    window.localStorage.setItem(endpointStorageKey(providerId), value || "");
  }, []);

  const isProviderEnabled = useCallback(
    (providerId) => {
      const p = ALL_PROVIDERS.find((x) => x.id === providerId);
      if (!p) return false;

      if (p.alwaysEnabled) return true;

      const keyOk = !p.needsKey || hasKey[providerId] === true;
      if (!keyOk) return false;

      if (p.needsEndpoint) {
        const ep = (endpoints[providerId] || "").trim();
        if (!ep) return false;
      }

      return true;
    },
    [hasKey, endpoints]
  );

  const providerReady = useMemo(() => isProviderEnabled(aiProvider), [aiProvider, isProviderEnabled]);

  const openSettings = useCallback((focusProviderId = null, msg = "") => {
    setSettingsFocusProviderId(focusProviderId);
    setSettingsMessage(msg || "");
    setSettingsOpen(true);
  }, []);

  // Refresh keys status
  const refreshHasKeys = useCallback(async () => {
    const next = {};
    for (const p of ALL_PROVIDERS) {
      if (!p.needsKey || p.alwaysEnabled) {
        next[p.id] = false;
        continue;
      }
      try {
        const ok = await aiHasApiKey(p.id);
        next[p.id] = !!ok;
      } catch {
        next[p.id] = false;
      }
    }
    setHasKey(next);
  }, []);

  useEffect(() => {
    refreshHasKeys();
  }, [refreshHasKeys]);

  // Auto-fill model if empty (only for preset-driven providers)
  useEffect(() => {
    if (manualModelProviders(aiProvider)) return;
    if (aiModel && aiModel.trim()) return;
    const presets = MODEL_PRESETS[aiProvider] || [];
    if (presets.length > 0) setAiModel(presets[0]);
  }, [aiProvider, aiModel]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSaveActive();
      }

      if (mod && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setAiPanelOpen((v) => !v);
      }

      if (mod && e.key === ",") {
        e.preventDefault();
        openSettings(null, "Opened via keyboard shortcut");
      }

      if (e.key === "Escape") {
        setSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSaveActive, openSettings]);

  const handleSaveKey = useCallback(
    async (providerId, rawKey) => {
      const draft = (rawKey || "").trim();
      if (!draft) {
        setAiTestOutput(`No API key entered for ${providerId}`);
        return;
      }
      try {
        await aiSetApiKey(providerId, draft);
        await refreshHasKeys();
        setAiTestOutput(`Saved API key for ${providerId}`);
      } catch (err) {
        setAiTestOutput(`Save key failed: ${formatTauriError(err)}`);
      }
    },
    [refreshHasKeys]
  );

  const handleClearKey = useCallback(
    async (providerId) => {
      try {
        await aiClearApiKey(providerId);
        await refreshHasKeys();
        setAiTestOutput(`Cleared API key for ${providerId}`);
      } catch (err) {
        setAiTestOutput(`Clear key failed: ${formatTauriError(err)}`);
      }
    },
    [refreshHasKeys]
  );

  // AI request builder
  const buildAiRequest = useCallback(
    (override = {}) => {
      const req = {
        provider_id: aiProvider,
        model: aiModel,
        input: aiPrompt,
        system: aiSystem?.trim() ? aiSystem : undefined,
        temperature: typeof aiTemperature === "number" ? aiTemperature : undefined,
        max_output_tokens:
          typeof aiMaxTokens === "number" ? Math.max(1, aiMaxTokens) : undefined
      };

      const ep = (endpoints[aiProvider] || "").trim();
      if (ep) req.endpoint = ep;

      return { ...req, ...override };
    },
    [aiProvider, aiModel, aiPrompt, aiSystem, aiTemperature, aiMaxTokens, endpoints]
  );

  const runAi = useCallback(
    async (overrideReq = {}) => {
      const req = buildAiRequest(overrideReq);

      if (!req.model || !String(req.model).trim()) {
        setAiOutput("Model is required.");
        return;
      }
      if (!req.input || !String(req.input).trim()) {
        setAiOutput("Prompt is required.");
        return;
      }

      const meta = ALL_PROVIDERS.find((p) => p.id === req.provider_id);
      if (!meta) {
        setAiOutput(`Unknown provider: ${req.provider_id}`);
        return;
      }

      if (!isProviderEnabled(req.provider_id)) {
        const st = statusForProviderUI(meta, hasKey, endpoints);
        setAiOutput(disabledProviderMessage(st));
        openSettings(req.provider_id, "Configure in Settings to enable this provider.");
        return;
      }

      setAiRunning(true);
      setAiOutput("");
      try {
        const res = await aiGenerate(req);
        setAiOutput(res?.output_text ?? "");
      } catch (err) {
        setAiOutput(formatTauriError(err));
      } finally {
        setAiRunning(false);
      }
    },
    [buildAiRequest, isProviderEnabled, openSettings, hasKey, endpoints]
  );

  const handleAiTest = useCallback(async () => {
    setAiTestOutput(`Testing ${aiProvider}...`);
    await runAi({
      input: "Reply with exactly: PIPELINE_OK",
      system: "You are a concise test bot. Output only the requested token.",
      temperature: 0,
      max_output_tokens: 32
    });
  }, [aiProvider, runAi]);

  const handleUseActiveFileAsPrompt = useCallback(() => {
    if (!activeTab) return;
    const text = activeTab.content ?? "";
    if (!text.trim()) return;
    setAiPrompt(text);
  }, [activeTab]);

  const handleProviderChange = useCallback(
    (nextProviderId) => {
      if (nextProviderId === aiProvider) return;

      if (!isProviderEnabled(nextProviderId)) {
        const meta = ALL_PROVIDERS.find((p) => p.id === nextProviderId);
        const st = statusForProviderUI(meta, hasKey, endpoints);
        openSettings(nextProviderId, disabledProviderMessage(st));
        return;
      }

      setAiProvider(nextProviderId);

      // Preset-driven providers get an auto model; manual providers show placeholder + helper.
      if (manualModelProviders(nextProviderId)) {
        setAiModel("");
        return;
      }

      const presets = MODEL_PRESETS[nextProviderId] || [];
      if (presets.length > 0) setAiModel(presets[0]);
    },
    [aiProvider, isProviderEnabled, openSettings, hasKey, endpoints]
  );

  const providerStatus = useMemo(() => {
    return statusForProviderUI(providerMeta, hasKey, endpoints);
  }, [providerMeta, hasKey, endpoints]);

  const disabledExplainer = useMemo(() => {
    if (providerReady) return null;
    if (providerStatus.missing === "key") return "API key";
    if (providerStatus.missing === "endpoint") return "Endpoint";
    return "Not configured";
  }, [providerReady, providerStatus]);

  const providerOptions = useMemo(() => {
    return ALL_PROVIDERS.map((p) => {
      const enabled = isProviderEnabled(p.id);
      const st = statusForProviderUI(p, hasKey, endpoints);
      const suffix = enabled ? "" : ` ${shortSuffixForDisabled(st)}`;
      return { ...p, enabled, status: st, suffix };
    });
  }, [hasKey, endpoints, isProviderEnabled]);

  const showModelHelper = useMemo(() => {
    return manualModelProviders(aiProvider) || modelSuggestions.length === 0;
  }, [aiProvider, modelSuggestions.length]);

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        providers={ALL_PROVIDERS}
        hasKeyMap={hasKey}
        endpointsMap={endpoints}
        onSetEndpoint={setEndpointForProvider}
        onSaveKey={handleSaveKey}
        onClearKey={handleClearKey}
        focusProviderId={settingsFocusProviderId}
        message={settingsMessage}
      />

      {/* Top bar */}
      <div className="h-12 flex items-center gap-3 px-3 border-b border-zinc-800">
        <button className={buttonClass()} onClick={handleOpenFolder}>
          Open Folder
        </button>

        <button
          className={buttonClass("ghost", !activeTab || !activeTab.isDirty)}
          onClick={handleSaveActive}
          disabled={!activeTab || !activeTab.isDirty}
          title="Save (Ctrl/Cmd+S)"
        >
          Save
        </button>

        <button
          className={buttonClass("ghost")}
          onClick={() => openSettings(null, "Opened from top bar")}
          title="Settings (Ctrl/Cmd+,)"
        >
          Settings
        </button>

        <button
          className={buttonClass("ghost")}
          onClick={() => setAiPanelOpen((v) => !v)}
          title="Toggle AI panel (Ctrl/Cmd+J)"
        >
          {aiPanelOpen ? "Hide AI" : "Show AI"}
        </button>

        <div className="text-sm opacity-80 truncate">
          {projectPath ? `Folder: ${projectPath}` : "No folder opened"}
        </div>

        {saveStatus && <div className="text-xs opacity-70">{saveStatus}</div>}

        {aiTestOutput && (
          <div className="text-xs opacity-70 truncate max-w-[35%]" title={aiTestOutput}>
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
          <Explorer tree={tree} onOpenFile={handleOpenFile} activeFilePath={activeFilePath} />
        </div>

        <div className="flex-1 min-h-0">
          <EditorPane
            filePath={activeFilePath}
            value={activeTab?.content ?? ""}
            onChange={handleEditorChange}
          />
        </div>

        {/* Right sidebar: AI panel (collapsible) */}
        {aiPanelOpen ? (
          <div className="w-96 border-l border-zinc-800 min-h-0 flex flex-col">
            <div className="p-3 border-b border-zinc-800">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">AI Panel</div>

                <div className="flex items-center gap-2">
                  <div className="text-xs opacity-70">
                    {providerMeta.label}
                    {providerReady ? "" : ` (${disabledExplainer})`}
                  </div>
                  <div
                    className={[
                      "text-[11px] px-2 py-0.5 rounded border whitespace-nowrap",
                      statusChipClass(providerStatus.tone)
                    ].join(" ")}
                    title={providerMeta.id}
                  >
                    {providerStatus.label}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-4">
              {/* Provider + model */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wide opacity-60">Provider</div>
                  <button
                    className={buttonClass("ghost")}
                    onClick={() => openSettings(aiProvider, "Configure in Settings")}
                    type="button"
                    title="Configure in Settings"
                  >
                    Configure in Settings
                  </button>
                </div>

                <select
                  className={inputClass(false)}
                  value={aiProvider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                >
                  {providerOptions.map((p) => {
                    return (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={!p.enabled && p.id !== aiProvider}
                      >
                        {p.label}
                        {p.suffix}
                      </option>
                    );
                  })}
                </select>

                <div className="text-xs opacity-60">
                  Providers are disabled until configured. Use <span className="opacity-90">Configure in Settings</span> to add an API key (and an endpoint where required).
                </div>

                {!providerReady && (
                  <div className="text-xs opacity-70 border border-zinc-800 rounded p-2 bg-zinc-900/40 flex items-center justify-between gap-2">
                    <div className="leading-snug">
                      {disabledProviderMessage(providerStatus)}
                    </div>
                    <button
                      className={buttonClass("ghost")}
                      onClick={() => openSettings(aiProvider, "Configure in Settings")}
                      type="button"
                    >
                      Configure in Settings
                    </button>
                  </div>
                )}

                <div className="text-xs uppercase tracking-wide opacity-60 mt-3">Model</div>
                <input
                  className={inputClass(!providerReady)}
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder={modelPlaceholder(aiProvider)}
                  list={`model-suggestions-${aiProvider}`}
                  disabled={!providerReady}
                />
                <datalist id={`model-suggestions-${aiProvider}`}>
                  {modelSuggestions.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>

                {showModelHelper && (
                  <div className="text-xs opacity-60">
                    {modelHelperText(aiProvider) ||
                      "Select a preset or enter a model ID. Some providers require manual model IDs."}
                  </div>
                )}
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wide opacity-60">Prompt</div>
                  <button
                    className={buttonClass("ghost", !activeTab || !providerReady)}
                    onClick={handleUseActiveFileAsPrompt}
                    disabled={!activeTab || !providerReady}
                    title="Copy active editor content into the prompt box"
                  >
                    Use Active File
                  </button>
                </div>
                <textarea
                  className={`${inputClass(!providerReady)} min-h-[120px]`}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Type your prompt…"
                  disabled={!providerReady}
                />
              </div>

              {/* System (optional) */}
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide opacity-60">System (optional)</div>
                <textarea
                  className={`${inputClass(!providerReady)} min-h-[70px]`}
                  value={aiSystem}
                  onChange={(e) => setAiSystem(e.target.value)}
                  placeholder="Optional system instruction…"
                  disabled={!providerReady}
                />
              </div>

              {/* Params */}
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide opacity-60">Parameters</div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs opacity-60 mb-1">Temperature</div>
                    <input
                      className={inputClass(!providerReady)}
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={aiTemperature}
                      onChange={(e) => setAiTemperature(Number(e.target.value))}
                      disabled={!providerReady}
                    />
                  </div>

                  <div>
                    <div className="text-xs opacity-60 mb-1">Max tokens</div>
                    <input
                      className={inputClass(!providerReady)}
                      type="number"
                      step="1"
                      min="1"
                      value={aiMaxTokens}
                      onChange={(e) => setAiMaxTokens(Number(e.target.value))}
                      disabled={!providerReady}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    className={buttonClass("primary", !providerReady || aiRunning)}
                    onClick={() => runAi()}
                    disabled={!providerReady || aiRunning}
                  >
                    {aiRunning ? "Running..." : "Send"}
                  </button>

                  <button
                    className={buttonClass("ghost", !providerReady || aiRunning)}
                    onClick={handleAiTest}
                    disabled={!providerReady || aiRunning}
                  >
                    Test
                  </button>
                </div>
              </div>

              {/* Output */}
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide opacity-60">Output</div>
                <textarea
                  className={`${inputClass(false)} min-h-[160px]`}
                  value={aiOutput}
                  readOnly
                  placeholder="Output will appear here…"
                />
              </div>

              {/* Ollama helper */}
              {aiProvider === "ollama" && (
                <div className="border border-zinc-800 rounded p-3 space-y-2">
                  <div className="text-sm font-semibold">Ollama Helper</div>
                  <div className="text-xs opacity-60">List local models using the Rust command.</div>
                  <button
                    className={buttonClass("ghost", aiRunning)}
                    onClick={async () => {
                      setAiTestOutput("Listing Ollama models...");
                      try {
                        const ep = (endpoints.ollama || "").trim();
                        const models = await invoke("ai_ollama_list_models", {
                          endpoint: ep ? ep : undefined
                        });
                        if (Array.isArray(models) && models.length > 0) {
                          setAiTestOutput(`Ollama models: ${models.join(", ")}`);
                        } else {
                          setAiTestOutput("Ollama models: (none found)");
                        }
                      } catch (err) {
                        setAiTestOutput(`Ollama list models failed: ${formatTauriError(err)}`);
                      }
                    }}
                    disabled={aiRunning}
                    type="button"
                  >
                    List Models
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-zinc-800 text-xs opacity-60">
              Provider: <span className="opacity-90">{aiProvider}</span> • Model:{" "}
              <span className="opacity-90">{aiModel || "(none)"}</span>
            </div>
          </div>
        ) : (
          // Collapsed rail (icon appears ONLY when panel is collapsed)
          <div className="w-10 border-l border-zinc-800 min-h-0 flex flex-col items-center justify-start py-2">
            <button
              className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs"
              onClick={() => setAiPanelOpen(true)}
              title="Show AI panel (Ctrl/Cmd+J)"
              type="button"
            >
              AI
            </button>

            <button
              className="mt-2 w-8 h-8 rounded bg-transparent border border-zinc-800 hover:bg-zinc-900 flex items-center justify-center"
              onClick={() => openSettings(null, "Opened from collapsed rail")}
              title="Settings"
              type="button"
            >
              <GearIcon className="w-4 h-4 text-zinc-200" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
