// src/ai/modelWorkflowPolicy.js
import {
  MODEL_CAPABILITIES,
  getModelRegistryEntry,
} from "./modelRegistry";

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
const CAPABILITY = MODEL_CAPABILITIES;

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

function isStableFirstPartyProvider(providerId) {
  const provider = normalize(providerId);

  return provider === "openai" || provider === "claude" || provider === "gemini";
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
  registryEntry = null,
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
    capability: registryEntry?.capability || CAPABILITY.UNCLASSIFIED,
    capabilityLabel: registryEntry?.capabilityLabel || "Unclassified",
    relativeCost: registryEntry?.relativeCost || "unknown",
    relativeCostLabel: registryEntry?.relativeCostLabel || "Cost unknown",

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

export function getModelWorkflowPolicy({
  providerId,
  modelId,
  presetRecord = null,
}) {
  const provider = normalize(providerId);
  const registryEntry = getModelRegistryEntry({
    providerId,
    modelId,
    presetRecord,
    metadataSource: presetRecord ? "remote" : "",
  });
  const tier = normalizeTier(registryEntry.tier);
  const capability = registryEntry.capability;

  if (capability === CAPABILITY.CHAT_AND_PLANNING) {
    return buildPolicy({
      mode: MODE.ADVISORY_ONLY,
      reason: "low_reliability_route",
      tier,
      providerId: provider,
      registryEntry,
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
        "Chat and planning: useful for questions, plans, manual guidance, demos, and safety testing. This model is not approved for automatic project editing; switch to a Project builder for normal implementation.",
    });
  }

  if (capability === CAPABILITY.PROJECT_BUILDER) {
    return buildPolicy({
      mode: MODE.FULL_AGENT,
      reason: "trusted_runtime",
      tier,
      providerId: provider,
      registryEntry,
      recommendedTaskKinds: [
        TASK.SIMPLE_QA,
        TASK.MANUAL_STEPS,
        TASK.PROJECT_EDIT,
        TASK.BROKEN_PREVIEW_DEBUG,
        TASK.MULTI_FILE_REFACTOR,
      ],
      notRecommendedTaskKinds: [],
      userHint:
        "Project builder: approved for normal project work. KForge write approval, path safety, and recovery safeguards still apply.",
    });
  }

  if (capability === CAPABILITY.TEST_MODE_EDITING) {
    return buildPolicy({
      mode: MODE.GUARDED_EDIT,
      reason: "guarded_runtime",
      tier,
      providerId: provider,
      registryEntry,
      recommendedTaskKinds: [
        TASK.SIMPLE_QA,
        TASK.MANUAL_STEPS,
        TASK.PLANNING,
      ],
      notRecommendedTaskKinds: [
        TASK.MULTI_FILE_REFACTOR,
      ],
      userHint:
        "Test-mode editing: suitable for lower-cost experiments, quick checks, and carefully supervised edits. For normal app building or important implementation, switch to a Project builder.",
    });
  }

  return buildPolicy({
    mode: MODE.GUARDED_EDIT,
    reason: isStableFirstPartyProvider(provider)
      ? "unverified_model_id"
      : "guarded_runtime",
    tier,
    providerId: provider,
    registryEntry,
    recommendedTaskKinds: [
      TASK.SIMPLE_QA,
      TASK.MANUAL_STEPS,
      TASK.PLANNING,
    ],
    notRecommendedTaskKinds: [
      TASK.PROJECT_EDIT,
      TASK.BROKEN_PREVIEW_DEBUG,
      TASK.MULTI_FILE_REFACTOR,
    ],
    userHint:
      "Unclassified: KForge has no approved capability record for this exact provider/model ID. It cannot silently use the normal Project builder route; continue only through the guarded test-mode choice.",
  });
}
