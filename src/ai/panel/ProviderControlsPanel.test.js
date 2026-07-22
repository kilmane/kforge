import fs from "fs";
import path from "path";

describe("ProviderControlsPanel remote presets", () => {
  test("recomputes preset records when remote presets finish loading", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "ProviderControlsPanel.jsx"),
      "utf8",
    );

    const presetRecordsMemo = source.match(
      /const presetRecords = useMemo\(\(\) => \{([\s\S]*?)\n\s*\}, \[([^\]]*)\]\);/,
    );

    expect(presetRecordsMemo).not.toBeNull();
    expect(presetRecordsMemo[1]).toContain(
      "remotePresets?.providers?.[aiProvider]",
    );

    const dependencies = presetRecordsMemo[2]
      .split(",")
      .map((dependency) => dependency.trim());

    expect(dependencies).toEqual(
      expect.arrayContaining(["aiProvider", "remotePresets"]),
    );
  });
});
