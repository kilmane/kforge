import {
  MODEL_WORKFLOW_PERMISSION_MODES,
  getModelWorkflowPolicy,
} from "./modelWorkflowPolicy";

describe("model workflow policy registry integration", () => {
  test.each([
    ["openai", "gpt-5.6-luna"],
    ["claude", "claude-haiku-4-5"],
    ["gemini", "gemini-3.5-flash-lite"],
    ["deepseek", "deepseek-v4-pro"],
    ["groq", "openai/gpt-oss-120b"],
    ["mistral", "devstral-small-latest"],
    ["ollama", "gpt-oss:20b"],
  ])("keeps %s / %s on the guarded route", (providerId, modelId) => {
    expect(getModelWorkflowPolicy({ providerId, modelId }).mode).toBe(
      MODEL_WORKFLOW_PERMISSION_MODES.GUARDED_EDIT,
    );
  });

  test.each([
    ["openai", "gpt-5.6-terra"],
    ["openai", "gpt-5.6-sol"],
    ["claude", "claude-sonnet-5"],
    ["gemini", "gemini-3.6-flash"],
  ])("keeps %s / %s on the full builder route", (providerId, modelId) => {
    expect(getModelWorkflowPolicy({ providerId, modelId }).mode).toBe(
      MODEL_WORKFLOW_PERMISSION_MODES.FULL_AGENT,
    );
  });

  test("keeps free routes advisory-only", () => {
    expect(
      getModelWorkflowPolicy({
        providerId: "openrouter",
        modelId: "openrouter/free",
      }).mode,
    ).toBe(MODEL_WORKFLOW_PERMISSION_MODES.ADVISORY_ONLY);
    expect(
      getModelWorkflowPolicy({
        providerId: "mock",
        modelId: "manual-mock-id",
      }).mode,
    ).toBe(MODEL_WORKFLOW_PERMISSION_MODES.ADVISORY_ONLY);
  });

  test("keeps unknown models out of the full builder route", () => {
    const policy = getModelWorkflowPolicy({
      providerId: "openai",
      modelId: "gpt-future",
    });

    expect(policy.mode).toBe(MODEL_WORKFLOW_PERMISSION_MODES.GUARDED_EDIT);
    expect(policy.capabilityLabel).toBe("Unclassified");
  });

  test("uses remote cost presentation without changing capability", () => {
    const policy = getModelWorkflowPolicy({
      providerId: "deepseek",
      modelId: "deepseek-v4-pro",
      presetRecord: {
        id: "deepseek-v4-pro",
        usage: "main",
        cost: "paid_heavy",
      },
    });

    expect(policy.mode).toBe(
      MODEL_WORKFLOW_PERMISSION_MODES.GUARDED_EDIT,
    );
    expect(policy.capabilityLabel).toBe("Test-mode editing");
    expect(policy.relativeCostLabel).toBe("Higher relative cost");
  });
});
