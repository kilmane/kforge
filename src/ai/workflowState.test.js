import {
  WORKFLOW_NEXT_STEP,
  WORKFLOW_STATUS,
  WORKFLOW_TASK_KIND,
  createImplementationInProgressWorkflowContext,
  mergeWorkflowPathLists,
} from "./workflowState";

test("createImplementationInProgressWorkflowContext stores unique normalized inspected paths", () => {
  const context = createImplementationInProgressWorkflowContext({
    lastUserGoal: "Update the app",
    inspectedPaths: [" src/App.jsx ", "", "src/App.jsx", "src/App.css"],
    modelToolInspectedPaths: [
      " src/App.jsx ",
      "src/App.jsx",
      "src/main.jsx",
      null,
    ],
  });

  expect(context.inspectedPaths).toEqual(["src/App.jsx", "src/App.css"]);
  expect(context.modelToolInspectedPaths).toEqual([
    "src/App.jsx",
    "src/main.jsx",
  ]);
});

test("createImplementationInProgressWorkflowContext uses empty arrays when paths are omitted", () => {
  const context = createImplementationInProgressWorkflowContext();

  expect(context.inspectedPaths).toEqual([]);
  expect(context.modelToolInspectedPaths).toEqual([]);
});

test("mergeWorkflowPathLists preserves existing inspected paths", () => {
  const merged = mergeWorkflowPathLists(["src/App.jsx"], undefined, []);

  expect(merged).toEqual(["src/App.jsx"]);
});

test("mergeWorkflowPathLists adds new inspected paths without duplicates", () => {
  const merged = mergeWorkflowPathLists(
    ["src/App.jsx", "src/App.css"],
    [" src/App.jsx ", "src/main.jsx"],
  );

  expect(merged).toEqual(["src/App.jsx", "src/App.css", "src/main.jsx"]);
});

test("createImplementationInProgressWorkflowContext keeps unrelated workflow fields unchanged", () => {
  const context = createImplementationInProgressWorkflowContext({
    lastUserGoal: "  Continue the edit  ",
    source: "unit_test",
  });

  expect(context).toMatchObject({
    taskKind: WORKFLOW_TASK_KIND.IMPLEMENTATION,
    status: WORKFLOW_STATUS.IN_PROGRESS,
    nextStep: WORKFLOW_NEXT_STEP.PREVIEW,
    lastUserGoal: "Continue the edit",
    source: "unit_test",
    inspectedPaths: [],
    modelToolInspectedPaths: [],
  });
  expect(typeof context.updatedAt).toBe("number");
});
