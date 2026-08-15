import { runToolCall, TOOL_FAILURE_STAGE } from "./toolRuntime";

const toolCall = {
  name: "replace_text",
  args: {
    path: "src/App.jsx",
    expectedFileFingerprint: "fnv1a64-0123456789abcdef",
    oldText: "old",
    newText: "new",
  },
};

test("denied targeted-edit approval performs no mutation", async () => {
  const invokeTool = jest.fn();
  const requestConsent = jest.fn().mockResolvedValue("cancelled");

  const result = await runToolCall({
    toolCall,
    appendTranscript: jest.fn(),
    requestConsent,
    invokeTool,
    consentPrompt: "Review the materialized targeted edit.",
  });

  expect(result.cancelled).toBe(true);
  expect(result.failureStage).toBe(TOOL_FAILURE_STAGE.APPROVAL);
  expect(requestConsent).toHaveBeenCalledWith(
    expect.objectContaining({
      prompt: "Review the materialized targeted edit.",
    }),
  );
  expect(invokeTool).not.toHaveBeenCalled();
});

test("one targeted-edit approval invokes mutation exactly once", async () => {
  const invokeTool = jest.fn().mockResolvedValue("Replaced text");

  const result = await runToolCall({
    toolCall,
    appendTranscript: jest.fn(),
    requestConsent: jest.fn().mockResolvedValue("approved"),
    invokeTool,
    consentPrompt: "Review the materialized targeted edit.",
  });

  expect(result.ok).toBe(true);
  expect(invokeTool).toHaveBeenCalledTimes(1);
  expect(invokeTool).toHaveBeenCalledWith("replace_text", toolCall.args);
});

test("approved targeted-edit execution failure is classified after approval", async () => {
  const result = await runToolCall({
    toolCall,
    appendTranscript: jest.fn(),
    requestConsent: jest.fn().mockResolvedValue("approved"),
    invokeTool: jest.fn().mockRejectedValue(new Error("Write failed")),
    consentPrompt: "Review the materialized targeted edit.",
  });

  expect(result.ok).toBe(false);
  expect(result.cancelled).not.toBe(true);
  expect(result.failureStage).toBe(TOOL_FAILURE_STAGE.EXECUTION);
});
