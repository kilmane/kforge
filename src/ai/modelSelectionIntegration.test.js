import fs from "fs";
import path from "path";

describe("model selection integration", () => {
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "App.js"),
    "utf8",
  );
  const panelSource = fs.readFileSync(
    path.join(__dirname, "panel", "AiPanel.jsx"),
    "utf8",
  );

  test("loads remote presets centrally and shares them with model consumers", () => {
    expect(appSource).toContain("fetchRemotePresetsV0WithCache");
    expect(appSource).toContain("presetRecord: activeRemotePreset");
    expect(appSource).toContain("remotePresets={remotePresets}");
    expect(appSource).toContain(
      "remotePresetsStatus={remotePresetsStatus}",
    );
  });

  test("restores provider, model, and working mode without changing provider IDs", () => {
    expect(appSource).toContain('const LAST_PROVIDER_STORAGE_KEY = "kforge.lastProvider.v1"');
    expect(appSource).toContain('const WORKING_MODE_STORAGE_KEY = "kforge.workingMode.v1"');
    expect(appSource).toContain(
      "const [aiProvider, setAiProvider] = useState(loadLastProvider)",
    );
    expect(appSource).toContain(
      "const [aiModel, setAiModel] = useState(() => loadLastModel(aiProvider))",
    );
  });

  test("keeps the working-mode choice visible beside the prompt", () => {
    expect(panelSource).toContain("function WorkingModeControl");
    expect(panelSource).toContain('aria-label="KForge working mode"');
    expect(panelSource.match(/<WorkingModeControl/g)).toHaveLength(2);
    expect(panelSource).toContain(
      "KForge's existing capability gate remains active.",
    );
  });
});
