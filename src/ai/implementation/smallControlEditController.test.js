import {
  getSmallControlEditOperation,
  isSmallControlEditGoal,
} from "./smallControlEditController";

test("small control routing accepts an explicit reset-form creation request", () => {
  const operation = getSmallControlEditOperation(
    "Add a reset button that clears the form fields.",
  );

  expect(operation).toMatchObject({
    ok: true,
    kind: "reset_form",
    label: "Reset form",
  });
  expect(
    isSmallControlEditGoal(
      "Add a reset button that clears the form fields.",
    ),
  ).toBe(true);
});

test("small control routing rejects changing an existing reset button label", () => {
  const operation = getSmallControlEditOperation(
    "Change the label on the existing reset button to Reset journey plan.",
  );

  expect(operation.ok).toBe(false);
  expect(operation.kind).toBe("");
  expect(operation.reason).toContain(
    "existing control label or text",
  );
  expect(
    isSmallControlEditGoal(
      "Change the label on the existing reset button to Reset journey plan.",
    ),
  ).toBe(false);
});

test("small control routing rejects renaming existing button text", () => {
  expect(
    isSmallControlEditGoal(
      "Rename the reset button text to Start over.",
    ),
  ).toBe(false);
});
