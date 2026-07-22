import fs from "fs";
import path from "path";

import { MODEL_PRESETS } from "./modelPresets";

function ids(providerId) {
  return MODEL_PRESETS[providerId].map((preset) => preset.id);
}

describe("curated model presets", () => {
  test("uses the current OpenAI GPT-5.6 family by capability tier", () => {
    expect(MODEL_PRESETS.openai).toEqual([
      expect.objectContaining({ id: "gpt-5.6-luna", tier: "sandbox" }),
      expect.objectContaining({ id: "gpt-5.6-terra", tier: "main" }),
      expect.objectContaining({ id: "gpt-5.6-sol", tier: "heavy" }),
    ]);
  });

  test("does not offer the retired DeepSeek or deprecated Groq aliases", () => {
    const allPresetIds = Object.values(MODEL_PRESETS)
      .flat()
      .map((preset) => preset.id);

    expect(allPresetIds).not.toEqual(
      expect.arrayContaining([
        "deepseek-chat",
        "deepseek-reasoner",
        "llama-3.1-8b-instant",
        "llama-3.3-70b-versatile",
      ]),
    );
  });

  test("uses current curated choices for other hosted providers", () => {
    expect(ids("gemini")).toEqual([
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.1-pro-preview",
    ]);
    expect(ids("claude")).toEqual([
      "claude-haiku-4-5",
      "claude-sonnet-5",
      "claude-opus-4-8",
      "claude-fable-5",
    ]);
    expect(ids("deepseek")).toEqual([
      "deepseek-v4-flash",
      "deepseek-v4-pro",
    ]);
    expect(ids("groq")).toEqual([
      "openai/gpt-oss-20b",
      "openai/gpt-oss-120b",
    ]);
  });

  test("keeps the published preset JSON synchronized with compiled presets", () => {
    const publishedPresets = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "..", "..", "docs", "presets.json"),
        "utf8",
      ),
    );

    expect(publishedPresets.updated_at).toBe("2026-07-22");

    for (const [providerId, presets] of Object.entries(
      publishedPresets.providers,
    )) {
      const published = presets
        .map((preset) => ({ id: preset.id, tier: preset.usage }))
        .sort((left, right) => left.id.localeCompare(right.id));
      const compiled = MODEL_PRESETS[providerId]
        .map((preset) => ({ id: preset.id, tier: preset.tier }))
        .sort((left, right) => left.id.localeCompare(right.id));

      if (providerId === "custom" || providerId === "openrouter") {
        expect(published.map((preset) => preset.id)).toEqual(
          compiled.map((preset) => preset.id),
        );
      } else {
        expect(published).toEqual(compiled);
      }
    }
  });

  test("omits unsupported temperature for current Claude presets", () => {
    const claudeProviderSource = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "..",
        "src-tauri",
        "src",
        "ai",
        "providers",
        "claude",
        "mod.rs",
      ),
      "utf8",
    );

    expect(claudeProviderSource).toContain(
      "temperature: Self::request_temperature(req)",
    );
    for (const modelId of [
      "claude-fable-5",
      "claude-opus-4-8",
      "claude-sonnet-5",
    ]) {
      expect(claudeProviderSource).toContain(`\"${modelId}\"`);
    }
  });
});
