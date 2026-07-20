import fs from "fs";
import path from "path";

const appSource = fs.readFileSync(
  path.join(__dirname, "..", "App.js"),
  "utf8",
);
const panelSource = fs.readFileSync(
  path.join(__dirname, "panel", "AiPanel.jsx"),
  "utf8",
);

describe("visual style continuation routing", () => {
  test("focused visual recovery preserves the CSS continuation signal", () => {
    expect(appSource).toContain("forceVisualStyleContinuation:");
    expect(appSource).toContain("modelToolVisualStyleContinuation:");
    expect(panelSource).toContain("isVisualStyleContinuationToolExecution");
    expect(panelSource).toContain(
      "(isAppBuildToolExecution || isVisualStyleContinuationToolExecution)",
    );
  });
});
