import {
  PROJECT_INSPECTION_TASK_KIND,
  buildProjectInspectionContinuationTools,
  buildProjectInspectionRecoveryToolCall,
  getProjectInspectionMaxSteps,
  isProjectInspectionTaskKind,
  isProjectInspectionToolAllowed,
  shouldRequireProjectInspectionEvidence,
} from "./projectInspectionPolicy";

describe("project inspection policy", () => {
  test("allows only read-only project tools", () => {
    expect(isProjectInspectionToolAllowed("list_dir")).toBe(true);
    expect(isProjectInspectionToolAllowed("read_file")).toBe(true);
    expect(isProjectInspectionToolAllowed("search_in_file")).toBe(true);
    expect(isProjectInspectionToolAllowed("write_file")).toBe(false);
    expect(isProjectInspectionToolAllowed("mkdir")).toBe(false);
  });

  test("builds a continuation tool list with no mutation tools", () => {
    expect(
      buildProjectInspectionContinuationTools().map((tool) => tool.name),
    ).toEqual(["list_dir", "read_file", "search_in_file"]);
  });

  test("builds a deterministic safe recovery read for the likely app file", () => {
    expect(buildProjectInspectionRecoveryToolCall("src/App.jsx")).toEqual({
      name: "read_file",
      args: {
        path: "src/App.jsx",
      },
    });

    expect(buildProjectInspectionRecoveryToolCall("   ")).toEqual({
      name: "read_file",
      args: {
        path: "src/App.jsx",
      },
    });
  });

  test("uses a larger read-only step budget without entering edit recovery", () => {
    expect(getProjectInspectionMaxSteps()).toBeGreaterThan(6);
  });

  test("requires file evidence before accepting an inspection report", () => {
    expect(
      shouldRequireProjectInspectionEvidence({
        taskKind: PROJECT_INSPECTION_TASK_KIND,
        toolBlockCount: 0,
        askForPatch: false,
      }),
    ).toBe(true);
    expect(
      shouldRequireProjectInspectionEvidence({
        taskKind: PROJECT_INSPECTION_TASK_KIND,
        toolBlockCount: 1,
        askForPatch: false,
      }),
    ).toBe(false);
    expect(isProjectInspectionTaskKind("project_edit")).toBe(false);
  });
});
