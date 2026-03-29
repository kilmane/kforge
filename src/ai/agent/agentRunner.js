// src/ai/agent/agentRunner.js

import { normalizeToolCall } from "../tools/toolRuntime.js";

/*
Agent runner

Purpose:
- run a model → tool → model loop
- keep tool execution outside this file
- remain UI-agnostic
- preserve consent gating by requiring tools to execute through the caller's runtime pipeline

Expected caller responsibilities:
- callModel(...)
- executeTool(...)
- appendTranscript(...)
- appendToolResult(...)

This file does NOT directly invoke handlers.
It only coordinates the loop.
*/

function getAssistantText(response) {
  if (!response) return "";
  if (typeof response === "string") return response;
  if (typeof response.text === "string") return response.text;
  if (typeof response.output === "string") return response.output;
  return "";
}

function getRawToolCall(response) {
  if (!response || typeof response !== "object") return null;

  if (response.toolCall) return response.toolCall;
  if (response.tool_call) return response.tool_call;
  if (response.function_call) return response.function_call;

  return null;
}

function defaultAppendTranscript() {}
function defaultAppendToolResult() {}

function buildToolResultMessage(result) {
  if (!result) {
    return "Tool result:\n(no result)";
  }

  const toolName = result.toolName || "unknown_tool";

  if (result.cancelled) {
    return `Tool result:\n${toolName} was cancelled by the user.`;
  }

  if (result.ok === false) {
    return `Tool result:\n${toolName} failed.\n${result.error || "Unknown error"}`;
  }

  const rendered =
    typeof result.result === "string"
      ? result.result
      : JSON.stringify(result.result ?? {}, null, 2);

  return `Tool result:\n${rendered}`;
}
function buildToolCallKey(toolCall) {
  if (!toolCall || typeof toolCall !== "object") return "";
  const name = String(toolCall.name || "").trim();
  const args = toolCall.args ?? {};
  return `${name}::${JSON.stringify(args)}`;
}
/**
 * Runs a tool-calling loop until the model returns final text
 * or maxSteps is reached.
 *
 * @param {object} params
 * @param {string} params.prompt
 * @param {Array<object>} [params.messages]
 * @param {Array<object>} [params.tools]
 * @param {(payload: {prompt: string, messages: Array<object>, tools: Array<object>, step: number}) => Promise<any>} params.callModel
 * @param {(toolCall: any) => Promise<{ ok: boolean, toolName: string, args: any, result?: any, error?: string, cancelled?: boolean }>} params.executeTool
 * @param {(entry: {role: string, content: string, meta?: any}) => void} [params.appendTranscript]
 * @param {(result: any) => void} [params.appendToolResult]
 * @param {number} [params.maxSteps]
 *
 * @returns {Promise<{ ok: boolean, text: string, steps: number, messages: Array<object>, stopReason?: string }>}
 */
export async function runAgent({
  prompt,
  messages = [],
  tools = [],
  callModel,
  executeTool,
  appendTranscript = defaultAppendTranscript,
  appendToolResult = defaultAppendToolResult,
  maxSteps = 8,
  initialSeenToolCalls = [],
}) {
  if (typeof callModel !== "function") {
    throw new Error("runAgent: callModel is required");
  }

  if (typeof executeTool !== "function") {
    throw new Error("runAgent: executeTool is required");
  }

  const workingMessages = Array.isArray(messages) ? [...messages] : [];
  const seenToolCalls = new Set(
    (Array.isArray(initialSeenToolCalls) ? initialSeenToolCalls : [])
      .map((toolCall) => buildToolCallKey(toolCall))
      .filter(Boolean),
  );
  if (prompt && String(prompt).trim()) {
    workingMessages.push({
      role: "user",
      content: String(prompt),
    });
  }

  for (let step = 1; step <= maxSteps; step += 1) {
    const response = await callModel({
      prompt: String(prompt || ""),
      messages: workingMessages,
      tools,
      step,
    });

    const rawToolCall = getRawToolCall(response);
    const normalizedToolCall = normalizeToolCall(rawToolCall);
    if (normalizedToolCall) {
      const callKey = buildToolCallKey(normalizedToolCall);

      if (callKey && seenToolCalls.has(callKey)) {
        // Skip duplicate tool calls and let the model continue reasoning
        workingMessages.push({
          role: "system",
          content:
            "The requested tool call was already executed earlier. Do not repeat it. Continue reasoning and produce the final answer.",
        });
        continue;
      }

      if (callKey) {
        seenToolCalls.add(callKey);
      }
    }
    if (normalizedToolCall) {
      const toolLabel = normalizedToolCall.name || "unknown_tool";

      appendTranscript({
        role: "system",
        content: `Agent requested tool: ${toolLabel}`,
        meta: {
          kind: "agent_tool_request",
          toolName: toolLabel,
          step,
        },
      });

      const toolResult = await executeTool(normalizedToolCall);

      appendToolResult(toolResult);

      const toolMessage = buildToolResultMessage(toolResult);

      workingMessages.push({
        role: "assistant",
        content: JSON.stringify(normalizedToolCall, null, 2),
        meta: {
          kind: "tool_call",
          toolName: toolLabel,
          step,
        },
      });

      workingMessages.push({
        role: "system",
        content: toolMessage,
        meta: {
          kind: "tool_result",
          toolName: toolLabel,
          step,
          ok: !!toolResult?.ok,
        },
      });

      continue;
    }

    const text = getAssistantText(response).trim();

    if (text) {
      workingMessages.push({
        role: "assistant",
        content: text,
        meta: {
          kind: "final_answer",
          step,
        },
      });

      return {
        ok: true,
        text,
        steps: step,
        messages: workingMessages,
        stopReason: "final_text",
      };
    }

    return {
      ok: false,
      text: "",
      steps: step,
      messages: workingMessages,
      stopReason: "empty_response",
    };
  }

  return {
    ok: false,
    text: "",
    steps: maxSteps,
    messages: workingMessages,
    stopReason: "max_steps_reached",
  };
}
