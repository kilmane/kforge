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

describe("read-only project inspection integration", () => {
  test("allows inspection tools without entering the edit route", () => {
    expect(appSource).toContain(
      "isProjectInspectionTaskKind(promptTask.kind)",
    );
    expect(appSource).toContain(
      "Read-only project inspection guidance:",
    );
    expect(appSource).toContain(
      "You may use only read_file, list_dir, and search_in_file.",
    );
  });

  test("enforces read-only tools throughout agent continuation", () => {
    expect(panelSource).toContain(
      "isProjectInspectionTaskKind(triggerToolTaskKind)",
    );
    expect(panelSource).toContain(
      "!isProjectInspectionToolAllowed(toolName)",
    );
    expect(panelSource).toContain(
      "buildProjectInspectionContinuationTools()",
    );
    expect(panelSource).toContain(
      "!isProjectInspectionToolExecution;",
    );
  });

  test("returns the inspection report without edit completion actions", () => {
    expect(panelSource).toContain(
      "No files were changed by this read-only inspection.",
    );
  });

  test("starts a deterministic safe inspection after a tool-less reply", () => {
    expect(appSource).toContain(
      "shouldRequireProjectInspectionEvidence({",
    );

    const recoveryStart = appSource.indexOf(
      "if (shouldShowProjectInspectionNoToolRecovery)",
    );
    const recoveryEnd = appSource.indexOf(
      "// Append cleaned assistant output",
      recoveryStart,
    );
    const recoverySection = appSource.slice(recoveryStart, recoveryEnd);

    expect(recoveryStart).toBeGreaterThan(-1);
    expect(recoveryEnd).toBeGreaterThan(recoveryStart);
    expect(recoverySection).toContain(
      "buildProjectInspectionRecoveryToolCall()",
    );
    expect(recoverySection).toContain(
      "project_inspection_no_tool_recovery",
    );
    expect(recoverySection).toContain("modelToolOriginalGoal: draft");
    expect(recoverySection).toContain(
      "controlledReadOnlyToolExecution: false",
    );
    expect(recoverySection).not.toContain("Retry read-only inspection");
    expect(recoverySection).not.toContain("sendWithPrompt(");
  });

  test("keeps step-limit failure out of implementation recovery", () => {
    expect(panelSource).toContain(
      "The read-only inspection stopped before producing a final report.",
    );
    expect(panelSource).toContain(
      "getProjectInspectionMaxSteps()",
    );
  });

  test("preserves Services workspace mutual exclusion", () => {
    const servicesToggleStart = panelSource.indexOf(
      "const nextServicesOpen = !servicesOpen;",
    );
    const servicesToggleEnd = panelSource.indexOf(
      "title={servicesOpen",
      servicesToggleStart,
    );
    const servicesToggleSection = panelSource.slice(
      servicesToggleStart,
      servicesToggleEnd,
    );

    expect(servicesToggleStart).toBeGreaterThan(-1);
    expect(servicesToggleEnd).toBeGreaterThan(servicesToggleStart);
    expect(servicesToggleSection).toContain(
      "setServicesOpen(nextServicesOpen);",
    );
    expect(servicesToggleSection).toContain(
      "setPreviewOpen(false);",
    );
    expect(servicesToggleSection).toContain(
      "setTerminalOpen(false);",
    );
  });
});
