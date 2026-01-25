// src/ai/panel/ProviderControlsPanel.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

function providerType(providerId) {
  const id = String(providerId || "").toLowerCase();
  if (id === "openai" || id === "gemini" || id === "claude") return "Stable";
  if (id === "deepseek" || id === "groq") return "Compatible";
  if (id === "openrouter") return "Aggregator";
  if (id === "ollama" || id === "lmstudio" || id === "mock") return "Local";
  if (id === "custom" || id === "huggingface") return "Custom";
  return "Custom";
}

function ProviderTypeBadge({ kind }) {
  const k = kind || "Custom";
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] uppercase tracking-wide border border-zinc-800 bg-zinc-900/40 text-zinc-200">
      {k}
    </span>
  );
}

const COST_TAGS = ["Unknown", "Free", "Paid", "Mixed"];

function CostBadge({ tag }) {
  const t = COST_TAGS.includes(tag) ? tag : "Unknown";
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] uppercase tracking-wide border border-zinc-800 bg-zinc-900/40 text-zinc-200">
      {t}
    </span>
  );
}

function normalizeModelId(v) {
  return String(v || "").trim();
}

// For suggestion dedupe (and nicer UX), normalize provider-specific variants.
// NOTE: We only apply this to suggestions; the user can still type anything manually.
function normalizeSuggestionForProvider(providerId, v) {
  let s = normalizeModelId(v);
  const p = String(providerId || "").toLowerCase();

  if (p === "gemini") {
    // Collapse common Gemini variants so users don't see duplicates.
    // Accept:
    // - gemini-2.5-flash
    // - models/gemini-2.5-flash
    // - models/gemini-2.5-flash:generateContent
    if (s.startsWith("models/")) s = s.slice("models/".length);
    if (s.endsWith(":generateContent")) s = s.slice(0, -":generateContent".length);
    s = s.trim();
  }

  return s;
}

function loadUserModelRecords(providerId) {
  const key = `kforge.userModels.v2.${providerId}`;
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    const out = [];
    for (const r of parsed) {
      const id = normalizeModelId(r?.id);
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, cost: COST_TAGS.includes(r?.cost) ? r.cost : "Unknown" });
    }
    return out;
  } catch {
    return [];
  }
}

function saveUserModelRecords(providerId, records) {
  const key = `kforge.userModels.v2.${providerId}`;
  try {
    localStorage.setItem(key, JSON.stringify(records || []));
  } catch {
    // ignore
  }
}

function lastSelectedKey(providerId) {
  return `kforge.lastModel.${providerId}`;
}

