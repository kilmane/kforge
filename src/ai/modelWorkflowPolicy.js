// src/ai/modelWorkflowPolicy.js
import { MODEL_PRESETS } from "./modelPresets";

/**
 * Phase 6.5 — Smart Provider Switching
 *
 * Keep two ideas separate:
 *
 * 1. Permission mode:
 *    What KForge is allowed to let this model do.
 *
 * 2. Capability bands:
 *    Helpful labels for routing/guidance/UI.
 *
 * Existing callers still rely on:
 * mode, allowToolCalls, allowPatchPreview, forcePatchPreview, reason, tier
 */
export const MODEL_WORKFLOW_PERMISSION_MODES = Object.freeze({
  ADVISORY_ONLY: "advisory_only",
  GUARDED_EDIT: "guarded_edit",
  FULL_AGENT: "full_agent",
});

export const MODEL_WORKFLOW_CAPABILITY_BANDS = Object.freeze({
  ADVISORY_ONLY: "advisory_only",
  GUARDED_EDIT: "guarded_edit",
  FULL_AGENT: "full_agent",
  HEAVY_REASONING: "heavy_reasoning",
  CHEAP_FAST_CHAT: "cheap_fast_chat",
  LOCAL_EXPERIMENTAL: "local_experimental",
});

export const MODEL_TASK_KINDS = Object.freeze({
  SIMPLE_QA: "simple_qa",
  MANUAL_STEPS: "manual_steps",
  PROVIDER_SETUP: "provider_setup",
  PLANNING: "planning",
  PROJECT_EDIT: "project_edit",
  BROKEN_PREVIEW_DEBUG: "broken_preview_debug",
  MULTI_FILE_REFACTOR: "multi_file_refactor",
});

const MODE = MODEL_WORKFLOW_PERMISSION_MODES;
const BAND = MODEL_WORKFLOW_CAPABILITY_BANDS;
const TASK = MODEL_TASK_KINDS;

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeTier(value) {
  const v = normalize(value);
  return v || "unknown";
}

function uniqueList(values = []) {
  const out = [];
  const seen = new Set();

  for (const value of values) {
    const v = String(value || "").trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }

  return out;
}

function presetToRecord(item) {
  if (typeof item === "string") {
    const id = String(item || "").trim();
    return id ? { id, tier: "unknown" } : null;
  }

  if (!item || typeof item !== "object") return null;

  const id = String(item.id || "").trim();
  if (!id) return null;

  return {
    id,
    tier: normalizeTier(item.tier),
    usage: typeof item.usage === "string" ? item.usage.trim() : "",
    cost: typeof item.cost === "string" ? item.cost.trim() : "",
  };
}

function findPresetRecord(providerId, modelId) {
  const provider = normalize(providerId);
  const model = String(modelId || "").trim();
  const presets = Array.isArray(MODEL_PRESETS?.[provider])
    ? MODEL_PRESETS[provider]
    : [];

  for (const item of presets) {
    const record = presetToRecord(item);
    if (!record) continue;
    if (record.id === model) return record;
  }

  return null;
}

function isKnownFreeRoute(providerId, modelId) {
  const provider = normalize(providerId);
  const model = normalize(modelId);

  return (
    model === "openrouter/free" ||
    (provider === "openrouter" && model.endsWith(":free"))
  );
}

function inferTier(providerId, modelId) {
  const record = findPresetRecord(providerId, modelId);
  if (record?.tier) return normalizeTier(record.tier);

  if (isKnownFreeRoute(providerId, modelId)) return "free";

  return "unknown";
}

function isStableFirstPartyProvider(providerId) {
  const provider = normalize(providerId);

  return provider === "openai" || provider === "claude" || provider === "gemini";
}

function isGuardedRuntimeProvider(providerId) {
  const provider = normalize(providerId);

  return (
    provider === "openrouter" ||
    provider === "custom" ||
    provider === "groq" ||
    provider === "deepseek" ||
    provider === "mistral" ||
    provider === "ollama" ||
    provider === "lmstudio" ||
    provider === "ollama_cloud"
  );
}

function isLocalExperimentalProvider(providerId) {
  const provider = normalize(providerId);
  return provider === "ollama" || provider === "lmstudio";
}

function descriptiveCapabilityBands({ providerId, tier }) {
  const provider = normalize(providerId);
  const normalizedTier = normalizeTier(tier);
  const bands = [];

  if (normalizedTier === "heavy") {
    bands.push(BAND.HEAVY_REASONING);
  }

  if (
    normalizedTier === "free" ||
    normalizedTier === "sandbox" ||
    provider === "groq"
  ) {
    bands.push(BAND.CHEAP_FAST_CHAT);
  }

  if (isLocalExperimentalProvider(provider)) {
    bands.push(BAND.LOCAL_EXPERIMENTAL);
  }

  return bands;
}

