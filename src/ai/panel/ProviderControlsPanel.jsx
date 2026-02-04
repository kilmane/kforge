// src/ai/panel/ProviderControlsPanel.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { fetchRemotePresetsV0WithCache } from "../remotePresets";
import { MODEL_PRESETS } from "../modelPresets";

// GitHub Pages docs (nice reading experience, no repo tree)
const CUSTOM_PROVIDER_DOCS_URL =
  "https://kilmane.github.io/kforge/custom_provider.html";
const MODELS_COLOR_LABELS_URL =
  "https://kilmane.github.io/kforge/MODELS_COLOR_LABELS.html";

async function openExternal(url) {
  try {
    // Use the same Rust-side browser opener style as the Help menu.
    await invoke("open_url", { url });
  } catch {
    // Fallback for web/dev mode
    window.open(url, "_blank", "noreferrer");
  }
}

function providerType(providerId) {
  const id = String(providerId || "").toLowerCase();
  if (id === "openai" || id === "gemini" || id === "claude") return "Stable";
  if (id === "deepseek" || id === "groq") return "Compatible";
  if (id === "openrouter") return "Aggregator";
  if (id === "ollama" || id === "lmstudio" || id === "mock") return "Local";
}

function ProviderTypeBadge({ kind }) {
  const k = kind || "Custom";
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] uppercase tracking-wide border border-zinc-800 bg-zinc-900/40 text-zinc-200">
      {k}
    </span>
  );
}
// Saved models cost tags (stored in localStorage)
const COST_TAGS = [
  "unknown",
  "free",
  "paid_sandbox",
  "paid_main",
  "paid_heavy",
];

function normalizeCost(raw) {
  const v = String(raw ?? "").trim();

  // migrate old values (from earlier versions)
  if (v === "Free") return "free";
  if (v === "Paid") return "paid_main";
  if (v === "Mixed") return "unknown";
  if (v === "Unknown") return "unknown";

  // accept new values
  if (COST_TAGS.includes(v)) return v;

  return "unknown";
}

function costLabel(cost) {
  const c = normalizeCost(cost);
  if (c === "free") return "🔵 Free";
  if (c === "paid_sandbox") return "🟢 Paid";
  if (c === "paid_main") return "🟡 Paid";
  if (c === "paid_heavy") return "🔴 Paid";
  return "⚪ Unknown";
}

function CostBadge({ tag }) {
  const t = normalizeCost(tag);

  const dotClass =
    t === "free"
      ? "bg-sky-400"
      : t === "paid_sandbox"
        ? "bg-emerald-400"
        : t === "paid_main"
          ? "bg-yellow-400"
          : t === "paid_heavy"
            ? "bg-rose-400"
            : "bg-zinc-500";

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] uppercase tracking-wide border border-zinc-800 bg-zinc-900/40 text-zinc-200">
      <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
      <span>{costLabel(t)}</span>
    </span>
  );
}

function normalizeModelId(v) {
  return String(v || "").trim();
}

// --- Tiered preset support (Sandbox/Main/Heavy) ---

const PRESET_TIERS = ["sandbox", "main", "heavy", "free", "unknown"];

function normalizeTier(tier) {
  const t = String(tier || "")
    .toLowerCase()
    .trim();
  return PRESET_TIERS.includes(t) ? t : "unknown";
}

function tierLabel(tier) {
  const t = normalizeTier(tier);
  if (t === "sandbox") return "Sandbox";
  if (t === "main") return "Main";
  if (t === "heavy") return "Heavy";
  if (t === "free") return "Free";
  return "Unknown";
}

function tierDotClass(tier) {
  const t = normalizeTier(tier);
  // Using background tones only; no custom colors beyond tailwind defaults.
  if (t === "sandbox") return "bg-emerald-400";
  if (t === "main") return "bg-yellow-400";
  if (t === "heavy") return "bg-rose-400";
  if (t === "free") return "bg-sky-400";
  return "bg-zinc-500";
}

function TierPill({ tier }) {
  const t = normalizeTier(tier);
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900/40 text-[11px] text-zinc-200">
      <span
        className={`inline-block w-2 h-2 rounded-full ${tierDotClass(t)}`}
      />
      <span className="uppercase tracking-wide">{tierLabel(t)}</span>
    </span>
  );
}

// Suggestion item can be:
// - "model-id"
// - { id: "model-id", tier: "sandbox|main|heavy|free|unknown", note?: string }
function suggestionToRecord(item) {
  if (typeof item === "string") {
    const id = normalizeModelId(item);
    return id ? { id, tier: "unknown", note: "" } : null;
  }
  if (item && typeof item === "object") {
    const id = normalizeModelId(item.id);
    if (!id) return null;
    return {
      id,
      tier: normalizeTier(item.tier),
      note: String(item.note || "").trim(),
    };
  }
  return null;
}

