import { MODEL_PRESETS } from "./modelPresets";

export const MODEL_CAPABILITIES = Object.freeze({
  PROJECT_BUILDER: "project_builder",
  TEST_MODE_EDITING: "test_mode_editing",
  CHAT_AND_PLANNING: "chat_and_planning",
  UNCLASSIFIED: "unclassified",
});

export const MODEL_RELATIVE_COSTS = Object.freeze({
  FREE: "free",
  LOWER: "lower",
  MEDIUM: "medium",
  HIGHER: "higher",
  UNKNOWN: "unknown",
});

export const KFORGE_WORKING_MODES = Object.freeze({
  TEST: "test",
  PROJECT_BUILDER: "project_builder",
});

export const NEW_USER_MODEL_SELECTION = Object.freeze({
  workingMode: KFORGE_WORKING_MODES.TEST,
  providerId: "openai",
  modelId: "gpt-5.6-luna",
});

const CAPABILITY = MODEL_CAPABILITIES;
const COST = MODEL_RELATIVE_COSTS;

const APPROVED_MODEL_CAPABILITIES = Object.freeze({
  openai: Object.freeze({
    "gpt-5.6-luna": CAPABILITY.TEST_MODE_EDITING,
    "gpt-5.6-terra": CAPABILITY.PROJECT_BUILDER,
    "gpt-5.6-sol": CAPABILITY.PROJECT_BUILDER,
  }),
  claude: Object.freeze({
    "claude-haiku-4-5": CAPABILITY.TEST_MODE_EDITING,
    "claude-sonnet-5": CAPABILITY.PROJECT_BUILDER,
    "claude-opus-4-8": CAPABILITY.PROJECT_BUILDER,
    "claude-fable-5": CAPABILITY.PROJECT_BUILDER,
  }),
  gemini: Object.freeze({
    "gemini-3.5-flash-lite": CAPABILITY.TEST_MODE_EDITING,
    "gemini-3.6-flash": CAPABILITY.PROJECT_BUILDER,
    "gemini-3.1-pro-preview": CAPABILITY.PROJECT_BUILDER,
  }),
  deepseek: Object.freeze({
    "deepseek-v4-flash": CAPABILITY.TEST_MODE_EDITING,
    "deepseek-v4-pro": CAPABILITY.TEST_MODE_EDITING,
  }),
  groq: Object.freeze({
    "openai/gpt-oss-20b": CAPABILITY.TEST_MODE_EDITING,
    "openai/gpt-oss-120b": CAPABILITY.TEST_MODE_EDITING,
  }),
  mistral: Object.freeze({
    "mistral-small-latest": CAPABILITY.TEST_MODE_EDITING,
    "devstral-small-latest": CAPABILITY.TEST_MODE_EDITING,
  }),
  ollama: Object.freeze({
    "qwen2.5-coder:1.5b": CAPABILITY.TEST_MODE_EDITING,
    "qwen2.5-coder:7b": CAPABILITY.TEST_MODE_EDITING,
    "devstral-small-2": CAPABILITY.TEST_MODE_EDITING,
    "gpt-oss:20b": CAPABILITY.TEST_MODE_EDITING,
  }),
  openrouter: Object.freeze({
    "openrouter/free": CAPABILITY.CHAT_AND_PLANNING,
  }),
  custom: Object.freeze({
    "openrouter/free": CAPABILITY.CHAT_AND_PLANNING,
    "deepseek-v4-flash": CAPABILITY.TEST_MODE_EDITING,
    "openai/gpt-oss-20b": CAPABILITY.TEST_MODE_EDITING,
    "mistral-small-latest": CAPABILITY.TEST_MODE_EDITING,
    "devstral-small-latest": CAPABILITY.TEST_MODE_EDITING,
  }),
  mock: Object.freeze({
    "mock-1": CAPABILITY.CHAT_AND_PLANNING,
  }),
});

