import {
  KFORGE_WORKING_MODES,
  MODEL_CAPABILITIES,
  MODEL_RELATIVE_COSTS,
  NEW_USER_MODEL_SELECTION,
  getEffectiveModelRecords,
  getModelRegistryEntry,
  getProviderFallbackModelId,
  getWorkingModeDefaultModelId,
} from "./modelRegistry";

describe("effective model registry", () => {
  test("keeps cost and capability as separate classifications", () => {
    expect(
      getModelRegistryEntry({
        providerId: "openai",
        modelId: "gpt-5.6-luna",
      }),
    ).toEqual(
      expect.objectContaining({
        relativeCost: MODEL_RELATIVE_COSTS.LOWER,
        relativeCostLabel: "Lower relative cost",
        capability: MODEL_CAPABILITIES.TEST_MODE_EDITING,
        capabilityLabel: "Test-mode editing",
      }),
    );

    expect(
      getModelRegistryEntry({
        providerId: "openai",
        modelId: "gpt-5.6-sol",
      }),
    ).toEqual(
      expect.objectContaining({
        relativeCost: MODEL_RELATIVE_COSTS.HIGHER,
        capability: MODEL_CAPABILITIES.PROJECT_BUILDER,
      }),
    );
  });

  test("preserves the approved capability table for guarded providers", () => {
    for (const [providerId, modelId] of [
      ["deepseek", "deepseek-v4-pro"],
      ["groq", "openai/gpt-oss-120b"],
      ["mistral", "devstral-small-latest"],
      ["ollama", "gpt-oss:20b"],
    ]) {
      expect(
        getModelRegistryEntry({ providerId, modelId }).capability,
      ).toBe(MODEL_CAPABILITIES.TEST_MODE_EDITING);
    }
  });

  test("does not let remote presentation metadata grant builder capability", () => {
    const [record] = getEffectiveModelRecords({
      providerId: "deepseek",
      remoteRecords: [
        {
          id: "deepseek-v4-pro",
          usage: "main",
          cost: "paid_main",
          note: "Remote presentation",
        },
      ],
    });

    expect(record).toEqual(
      expect.objectContaining({
        metadataSource: "remote",
        description: "Remote presentation",
        relativeCost: MODEL_RELATIVE_COSTS.MEDIUM,
        capability: MODEL_CAPABILITIES.TEST_MODE_EDITING,
      }),
    );
  });

  test("classifies new and manually entered models conservatively", () => {
    expect(
      getModelRegistryEntry({
        providerId: "openai",
        modelId: "gpt-future",
      }),
    ).toEqual(
      expect.objectContaining({
        relativeCost: MODEL_RELATIVE_COSTS.UNKNOWN,
        capability: MODEL_CAPABILITIES.UNCLASSIFIED,
      }),
    );

    expect(
      getModelRegistryEntry({
        providerId: "openrouter",
        modelId: "openrouter/free",
      }).capability,
    ).toBe(MODEL_CAPABILITIES.CHAT_AND_PLANNING);
  });

  test("keeps new-user, provider-fallback, and working-mode choices distinct", () => {
    expect(NEW_USER_MODEL_SELECTION).toEqual({
      workingMode: KFORGE_WORKING_MODES.TEST,
      providerId: "openai",
      modelId: "gpt-5.6-luna",
    });
    expect(getProviderFallbackModelId("openai")).toBe("gpt-5.6-terra");
    expect(
      getWorkingModeDefaultModelId("openai", KFORGE_WORKING_MODES.TEST),
    ).toBe("gpt-5.6-luna");
    expect(
      getWorkingModeDefaultModelId(
        "openai",
        KFORGE_WORKING_MODES.PROJECT_BUILDER,
      ),
    ).toBe("gpt-5.6-terra");
    expect(
      getWorkingModeDefaultModelId(
        "deepseek",
        KFORGE_WORKING_MODES.PROJECT_BUILDER,
      ),
    ).toBe("");
  });
});