function buildPolicy({
  mode,
  reason,
  tier,
  providerId,
  recommendedTaskKinds = [],
  notRecommendedTaskKinds = [],
  userHint = "",
}) {
  const allowToolCalls = mode === MODE.FULL_AGENT;
  const allowPatchPreview = mode !== MODE.ADVISORY_ONLY;
  const forcePatchPreview = mode === MODE.GUARDED_EDIT;

  return {
    mode,
    allowToolCalls,
    allowPatchPreview,
    forcePatchPreview,
    reason,
    tier,

    // Phase 6.5 additive fields for later UI/routing.
    allowDirectFileWrites: allowToolCalls,
    requiresPatchPreview: forcePatchPreview,
    capabilityBands: uniqueList([
      mode,
      ...descriptiveCapabilityBands({ providerId, tier }),
    ]),
    recommendedTaskKinds: uniqueList(recommendedTaskKinds),
    notRecommendedTaskKinds: uniqueList(notRecommendedTaskKinds),
    userHint,
  };
}

export function getModelWorkflowPolicy({ providerId, modelId }) {
  const provider = normalize(providerId);
  const model = normalize(modelId);
  const tier = inferTier(provider, modelId);

  if (provider === "mock" || isKnownFreeRoute(provider, model) || tier === "free") {
    return buildPolicy({
      mode: MODE.ADVISORY_ONLY,
      reason: "low_reliability_route",
      tier,
      providerId: provider,
      recommendedTaskKinds: [
        TASK.SIMPLE_QA,
        TASK.MANUAL_STEPS,
        TASK.PROVIDER_SETUP,
        TASK.PLANNING,
      ],
      notRecommendedTaskKinds: [
        TASK.PROJECT_EDIT,
        TASK.BROKEN_PREVIEW_DEBUG,
        TASK.MULTI_FILE_REFACTOR,
      ],
      userHint:
        "This model is safer for chat, planning, and manual guidance. For direct project edits, switch to a stronger coding-capable model.",
    });
  }

  if (isStableFirstPartyProvider(provider)) {
    if (tier === "sandbox") {
      return buildPolicy({
        mode: MODE.GUARDED_EDIT,
        reason: "guarded_runtime",
        tier,
        providerId: provider,
        recommendedTaskKinds: [
          TASK.SIMPLE_QA,
          TASK.MANUAL_STEPS,
          TASK.PLANNING,
        ],
        notRecommendedTaskKinds: [
          TASK.MULTI_FILE_REFACTOR,
        ],
        userHint:
          "This model is usable in guarded mode. KForge should prefer patch preview over direct file writes for project edits.",
      });
    }

    return buildPolicy({
      mode: MODE.FULL_AGENT,
      reason: "trusted_runtime",
      tier,
      providerId: provider,
      recommendedTaskKinds: [
        TASK.SIMPLE_QA,
        TASK.MANUAL_STEPS,
        TASK.PROJECT_EDIT,
        TASK.BROKEN_PREVIEW_DEBUG,
        TASK.MULTI_FILE_REFACTOR,
      ],
      notRecommendedTaskKinds: [],
      userHint:
        "This model is suitable for direct project edits, with KForge write guards still active.",
    });
  }

  if (
    isGuardedRuntimeProvider(provider) ||
    tier === "sandbox" ||
    tier === "unknown"
  ) {
    return buildPolicy({
      mode: MODE.GUARDED_EDIT,
      reason: "guarded_runtime",
      tier,
      providerId: provider,
      recommendedTaskKinds: [
        TASK.SIMPLE_QA,
        TASK.MANUAL_STEPS,
        TASK.PLANNING,
      ],
      notRecommendedTaskKinds: [
        TASK.MULTI_FILE_REFACTOR,
      ],
      userHint:
        "This provider/model should use guarded editing. Prefer patch preview or guidance before allowing direct writes.",
    });
  }

  return buildPolicy({
    mode: MODE.FULL_AGENT,
    reason: "trusted_runtime",
    tier,
    providerId: provider,
    recommendedTaskKinds: [
      TASK.SIMPLE_QA,
      TASK.MANUAL_STEPS,
      TASK.PROJECT_EDIT,
      TASK.BROKEN_PREVIEW_DEBUG,
      TASK.MULTI_FILE_REFACTOR,
    ],
    notRecommendedTaskKinds: [],
    userHint:
      "This model is suitable for direct project edits, with KForge write guards still active.",
  });
}
