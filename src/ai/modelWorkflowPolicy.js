// src/ai/modelWorkflowPolicy.js
import { MODEL_PRESETS } from "./modelPresets";

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeTier(value) {
  const v = normalize(value);
  return v || "unknown";
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

function inferTier(providerId, modelId) {
  const record = findPresetRecord(providerId, modelId);
  if (record?.tier) return normalizeTier(record.tier);

  const model = normalize(modelId);
  if (model === "openrouter/free") return "free";

  return "unknown";
}

export function getModelWorkflowPolicy({ providerId, modelId }) {
  const provider = normalize(providerId);
  const model = normalize(modelId);
  const tier = inferTier(provider, modelId);

  const stableFirstParty =
    provider === "openai" || provider === "claude" || provider === "gemini";

  if (provider === "mock" || model === "openrouter/free" || tier === "free") {
    return {
      mode: "advisory_only",
      allowToolCalls: false,
      allowPatchPreview: false,
      forcePatchPreview: false,
      reason: "low_reliability_route",
      tier,
    };
  }

  if (stableFirstParty) {
    if (tier === "sandbox") {
      return {
        mode: "guarded_edit",
        allowToolCalls: false,
        allowPatchPreview: true,
        forcePatchPreview: true,
        reason: "guarded_runtime",
        tier,
      };
    }

    return {
      mode: "full_agent",
      allowToolCalls: true,
      allowPatchPreview: true,
      forcePatchPreview: false,
      reason: "trusted_runtime",
      tier,
    };
  }

  if (
    provider === "openrouter" ||
    provider === "custom" ||
    provider === "groq" ||
    provider === "deepseek" ||
    provider === "mistral" ||
    provider === "ollama" ||
    provider === "lmstudio" ||
    provider === "ollama_cloud" ||
    tier === "sandbox" ||
    tier === "unknown"
  ) {
    return {
      mode: "guarded_edit",
      allowToolCalls: false,
      allowPatchPreview: true,
      forcePatchPreview: true,
      reason: "guarded_runtime",
      tier,
    };
  }

  return {
    mode: "full_agent",
    allowToolCalls: true,
    allowPatchPreview: true,
    forcePatchPreview: false,
    reason: "trusted_runtime",
    tier,
  };
}