function normalizeProviderId(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeModelId(value) {
  return String(value || "").trim();
}

function normalizeTier(value) {
  const tier = String(value || "")
    .trim()
    .toLowerCase();
  return ["sandbox", "main", "heavy", "free"].includes(tier)
    ? tier
    : "unknown";
}

function isKnownFreeRoute(providerId, modelId) {
  const provider = normalizeProviderId(providerId);
  const model = normalizeModelId(modelId).toLowerCase();
  return (
    model === "openrouter/free" ||
    (provider === "openrouter" && model.endsWith(":free"))
  );
}

function findBundledPreset(providerId, modelId) {
  const provider = normalizeProviderId(providerId);
  const model = normalizeModelId(modelId);
  const presets = Array.isArray(MODEL_PRESETS?.[provider])
    ? MODEL_PRESETS[provider]
    : [];

  return (
    presets.find((preset) => {
      const id =
        typeof preset === "string"
          ? normalizeModelId(preset)
          : normalizeModelId(preset?.id);
      return id === model;
    }) || null
  );
}

function presetToRecord(preset) {
  if (typeof preset === "string") {
    const id = normalizeModelId(preset);
    return id ? { id, tier: "unknown", note: "", usage: "", cost: "" } : null;
  }

  if (!preset || typeof preset !== "object") return null;
  const id = normalizeModelId(preset.id);
  if (!id) return null;

  return {
    id,
    tier: normalizeTier(preset.tier || preset.usage),
    note: String(preset.note || "").trim(),
    usage: String(preset.usage || "").trim(),
    cost: String(preset.cost || "").trim(),
  };
}

export function normalizeRelativeCost(rawCost, fallbackTier = "unknown") {
  const cost = String(rawCost || "")
    .trim()
    .toLowerCase();

  if (cost === "free") return COST.FREE;
  if (
    cost === "paid_sandbox" ||
    cost === "sandbox" ||
    cost === "lower" ||
    cost === "lower_cost"
  ) {
    return COST.LOWER;
  }
  if (
    cost === "paid_main" ||
    cost === "main" ||
    cost === "medium" ||
    cost === "standard"
  ) {
    return COST.MEDIUM;
  }
  if (
    cost === "paid_heavy" ||
    cost === "heavy" ||
    cost === "higher" ||
    cost === "higher_cost"
  ) {
    return COST.HIGHER;
  }

  const tier = normalizeTier(fallbackTier);
  if (tier === "free") return COST.FREE;
  if (tier === "sandbox") return COST.LOWER;
  if (tier === "main") return COST.MEDIUM;
  if (tier === "heavy") return COST.HIGHER;
  return COST.UNKNOWN;
}

export function getRelativeCostLabel(relativeCost) {
  if (relativeCost === COST.FREE) return "Free";
  if (relativeCost === COST.LOWER) return "Lower relative cost";
  if (relativeCost === COST.MEDIUM) return "Medium relative cost";
  if (relativeCost === COST.HIGHER) return "Higher relative cost";
  return "Cost unknown";
}

export function getModelCapabilityLabel(capability) {
  if (capability === CAPABILITY.PROJECT_BUILDER) return "Project builder";
  if (capability === CAPABILITY.TEST_MODE_EDITING) return "Test-mode editing";
  if (capability === CAPABILITY.CHAT_AND_PLANNING) return "Chat and planning";
  return "Unclassified";
}

export function getModelRegistryEntry({
  providerId,
  modelId,
  presetRecord = null,
  metadataSource = "",
} = {}) {
  const provider = normalizeProviderId(providerId);
  const model = normalizeModelId(modelId);
  const bundledRecord = presetToRecord(findBundledPreset(provider, model));
  const suppliedRecord = presetToRecord(presetRecord);
  const presentationRecord = suppliedRecord || bundledRecord;
  const tier = normalizeTier(
    presentationRecord?.tier || presentationRecord?.usage || bundledRecord?.tier,
  );

  const approvedCapability =
    APPROVED_MODEL_CAPABILITIES?.[provider]?.[model] || null;
  const capability = provider === "mock" || isKnownFreeRoute(provider, model)
    ? CAPABILITY.CHAT_AND_PLANNING
    : approvedCapability || CAPABILITY.UNCLASSIFIED;
  const relativeCost = normalizeRelativeCost(
    presentationRecord?.cost,
    tier,
  );

  return {
    providerId: provider,
    id: model,
    modelId: model,
    displayLabel: model,
    description:
      presentationRecord?.note || bundledRecord?.note || "",
    tier,
    relativeCost,
    relativeCostLabel: getRelativeCostLabel(relativeCost),
    capability,
    capabilityLabel: getModelCapabilityLabel(capability),
    availability: model ? "available" : "unavailable",
    metadataSource:
      metadataSource ||
      (suppliedRecord ? "supplied" : bundledRecord ? "bundled" : "unknown"),
    isKnownModel: !!approvedCapability || !!bundledRecord,
  };
}

export function getEffectiveModelRecords({
  providerId,
  remoteRecords = null,
  userRecords = [],
  normalizeId = normalizeModelId,
} = {}) {
  const provider = normalizeProviderId(providerId);
  const bundledRecords = Array.isArray(MODEL_PRESETS?.[provider])
    ? MODEL_PRESETS[provider]
    : [];
  const usesRemote = Array.isArray(remoteRecords);
  const baseRecords = usesRemote ? remoteRecords : bundledRecords;
  const combined = [
    ...baseRecords.map((record) => ({
      record,
      source: usesRemote ? "remote" : "bundled",
    })),
    ...(Array.isArray(userRecords) ? userRecords : []).map((record) => ({
      record,
      source: "user",
    })),
  ];
  const seen = new Set();
  const out = [];

  for (const item of combined) {
    const record = presetToRecord(item.record);
    if (!record) continue;
    const id = normalizeModelId(normalizeId(record.id));
    if (!id || seen.has(id)) continue;
    seen.add(id);

    out.push(
      getModelRegistryEntry({
        providerId: provider,
        modelId: id,
        presetRecord: { ...record, id },
        metadataSource: item.source,
      }),
    );
  }

  return out;
}

export function getProviderFallbackModelId(providerId) {
  const provider = normalizeProviderId(providerId);
  const presets = Array.isArray(MODEL_PRESETS?.[provider])
    ? MODEL_PRESETS[provider]
    : [];
  const records = presets.map(presetToRecord).filter(Boolean);
  const selected =
    records.find((record) => record.tier === "main") ||
    records.find((record) => record.tier === "heavy") ||
    records[0];
  return selected?.id || "";
}

export function getWorkingModeDefaultModelId(providerId, workingMode) {
  const provider = normalizeProviderId(providerId);
  const presets = Array.isArray(MODEL_PRESETS?.[provider])
    ? MODEL_PRESETS[provider]
    : [];
  const entries = presets
    .map(presetToRecord)
    .filter(Boolean)
    .map((record) =>
      getModelRegistryEntry({
        providerId: provider,
        modelId: record.id,
        presetRecord: record,
        metadataSource: "bundled",
      }),
    );

  if (workingMode === KFORGE_WORKING_MODES.PROJECT_BUILDER) {
    const builders = entries.filter(
      (entry) => entry.capability === CAPABILITY.PROJECT_BUILDER,
    );
    return (
      builders.find((entry) => entry.tier === "main")?.modelId ||
      builders[0]?.modelId ||
      ""
    );
  }

  const testModels = entries.filter(
    (entry) => entry.capability === CAPABILITY.TEST_MODE_EDITING,
  );
  return (
    testModels.find((entry) => entry.tier === "sandbox")?.modelId ||
    testModels[0]?.modelId ||
    ""
  );
}
