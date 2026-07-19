import { resolveProjectEditGoal } from "./workflowState";

test("fresh project edit prefers the current prompt over stale workflow goal", () => {
  expect(
    resolveProjectEditGoal({
      currentDraft:
        "Change the main title to A calmer way to plan your Hajj journey.",
      previousGoal:
        "Change the reset button label to Reset journey plan.",
    }),
  ).toBe(
    "Change the main title to A calmer way to plan your Hajj journey.",
  );
});

test("an explicit supplied goal has highest priority", () => {
  expect(
    resolveProjectEditGoal({
      explicitGoal: "Explicit retry goal",
      currentDraft: "Current prompt",
      previousGoal: "Previous workflow goal",
    }),
  ).toBe("Explicit retry goal");
});

test("a real continuation may preserve the previous workflow goal", () => {
  expect(
    resolveProjectEditGoal({
      explicitGoal: "Generated continuation prompt",
      currentDraft: "Focused internal retry text",
      previousGoal: "Original user implementation request",
      preservePreviousGoal: true,
    }),
  ).toBe("Original user implementation request");
});

test("goal resolution falls back safely when earlier values are empty", () => {
  expect(
    resolveProjectEditGoal({
      currentDraft: "Current request",
    }),
  ).toBe("Current request");
});
