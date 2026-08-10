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
const servicePanelSource = fs.readFileSync(
  path.join(__dirname, "..", "runtime", "ServicePanel.jsx"),
  "utf8",
);
const supabasePlanningSource = fs.readFileSync(
  path.join(__dirname, "..", "runtime", "supabaseAutopilot", "SupabasePlanningPanel.jsx"),
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

  test("starts a deterministic safe likely-file inspection after a tool-less reply", () => {
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
      "resolveWorkflowLikelyAppInspectPath({",
    );
    expect(recoverySection).toContain(
      "buildProjectInspectionRecoveryToolCall(recoveryInspectPath)",
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

  test("does not seed continuation prompts with an executable repeated tool call", () => {
    expect(panelSource).toContain(
      "Choose the next tool and path from the current conversation evidence.",
    );
    expect(panelSource).toContain(
      "Never repeat an executed call.",
    );
    expect(panelSource).not.toContain(
      '{ "name": "list_dir", "args": { "path": "." } }',
    );
  });

  test("reports the project inspection step limit accurately", () => {
    expect(panelSource).toContain(
      "projectInspectionStoppedAtStepLimit",
    );
    expect(panelSource).toContain(
      "The read-only inspection reached the safe",
    );
    expect(panelSource).toContain(
      "getProjectInspectionMaxSteps()",
    );
  });

  test("routes explicit Supabase Autopilot ownership through the real Services controller", () => {
    expect(appSource).toContain('directWorkflowHandoffRoute.action === "supabase_autopilot"');
    expect(appSource).toContain('workspace: "services"');
    expect(appSource).toContain('workflow: "supabase_autopilot"');
    expect(panelSource).toContain('workspaceRequest?.workspace !== "services"');
    expect(panelSource).toContain('workspaceRequest={workspaceRequest}');
    expect(servicePanelSource).toContain('pendingWorkflowRequest?.workflow === "supabase_autopilot"');
    expect(supabasePlanningSource).toContain('workflowRequest?.workflow !== "supabase_autopilot"');
    expect(supabasePlanningSource).toContain('void runReadOnlyPlan(requestedObjective);');
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
