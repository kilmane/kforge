import { runAgent } from "./agentRunner";

test("runAgent can continue boundedly after harmless final text", async () => {
  const responses = [
    {
      text: "I inspected the helper and have enough evidence.",
    },
    {
      toolCall: {
        name: "write_file",
        args: { path: "src/App.jsx", content: "complete app" },
      },
    },
    { text: "Implementation complete." },
  ];
  const executedTools = [];

  const result = await runAgent({
    prompt: "Continue the controlled implementation.",
    callModel: async () => responses.shift(),
    executeTool: async (toolCall) => {
      executedTools.push(toolCall);
      return {
        ok: true,
        toolName: toolCall.name,
        args: toolCall.args,
        result: "Wrote file",
      };
    },
    continueAfterFinalText: ({ step }) =>
      step === 1
        ? "The safe read succeeded and the approved write is still pending. Continue."
        : "",
    maxSteps: 4,
  });

  expect(executedTools).toEqual([
    {
      name: "write_file",
      args: { path: "src/App.jsx", content: "complete app" },
    },
  ]);
  expect(result.stopReason).toBe("final_text");
  expect(result.text).toBe("Implementation complete.");
  expect(result.messages).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        role: "system",
        content:
          "The safe read succeeded and the approved write is still pending. Continue.",
      }),
    ]),
  );
});

test("runAgent retains normal final text when the controller does not continue", async () => {
  const result = await runAgent({
    prompt: "Inspect the project.",
    callModel: async () => ({ text: "No safe edit is justified." }),
    executeTool: async () => ({ ok: true }),
    continueAfterFinalText: () => "",
  });

  expect(result.stopReason).toBe("final_text");
  expect(result.text).toBe("No safe edit is justified.");
  expect(result.steps).toBe(1);
});

test("runAgent retains the explicit max-step bound for ordinary non-controlled jobs", async () => {
  const executeTool = jest.fn(async (toolCall) => ({
    ok: true,
    toolName: toolCall.name,
    args: toolCall.args,
    result: "Inspected file",
  }));
  const result = await runAgent({
    prompt: "Inspect boundedly.",
    callModel: async ({ step }) => ({
      toolCall: {
        name: "read_file",
        args: { path: `src/step-${step}.jsx` },
      },
    }),
    executeTool,
    maxSteps: 2,
  });

  expect(executeTool).toHaveBeenCalledTimes(2);
  expect(result.steps).toBe(2);
  expect(result.stopReason).toBe("max_steps_reached");
});

test("runAgent injects current controller context after each tool result", async () => {
  const responses = [
    {
      toolCall: {
        name: "read_file",
        args: { path: "src/lib/supabase.js" },
      },
    },
    { text: "Ready to implement." },
  ];
  const modelMessages = [];

  const result = await runAgent({
    prompt: "Continue the controlled implementation.",
    callModel: async ({ messages }) => {
      modelMessages.push(messages);
      return responses.shift();
    },
    executeTool: async (toolCall) => ({
      ok: true,
      toolName: toolCall.name,
      args: toolCall.args,
      result: "export async function saveUserProgress() {}",
    }),
    buildToolResultContinuationPrompt: () =>
      "Authoritative controller state: reuse src/lib/supabase.js and write only src/App.jsx.",
  });

  expect(result.stopReason).toBe("final_text");
  expect(modelMessages[1]).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        role: "system",
        content:
          "Authoritative controller state: reuse src/lib/supabase.js and write only src/App.jsx.",
      }),
    ]),
  );
});

test("runAgent can delegate repeated calls to an authoritative lifecycle", async () => {
  const responses = [
    {
      toolCall: {
        name: "read_file",
        args: { path: "src/App.jsx" },
      },
    },
    {
      toolCall: {
        name: "read_file",
        args: { path: "src/App.jsx" },
      },
    },
    { text: "Controller handled the repeated request." },
  ];
  const delegated = [];

  const result = await runAgent({
    prompt: "Continue controlled work.",
    callModel: async () => responses.shift(),
    executeTool: async (toolCall) => {
      delegated.push(toolCall);
      return {
        ok: delegated.length === 1,
        toolName: toolCall.name,
        args: toolCall.args,
        skipped: delegated.length > 1,
        error:
          delegated.length > 1
            ? "Authoritative lifecycle blocked the repeated read."
            : "",
        result: delegated.length === 1 ? "current source" : "",
      };
    },
    delegateDuplicateToolCalls: true,
  });

  expect(delegated).toHaveLength(2);
  expect(result.stopReason).toBe("final_text");
});

test("runAgent stops immediately when an authoritative controller returns a terminal result", async () => {
  const callModel = jest.fn(async () => ({
    toolCall: {
      name: "write_file",
      args: { path: "src/App.jsx", content: "complete source" },
    },
  }));

  const result = await runAgent({
    prompt: "Continue controlled work.",
    callModel,
    executeTool: async (toolCall) => ({
      ok: false,
      toolName: toolCall.name,
      args: toolCall.args,
      error: "Approved execution failed.",
      stopAgent: true,
    }),
  });

  expect(callModel).toHaveBeenCalledTimes(1);
  expect(result.stopReason).toBe("controller_terminal");
});
