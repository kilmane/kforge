import fs from "fs";
import path from "path";

const aiPanelSource = fs.readFileSync(
  path.join(__dirname, "..", "panel", "AiPanel.jsx"),
  "utf8",
);
const appSource = fs.readFileSync(
  path.join(__dirname, "..", "..", "App.js"),
  "utf8",
);

test("initial batch and agent-loop controlled proposals use one turn adapter", () => {
  const adapterCalls = aiPanelSource.match(
    /await executeControlledImplementationTurn\s*\(/g,
  );

  expect(adapterCalls).toHaveLength(2);
  expect(aiPanelSource).not.toMatch(/\bbeginControlledToolRequest\s*\(/);
  expect(aiPanelSource).not.toMatch(/\bcompleteControlledToolRequest\s*\(/);
});

test("controlled metadata without a canonical lifecycle fails closed", () => {
  expect(aiPanelSource).toMatch(
    /hasControlledSupabaseClassification\s*&&\s*!triggerToolControlledLifecycle/,
  );
  expect(aiPanelSource).not.toContain(
    "let controlledLifecycle =\n            triggerToolControlledLifecycle ||",
  );
  expect(appSource).toContain("controlledSupabaseLifecycleMissing");
  expect(appSource).toContain("!controlledSupabaseLifecycleMissing");
});

test("legacy string-based failed-write recovery is bypassed for controlled lifecycle", () => {
  expect(aiPanelSource).toContain(
    "if (allWritesFailed && !controlledLifecycle)",
  );
  expect(aiPanelSource).toContain(
    "toolResult?.controlledRecovery",
  );
});
