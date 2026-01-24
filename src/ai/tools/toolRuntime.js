// src/ai/tools/toolRuntime.js
//
// Tool runtime for consent-gated, transcript-visible tool calls.
// This file is intentionally UI-agnostic: it only needs callbacks for:
// - appending transcript system messages
// - waiting for user consent
// - invoking tool handlers
//
// NOTE: This module is designed to be extracted from AiPanel.jsx without behavior change.

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Normalize a model tool-call shape into { name, args }.
 * Supports a few common shapes so the UI code stays small.
 */
export function normalizeToolCall(raw) {
  if (!raw) return null;

  // Already normalized
  if (typeof raw === "object" && raw.name && raw.args) return raw;

  // Common: { tool: "read_file", args: {...} }
  if (typeof raw === "object" && raw.tool && raw.args) {
    return { name: raw.tool, args: raw.args };
  }

  // Common: { name: "read_file", arguments: "{...json...}" }
  if (typeof raw === "object" && raw.name && raw.arguments != null) {
    const args =
      typeof raw.arguments === "string" ? safeJsonParse(raw.arguments) : raw.arguments;
    return { name: raw.name, args: args ?? {} };
  }

  // If it's a string, try parse
  if (typeof raw === "string") {
    const parsed = safeJsonParse(raw);
    if (parsed) return normalizeToolCall(parsed);
  }

  return null;
}

/**
 * Build a consistent system bubble string for tool status.
 */
export function formatToolStatus({ phase, toolName, ok, summary }) {
  // phase: "call" | "result" | "cancelled" | "error"
  const base =
    phase === "call"
      ? `Calling tool: ${toolName}`
      : phase === "result"
        ? `Tool returned: ${toolName}`
        : phase === "cancelled"
          ? `Tool cancelled: ${toolName}`
          : `Tool error: ${toolName}`;

  if (summary) return `${base}\n${summary}`;
  if (phase === "result") return `${base}${ok === false ? " (failed)" : ""}`;
  return base;
}

/**
 * Default consent prompt to show in transcript for a tool request.
 * You can override at callsite if you already have custom wording.
 */
export function buildConsentPrompt({ toolName, args }) {
  const prettyArgs =
    args && Object.keys(args).length
      ? JSON.stringify(args, null, 2)
      : "{}";
  return `Approve tool call?\n\nTool: ${toolName}\nArgs:\n${prettyArgs}`;
}

/**
 * Run a single tool call with:
 * - transcript-visible system bubbles
 * - consent gating
 * - handler invocation
 *
 * @param {object} params
 * @param {object} params.toolCall - raw or normalized tool call
 * @param {(entry: {role: string, content: string, meta?: any}) => void} params.appendTranscript
 * @param {(req: {toolName: string, args: any, prompt: string}) => Promise<"approved"|"cancelled">} params.requestConsent
 * @param {(toolName: string, args: any) => Promise<any>} params.invokeTool
 * @param {(toolName: string, args: any) => boolean} [params.isConsentRequired] - default true
 *
 * @returns {Promise<{ ok: boolean, toolName: string, args: any, result?: any, error?: string, cancelled?: boolean }>}
 */
export async function runToolCall({
  toolCall,
  appendTranscript,
  requestConsent,
  invokeTool,
  isConsentRequired = () => true,
}) {
  const normalized = normalizeToolCall(toolCall);
  if (!normalized) {
    return { ok: false, toolName: "unknown", args: {}, error: "Invalid tool call shape" };
  }

  const { name: toolName, args } = normalized;

  // 1) show "calling tool" system bubble (or pre-call bubble)
  appendTranscript({
    role: "system",
    content: formatToolStatus({ phase: "call", toolName }),
    meta: { kind: "tool_status", toolName, phase: "call" },
  });

  // 2) consent gate (always on for now unless you decide otherwise)
  if (isConsentRequired(toolName, args)) {
    const prompt = buildConsentPrompt({ toolName, args });

    const decision = await requestConsent({ toolName, args, prompt });
    if (decision !== "approved") {
      appendTranscript({
        role: "system",
        content: formatToolStatus({ phase: "cancelled", toolName }),
        meta: { kind: "tool_status", toolName, phase: "cancelled" },
      });
      return { ok: false, toolName, args, cancelled: true };
    }
  }

  // 3) invoke handler
  try {
    const result = await invokeTool(toolName, args);

    appendTranscript({
      role: "system",
      content: formatToolStatus({
        phase: "result",
        toolName,
        ok: true,
        summary: typeof result === "string" ? result : undefined,
      }),
      meta: { kind: "tool_status", toolName, phase: "result", ok: true },
    });

    return { ok: true, toolName, args, result };
  } catch (err) {
    const msg = err?.message ? String(err.message) : String(err);

    appendTranscript({
      role: "system",
      content: formatToolStatus({
        phase: "error",
        toolName,
        ok: false,
        summary: msg,
      }),
      meta: { kind: "tool_status", toolName, phase: "error", ok: false },
    });

    return { ok: false, toolName, args, error: msg };
  }
}
