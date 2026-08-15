import {
  getControlledImplementationToolSchemas,
  getToolSchemas,
} from "./toolSchema";

test("replace_text is excluded from the general model tool schema", () => {
  const generalToolNames = getToolSchemas().map((tool) => tool.name);
  expect(generalToolNames).not.toContain("replace_text");
  expect(generalToolNames).not.toContain("complete_operation");
});

test("write_file advertises controlled existing-file fingerprint evidence", () => {
  const writeFile = getToolSchemas().find((tool) => tool.name === "write_file");

  expect(writeFile.parameters.properties.expectedFileFingerprint).toEqual(
    expect.objectContaining({ type: "string" }),
  );
});

test("replace_text is exposed only by the controlled implementation schema", () => {
  const replaceText = getControlledImplementationToolSchemas().find(
    (tool) => tool.name === "replace_text",
  );

  expect(replaceText).toEqual(
    expect.objectContaining({
      name: "replace_text",
      parameters: expect.objectContaining({
        required: [
          "path",
          "expectedFileFingerprint",
          "oldText",
          "newText",
        ],
      }),
    }),
  );
});

test("structured operation completion is exposed only to controlled implementation", () => {
  const completion = getControlledImplementationToolSchemas().find(
    (tool) => tool.name === "complete_operation",
  );

  expect(completion).toEqual(
    expect.objectContaining({
      name: "complete_operation",
      parameters: expect.objectContaining({
        additionalProperties: false,
        required: ["operationId", "satisfiedResponsibilityIds"],
        properties: expect.objectContaining({
          satisfiedResponsibilityIds: expect.objectContaining({
            minItems: 1,
            maxItems: 12,
            uniqueItems: true,
          }),
        }),
      }),
    }),
  );
});