// For suggestion dedupe (and nicer UX), normalize provider-specific variants.
// NOTE: We only apply this to suggestions; the user can still type anything manually.
function normalizeSuggestionForProvider(providerId, v) {
  let s = normalizeModelId(v);
  const p = String(providerId || "").toLowerCase();

  if (p === "gemini") {
    // Collapse common Gemini variants so users don't see duplicates.
    if (s.startsWith("models/")) s = s.slice("models/".length);
    if (s.endsWith(":generateContent"))
      s = s.slice(0, -":generateContent".length);
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
      out.push({ id, cost: normalizeCost(r?.cost) });
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

function trimTrailingSlash(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "");
}

async function fetchJsonWithTimeout(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    const text = await resp.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: resp.ok, status: resp.status, json, text };
  } finally {
    clearTimeout(timer);
  }
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
  modelSuggestions, // can now be string[] or {id,tier,note}[]
  showModelHelper,
  modelHelperText,

  // ✅ NEW: endpoint for current provider (needed for LM Studio /v1/models)
  aiEndpoint,

  buttonClass,
}) {
  const pType = useMemo(() => providerType(aiProvider), [aiProvider]);

  // ✅ HARDEN: always treat model value as a string for UI + trim/compare
  const aiModelStr = useMemo(() => {
    if (typeof aiModel === "string") return aiModel;
    if (
      aiModel &&
      typeof aiModel === "object" &&
      typeof aiModel.id === "string"
    )
      return aiModel.id;
    return "";
  }, [aiModel]);

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

  // LM Studio list models state
  const [lmListBusy, setLmListBusy] = useState(false);
  const [lmListError, setLmListError] = useState("");
  const [remotePresets, setRemotePresets] = useState(null);
  useEffect(() => {
    let alive = true;

    (async () => {
      const loaded = await fetchRemotePresetsV0WithCache();
      if (!alive) return;
      setRemotePresets(loaded); // may be null; that's fine
      if (process.env.NODE_ENV === "development" && loaded) {
        const source = loaded.cached_at ? "cache" : "remote";
        const when = loaded.updated_at || loaded.cached_at || "unknown time";
        console.info(
          `[kforge] presets loaded (${source}) — updated_at: ${when}`,
        );
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

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

    setLmListBusy(false);
    setLmListError("");
  }, [aiProvider]);

  // One-time restore only when provider changes
  useEffect(() => {
    if (restoredForProviderRef.current === aiProvider) return;
    restoredForProviderRef.current = aiProvider;

    try {
      const last = normalizeModelId(
        localStorage.getItem(lastSelectedKey(aiProvider)),
      );
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

    const cur = normalizeModelId(aiModelStr);
    if (!cur) return;

    try {
      localStorage.setItem(lastSelectedKey(aiProvider), cur);
    } catch {
      // ignore
    }
  }, [aiProvider, aiModelStr]);

  const userModelIds = useMemo(() => userModels.map((r) => r.id), [userModels]);

  // Build preset records (tiered)
  const presetRecords = useMemo(() => {
    const remote = remotePresets?.providers?.[aiProvider];
    const local = MODEL_PRESETS?.[aiProvider];
    const recs = (remote ?? local ?? [])
      .map(suggestionToRecord)
      .filter(Boolean);

    // Provider normalization (Gemini variants etc.) applied to the id
    const normalized = recs.map((r) => ({
      ...r,
      id: normalizeSuggestionForProvider(aiProvider, r.id),
    }));

    // Dedupe by id (keep the first occurrence, preserves order)
    const seen = new Set();
    const out = [];
    for (const r of normalized) {
      if (!r?.id) continue;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
    return out;
  }, [aiProvider, modelSuggestions]);

  // Suggestions shown in dropdown = presets + user saved
  const presetsWhen =
    remotePresets?.updated_at || remotePresets?.cached_at || "";
  const presetsTooltip = remotePresets
    ? `Remote presets ${remotePresets?.updated_at ? "updated" : "cached"}${presetsWhen ? `: ${presetsWhen}` : ""}`
    : "Using built-in presets (offline or not fetched yet)";

  const suggestionRecords = useMemo(() => {
    // Convert user models to “unknown tier” suggestion records
    const userAsRecords = userModelIds
      .map((id) => normalizeSuggestionForProvider(aiProvider, id))
      .filter(Boolean)
      .map((id) => ({ id, tier: "unknown", note: "" }));

    // Merge + dedupe by id (presets first)
    const merged = [...presetRecords, ...userAsRecords];
    const seen = new Set();
    const out = [];
    for (const r of merged) {
      if (!r?.id) continue;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
    return out;
  }, [aiProvider, presetRecords, userModelIds]);

  const filteredUserModels = useMemo(() => {
    if (filter === "All") return userModels;
    if (filter === "Free")
      return userModels.filter((r) => normalizeCost(r.cost) === "free");
    if (filter === "Paid")
      return userModels.filter((r) =>
        normalizeCost(r.cost).startsWith("paid_"),
      );
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

    const next = [{ id, cost: "unknown" }, ...userModels];
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
    const next = userModels.map((r) =>
      r.id === target ? { ...r, cost: normalizeCost(cost) } : r,
    );
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

    if (normalizeModelId(aiModelStr) === from) {
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

  // ✅ LM Studio: List models from /v1/models and add into “My models”
  async function listLmStudioModels() {
    if (!providerReady) return;
    const endpoint = trimTrailingSlash(aiEndpoint);
    if (!endpoint) {
      setLmListError(
        "Missing LM Studio endpoint. Configure it in Settings first.",
      );
      return;
    }

    setLmListError("");
    setLmListBusy(true);

    try {
      const url = `${endpoint}/v1/models`;
      const res = await fetchJsonWithTimeout(url, 9000);

      if (!res.ok) {
        const msg =
          (res.json && (res.json.error?.message || res.json.message)) ||
          res.text ||
          `HTTP ${res.status}`;
        setLmListError(`LM Studio list failed: ${msg}`);
        return;
      }

      // OpenAI-style: { data: [{ id: "..." }, ...] }
      const data = res.json?.data;
      if (!Array.isArray(data)) {
        setLmListError("LM Studio returned unexpected JSON (missing data[]).");
        return;
      }

      const ids = data.map((m) => normalizeModelId(m?.id)).filter(Boolean);

      if (ids.length === 0) {
        setLmListError(
          "LM Studio returned 0 models. Make sure a model is loaded in LM Studio.",
        );
        return;
      }

      // Merge into userModels (keep existing tags)
      const existing = new Set(userModels.map((r) => r.id));
      const toAdd = [];
      for (const id of ids) {
        if (existing.has(id)) continue;
        toAdd.push({ id, cost: "unknown" });
      }

      if (toAdd.length > 0) {
        setUserModels([...toAdd, ...userModels]);
      }

      // If current model is empty, set it to first returned id
      if (!normalizeModelId(aiModelStr)) {
        isEditingModelInputRef.current = false;
        setAiModel(ids[0]);
      }
    } catch (e) {
      const msg = String(e?.message || e);
      setLmListError(
        msg.includes("AbortError")
          ? "LM Studio list timed out."
          : `LM Studio list failed: ${msg}`,
      );
    } finally {
      setLmListBusy(false);
    }
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
          <div className="text-xs uppercase tracking-wide opacity-60">
            Provider
          </div>
          <ProviderTypeBadge kind={pType} />
        </div>

        <button
          className={buttonClass("ghost")}
          onClick={() => openSettings(aiProvider, "Configure in Settings")}
          type="button"
        >
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
            <option
              key={p.id}
              value={p.id}
              disabled={!p.enabled && p.id !== aiProvider}
            >
              {p.label}
              {p.suffix} ({k})
            </option>
          );
        })}
      </select>

      {/* OpenRouter note (free models can rotate) */}
      {aiProvider === "openrouter" && (
        <div className="mt-2 text-[11px] opacity-60">
          ℹ️ OpenRouter free models may rotate or be deprecated. You can always
          add model IDs manually.
        </div>
      )}

      {/* Custom: suggested models (docs link, not presets) */}
      {/* Custom provider note */}
      {aiProvider === "custom" && (
        <div className="mt-2 text-[11px] opacity-60">
          ℹ️ Custom endpoints require manual model IDs.
        </div>
      )}

      {!providerReady && (
        <div className="text-xs opacity-70 border border-zinc-800 rounded p-2 bg-zinc-900/40 flex justify-between gap-2">
          <div>{disabledProviderMessage(providerStatus)}</div>
          <button
            className={buttonClass("ghost")}
            onClick={() => openSettings(aiProvider, "Configure in Settings")}
            type="button"
          >
            Configure
          </button>
        </div>
      )}

      {/* Filter row */}
      <div className="flex items-center justify-end mt-3">
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
          <span className="uppercase tracking-wide opacity-60">
            My models{" "}
            <span className="normal-case opacity-60">
              (Click a model to use it)
            </span>
          </span>

          <button
            type="button"
            className="text-[11px] text-orange-400 hover:text-orange-300 underline underline-offset-2"
            onClick={() => openExternal(MODELS_COLOR_LABELS_URL)}
          >
            What do these labels mean?
          </button>
        </div>

        {filteredUserModels.length === 0 ? (
          <div className="mt-2 opacity-60">
            {userModels.length === 0
              ? "None saved yet."
              : "No models match filter."}
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {filteredUserModels.map((r) => {
              const isActive = normalizeModelId(aiModelStr) === r.id;

              return (
                <div
                  key={r.id}
                  className={[
                    "flex items-center justify-between gap-2 rounded border px-2 py-1",
                    isActive
                      ? "border-zinc-600 bg-zinc-900/55"
                      : "border-zinc-800 bg-zinc-900/40",
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
                        <button
                          className={buttonClass("ghost")}
                          type="button"
                          onClick={commitRename}
                          disabled={!providerReady || !renameDraft.trim()}
                        >
                          Save
                        </button>
                        <button
                          className={buttonClass("ghost")}
                          type="button"
                          onClick={cancelRename}
                        >
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
                              : "border-zinc-800 bg-zinc-900/50 text-zinc-200 hover:bg-zinc-800/40",
                          ].join(" ")}
                          title="Use this model"
                        >
                          {r.id}
                        </button>
                        <CostBadge tag={r.cost} />
                        {isActive && (
                          <span className="text-[11px] opacity-70">Active</span>
                        )}
                      </>
                    )}
                  </div>

                  {editingId !== r.id && (
                    <div className="flex items-center gap-2">
                      <select
                        className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-100"
                        value={normalizeCost(r.cost)}
                        onChange={(e) => setModelCost(r.id, e.target.value)}
                        disabled={!providerReady}
                        title="Set cost tag"
                      >
                        {COST_TAGS.map((t) => (
                          <option key={t} value={t}>
                            {costLabel(t)}
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
        <button
          className={buttonClass()}
          onClick={addModel}
          disabled={!providerReady || !draftModel.trim()}
          type="button"
        >
          Add
        </button>
      </div>

      {/* Freeform model input + dropdown suggestions */}
      <div className="space-y-1" ref={suggestionsWrapRef}>
        <div className="relative">
          <input
            className={[
              "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 pr-16",
              !providerReady ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
            value={aiModelStr}
            onChange={(e) => {
              isEditingModelInputRef.current = true;
              setAiModel(String(e.target.value || ""));
            }}
            onBlur={() => {
              isEditingModelInputRef.current = false;
            }}
            placeholder={modelPlaceholder(aiProvider)}
            disabled={!providerReady}
          />

          {/* Clear */}
          {!!aiModelStr.trim() && providerReady && (
            <button
              type="button"
              className="absolute right-12 top-1/2 -translate-y-1/2 text-yellow-400 hover:text-zinc-200"
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
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              className={[
                "absolute right-2 top-1/2 -translate-y-1/2 text-xs rounded border px-2 py-1",
                "border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/40",
                !providerReady ? "opacity-60 cursor-not-allowed" : "",
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
        </div>

        {suggestionsOpen && (
          <div className="max-h-64 overflow-auto rounded border border-zinc-800 bg-zinc-950/90 shadow-sm">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] border-b border-zinc-900/60 opacity-80">
              <span
                title={presetsTooltip}
                className="cursor-help text-sm text-yellow-300 opacity-90"
                aria-label="Remote presets info"
              >
                ⓘ
              </span>
            </div>

            {suggestionRecords.length === 0 ? (
              <div className="px-2 py-2 text-xs opacity-70">
                No suggestions for this provider.
              </div>
            ) : (
              <div className="flex flex-col">
                {suggestionRecords.map((r) => {
                  const isActive = normalizeModelId(aiModelStr) === r.id;
                  const title = r.note ? r.note : "Use this model";

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => pickSuggestion(r.id)}
                      className={[
                        "text-left px-2 py-1.5 text-xs border-b border-zinc-900/60",
                        isActive
                          ? "bg-zinc-800/40 text-zinc-100"
                          : "hover:bg-zinc-800/30 text-zinc-200",
                      ].join(" ")}
                      title={title}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{r.id}</span>
                        <TierPill tier={r.tier} />
                      </div>
                      {r.note ? (
                        <div className="mt-0.5 text-[11px] opacity-60">
                          {r.note}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