export default function ProviderControlsPanel({
  providerOptions,
  handleProviderChange,
  providerStatus,
  disabledProviderMessage,

  aiProvider,
  providerReady,
  openSettings,

  aiModel,
  setAiModel,
  modelPlaceholder,
  modelSuggestions,
  showModelHelper,
  modelHelperText,

  buttonClass
}) {
  const pType = useMemo(() => providerType(aiProvider), [aiProvider]);

  const [userModels, setUserModels] = useState([]); // [{id,cost}]
  const [draftModel, setDraftModel] = useState("");
  const [filter, setFilter] = useState("All"); // All | Free | Paid

  // Rename UI state
  const [editingId, setEditingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");

  // Track user editing to prevent any auto-restore/persist fighting
  const isEditingModelInputRef = useRef(false);
  const restoredForProviderRef = useRef(null);

  // Dropdown for suggestions
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggestionsWrapRef = useRef(null);

  // Load when provider changes
  useEffect(() => {
    setUserModels(loadUserModelRecords(aiProvider));
    setDraftModel("");
    setFilter("All");
    setEditingId(null);
    setRenameDraft("");

    isEditingModelInputRef.current = false;
    restoredForProviderRef.current = null;

    setSuggestionsOpen(false);
  }, [aiProvider]);

  // One-time restore only when provider changes
  useEffect(() => {
    if (restoredForProviderRef.current === aiProvider) return;
    restoredForProviderRef.current = aiProvider;

    try {
      const last = normalizeModelId(localStorage.getItem(lastSelectedKey(aiProvider)));
      if (last) setAiModel(last);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiProvider]);

  // Persist saved models list
  useEffect(() => {
    saveUserModelRecords(aiProvider, userModels);
  }, [aiProvider, userModels]);

  // Persist last selected model, but never while user is editing, and never persist empty
  useEffect(() => {
    if (isEditingModelInputRef.current) return;

    const cur = normalizeModelId(aiModel);
    if (!cur) return;

    try {
      localStorage.setItem(lastSelectedKey(aiProvider), cur);
    } catch {
      // ignore
    }
  }, [aiProvider, aiModel]);

  const userModelIds = useMemo(() => userModels.map((r) => r.id), [userModels]);

  const allSuggestions = useMemo(() => {
    const mergedRaw = [...(modelSuggestions || []), ...userModelIds];
    const normalized = mergedRaw
      .map((m) => normalizeSuggestionForProvider(aiProvider, m))
      .filter(Boolean);

    // de-dupe while preserving order
    const seen = new Set();
    const out = [];
    for (const m of normalized) {
      if (seen.has(m)) continue;
      seen.add(m);
      out.push(m);
    }
    return out;
  }, [aiProvider, modelSuggestions, userModelIds]);

  const currentCostTag = useMemo(() => {
    const cur = normalizeModelId(aiModel);
    const found = userModels.find((r) => r.id === cur);
    return found?.cost || "Unknown";
  }, [aiModel, userModels]);

  const filteredUserModels = useMemo(() => {
    if (filter === "All") return userModels;
    if (filter === "Free") return userModels.filter((r) => r.cost === "Free");
    if (filter === "Paid") return userModels.filter((r) => r.cost === "Paid");
    return userModels;
  }, [userModels, filter]);

  function addModel() {
    if (!providerReady) return;
    const id = normalizeModelId(draftModel);
    if (!id) return;

    if (userModels.some((r) => r.id === id)) {
      isEditingModelInputRef.current = false;
      setAiModel(id);
      setDraftModel("");
      return;
    }

    const next = [{ id, cost: "Unknown" }, ...userModels];
    setUserModels(next);

    isEditingModelInputRef.current = false;
    setAiModel(id);
    setDraftModel("");
  }

  function removeModel(id) {
    const target = normalizeModelId(id);
    if (!target) return;
    setUserModels(userModels.filter((r) => r.id !== target));
  }

  function setModelCost(id, cost) {
    const target = normalizeModelId(id);
    if (!target) return;
    const next = userModels.map((r) => (r.id === target ? { ...r, cost } : r));
    setUserModels(next);
  }

  function startRename(id) {
    const target = normalizeModelId(id);
    if (!target) return;
    setEditingId(target);
    setRenameDraft(target);
  }

  function cancelRename() {
    setEditingId(null);
    setRenameDraft("");
  }

  function commitRename() {
    if (!providerReady) return;
    const from = normalizeModelId(editingId);
    const to = normalizeModelId(renameDraft);
    if (!from || !to) return;

    if (from === to) {
      cancelRename();
      return;
    }

    if (userModels.some((r) => r.id === to)) return;

    const next = userModels.map((r) => (r.id === from ? { ...r, id: to } : r));
    setUserModels(next);

    if (normalizeModelId(aiModel) === from) {
      isEditingModelInputRef.current = false;
      setAiModel(to);
    }

    cancelRename();
  }

  function selectModel(id) {
    const target = normalizeModelId(id);
    if (!target) return;
    isEditingModelInputRef.current = false;
    setAiModel(target);
  }

  function pickSuggestion(id) {
    const target = normalizeModelId(id);
    if (!target) return;
    isEditingModelInputRef.current = false;
    setAiModel(target);
    setSuggestionsOpen(false);
  }

  // Close suggestions on click outside
  useEffect(() => {
    if (!suggestionsOpen) return;

    const onDown = (e) => {
      const root = suggestionsWrapRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setSuggestionsOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [suggestionsOpen]);

  return (
    <div className="space-y-3">
      {/* Provider */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs uppercase tracking-wide opacity-60">Provider</div>
          <ProviderTypeBadge kind={pType} />
        </div>

        <button className={buttonClass("ghost")} onClick={() => openSettings(aiProvider, "Configure in Settings")} type="button">
          Configure in Settings
        </button>
      </div>

      <select
        className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100"
        value={aiProvider}
        onChange={(e) => handleProviderChange(e.target.value)}
      >
        {providerOptions.map((p) => {
          const k = providerType(p.id);
          return (
            <option key={p.id} value={p.id} disabled={!p.enabled && p.id !== aiProvider}>
              {p.label}
              {p.suffix} ({k})
            </option>
          );
        })}
      </select>

      {!providerReady && (
        <div className="text-xs opacity-70 border border-zinc-800 rounded p-2 bg-zinc-900/40 flex justify-between gap-2">
          <div>{disabledProviderMessage(providerStatus)}</div>
          <button className={buttonClass("ghost")} onClick={() => openSettings(aiProvider, "Configure in Settings")} type="button">
            Configure
          </button>
        </div>
      )}

      {/* Model header */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <div className="text-xs uppercase tracking-wide opacity-60">Model</div>
          <CostBadge tag={currentCostTag} />
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs opacity-60">Filter:</div>
          <select
            className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-100"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            disabled={!providerReady}
            title="Filter My models list"
          >
            <option value="All">All</option>
            <option value="Free">Free</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>

      {/* My models */}
      <div className="text-xs opacity-70">
        <div className="flex items-center justify-between">
          <span className="uppercase tracking-wide opacity-60">My models</span>
          <span className="opacity-60">Click a model to use it</span>
        </div>

        {filteredUserModels.length === 0 ? (
          <div className="mt-2 opacity-60">{userModels.length === 0 ? "None saved yet." : "No models match filter."}</div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {filteredUserModels.map((r) => {
              const isActive = normalizeModelId(aiModel) === r.id;

              return (
                <div
                  key={r.id}
                  className={[
                    "flex items-center justify-between gap-2 rounded border px-2 py-1",
                    isActive ? "border-zinc-600 bg-zinc-900/55" : "border-zinc-800 bg-zinc-900/40"
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {editingId === r.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-100"
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          disabled={!providerReady}
                        />
                        <button className={buttonClass("ghost")} type="button" onClick={commitRename} disabled={!providerReady || !renameDraft.trim()}>
                          Save
                        </button>
                        <button className={buttonClass("ghost")} type="button" onClick={cancelRename}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => selectModel(r.id)}
                          disabled={!providerReady}
                          className={[
                            "text-xs px-2 py-1 rounded border truncate",
                            isActive
                              ? "border-zinc-600 bg-zinc-800/60 text-zinc-100"
                              : "border-zinc-800 bg-zinc-900/50 text-zinc-200 hover:bg-zinc-800/40"
                          ].join(" ")}
                          title="Use this model"
                        >
                          {r.id}
                        </button>
                        <CostBadge tag={r.cost} />
                        {isActive && <span className="text-[11px] opacity-70">Active</span>}
                      </>
                    )}
                  </div>

                  {editingId !== r.id && (
                    <div className="flex items-center gap-2">
                      <select
                        className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-100"
                        value={r.cost}
                        onChange={(e) => setModelCost(r.id, e.target.value)}
                        disabled={!providerReady}
                        title="Set cost tag"
                      >
                        {COST_TAGS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        className="text-xs opacity-80 hover:opacity-95"
                        onClick={() => startRename(r.id)}
                        disabled={!providerReady}
                        title="Rename saved model"
                      >
                        ✎
                      </button>

                      <button
                        type="button"
                        className="text-xs opacity-80 hover:opacity-95"
                        onClick={() => removeModel(r.id)}
                        disabled={!providerReady}
                        title="Remove saved model"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add model input */}
      <div className="flex gap-2">
        <input
          className="flex-1 px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100"
          placeholder="Add model ID (saved per provider)"
          value={draftModel}
          onChange={(e) => setDraftModel(e.target.value)}
          disabled={!providerReady}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addModel();
            }
          }}
        />
        <button className={buttonClass()} onClick={addModel} disabled={!providerReady || !draftModel.trim()} type="button">
          Add
        </button>
      </div>

      {/* Freeform model input + dropdown suggestions */}
      <div className="space-y-1" ref={suggestionsWrapRef}>
        <div className="relative">
          <input
            className={[
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 pr-16",
              !providerReady ? "opacity-60 cursor-not-allowed" : ""
            ].join(" ")}
            value={aiModel}
            onChange={(e) => {
              isEditingModelInputRef.current = true;
              setAiModel(e.target.value);
            }}
            onBlur={() => {
              isEditingModelInputRef.current = false;
            }}
            placeholder={modelPlaceholder(aiProvider)}
            disabled={!providerReady}
          />

          {/* Clear */}
          {!!aiModel.trim() && providerReady && (
            <button
              type="button"
              className="absolute right-9 top-1/2 -translate-y-1/2 text-xs opacity-70 hover:opacity-95"
              title="Clear model"
              onClick={() => {
                isEditingModelInputRef.current = false;
                setAiModel("");
              }}
            >
              ×
            </button>
          )}

          {/* Dropdown toggle */}
          <button
            type="button"
            className={[
              "absolute right-2 top-1/2 -translate-y-1/2 text-xs rounded border px-2 py-1",
              "border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/40",
              !providerReady ? "opacity-60 cursor-not-allowed" : ""
            ].join(" ")}
            disabled={!providerReady}
            title="Show suggested models"
            onClick={() => {
              setSuggestionsOpen((v) => !v);
            }}
          >
            ▼
          </button>
        </div>

        {suggestionsOpen && (
          <div
            ref={suggestionsWrapRef}
            className="max-h-56 overflow-auto rounded border border-zinc-800 bg-zinc-950/90 shadow-sm"
          >
            {allSuggestions.length === 0 ? (
              <div className="px-2 py-2 text-xs opacity-70">No suggestions for this provider.</div>
            ) : (
              <div className="flex flex-col">
                {allSuggestions.map((m) => {
                  const isActive = normalizeModelId(aiModel) === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => pickSuggestion(m)}
                      className={[
                        "text-left px-2 py-1.5 text-xs border-b border-zinc-900/60",
                        isActive ? "bg-zinc-800/40 text-zinc-100" : "hover:bg-zinc-800/30 text-zinc-200"
                      ].join(" ")}
                      title="Use this model"
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showModelHelper && (
        <div className="text-xs opacity-60">
          {modelHelperText(aiProvider) ||
            "Select a preset or enter a model ID. Save models, tag them (Free/Paid), and filter quickly when credits run out."}
        </div>
      )}
    </div>
  );
}
