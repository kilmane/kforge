// src/ai/panel/AiPanel.jsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";
import PreviewPanel from "../../runtime/PreviewPanel.jsx";
import CommandRunnerPanel from "../../runtime/CommandRunnerPanel.jsx";
import ServicePanel from "../../runtime/ServicePanel.jsx";
import PatchPreviewPanel from "./PatchPreviewPanel.jsx";
import ProviderControlsPanel from "./ProviderControlsPanel.jsx";
import TranscriptPanel from "./TranscriptPanel.jsx";
import PromptPanel from "./PromptPanel.jsx";
import SystemPanel from "./SystemPanel.jsx";
import ParametersPanel from "./ParametersPanel.jsx";
import ActionsPanel from "./ActionsPanel.jsx";
import OutputPanel from "./OutputPanel.jsx";
import OllamaHelperPanel from "./OllamaHelperPanel.jsx";

import { runToolCall } from "../tools/toolRuntime.js";
import { runToolHandler } from "../tools/handlers/index.js";
import { openFile } from "../../lib/fs.js";
import { runAgent } from "../agent/agentRunner.js";
import { getToolSchemas } from "../tools/toolSchema.js";
import {
  ASSISTANT_ACTION_RESULT,
  ASSISTANT_ACTION_TYPE,
  buildAssistantResultProtocol,
  buildCompletedWorkflowChangeSummary,
  createCompletedImplementationWorkflowContext,
  createPartialImplementationWorkflowContext,
  SUGGESTED_ACTION_LABEL,
  VERIFICATION_STATUS,
  WORKFLOW_NEXT_STEP,
} from "../workflowState.js";

/**
 * ✅ Global caches to prevent repeated tool prompts when AiPanel is collapsed/re-opened.
 * These survive unmount/remount of the panel.
 *
 * We still clear them when the conversation is cleared (messages becomes empty).
 */
const GLOBAL_SEEN_TOOL_KEYS = new Set();
const MAX_PRE_WRITE_SNAPSHOT_BYTES = 200 * 1024;
const PRE_WRITE_SNAPSHOT_LIMIT = 8;
const PRE_WRITE_SNAPSHOT_SOURCE_RE =
  /\.(c|cc|cpp|cs|css|go|html|java|js|jsx|json|kt|md|php|py|rb|rs|scss|ts|tsx|txt|vue|xml|ya?ml)$/i;

function isExactTargetTextNotFoundReport(text = "") {
  const s = String(text || "")
    .toLowerCase()
    .trim();

  if (!s) return false;

  const saysNotFound =
    /\b(not\s+found|not\s+present|isn'?t\s+present|doesn'?t\s+exist|does\s+not\s+exist)\b/.test(
      s,
    ) ||
    /\b(did\s+not|didn'?t|could\s+not|couldn'?t|cannot|can'?t)\s+find\b/.test(
      s,
    );

  if (!saysNotFound) return false;

  const refersToExactTarget =
    /\b(exact|requested|target|specified|provided|given)\b/.test(s) &&
    /\b(text|string|phrase|wording|content|footer|heading|copy)\b/.test(s);

  return refersToExactTarget;
}

function getTextByteLength(text = "") {
  return new TextEncoder().encode(String(text || "")).length;
}

function isPreWriteSnapshotCandidatePath(path = "") {
  const cleanPath = String(path || "").trim();
  if (!cleanPath) return false;

  const normalized = cleanPath.replaceAll("\\", "/").toLowerCase();
  if (
    normalized.includes("/node_modules/") ||
    normalized.includes("/dist/") ||
    normalized.includes("/build/") ||
    normalized.includes("/.git/")
  ) {
    return false;
  }

  return PRE_WRITE_SNAPSHOT_SOURCE_RE.test(normalized);
}

function getSnapshotsForPaths(snapshots = [], paths = []) {
  const wanted = new Set(
    (Array.isArray(paths) ? paths : [])
      .map((path) => String(path || "").trim())
      .filter(Boolean),
  );

  if (wanted.size === 0) return [];

  return (Array.isArray(snapshots) ? snapshots : []).filter((snapshot) =>
    wanted.has(String(snapshot?.path || "").trim()),
  );
}

function uidShort() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(
    -6,
  );
}

function formatToolLine({ tool, status, id, detail }) {
  const t = String(tool || "tool").trim() || "tool";
  const i = String(id || "").trim();
  const d = String(detail || "").trim();

  let headline = "";
  if (status === "request")
    headline = `🛡 Tool request: ${t}${i ? ` (${i})` : ""}`;
  else if (status === "calling")
    headline = `🛠 Calling tool: ${t}${i ? ` (${i})` : ""}…`;
  else if (status === "ok")
    headline = `✅ Tool returned: ${t}${i ? ` (${i})` : ""}`;
  else if (status === "error")
    headline = `❌ Tool failed: ${t}${i ? ` (${i})` : ""}`;
  else if (status === "cancelled")
    headline = `🚫 Tool cancelled: ${t}${i ? ` (${i})` : ""}`;
  else headline = `🧩 Tool event: ${t}${i ? ` (${i})` : ""}`;

  const parts = [`[tool] ${headline}`];
  if (d) parts.push(`— ${d}`);
  return parts.join(" ");
}

function dirnameOfPath(p) {
  const raw = String(p || "");
  if (!raw.trim()) return "";

  const normalized = raw.replaceAll("\\", "/");
  const m = normalized.match(/^([A-Za-z]:)\/?$/);
  if (m) return `${m[1]}/`;

  const parts = normalized.split("/").filter((x) => x.length > 0);
  const drive = normalized.match(/^([A-Za-z]:)\//)?.[1] || "";

  if (parts.length <= 1) return drive ? `${drive}/` : "/";

  const dirParts = parts.slice(0, -1);
  const dir = dirParts.join("/");

  return drive ? `${drive}/${dirParts.slice(1).join("/")}` : `/${dir}`;
}

/**
 * Phase 3.6.4 — Model-initiated tool calls (consent-gated)
 *
 * We accept:
 * - ```tool / ```tool_call fenced JSON
 * - ```json fenced JSON (if it parses to a tool request)
 * - bare JSON tool request
 * - XML-ish tool calls (two common variants)
 *
 * Safety:
 * - whitelist only read-only tools
 * - ALWAYS route through toolRuntime.runToolCall => consent UI
 */
const ALLOWED_MODEL_TOOLS = new Set([
  "read_file",
  "list_dir",
  "search_in_file",
  "write_file",
  "mkdir",
]);

const SAFE_AUTOMATIC_TOOLS = new Set([
  "read_file",
  "list_dir",
  "search_in_file",
]);

function getMsgText(msg) {
  const v = msg?.content ?? msg?.text ?? msg?.message ?? msg?.body ?? "";
  return String(v || "");
}

/**
 * Small stable hash so we don't store huge payload strings in the key.
 * (Not crypto, just a compact fingerprint.)
 */
function hashString(s) {
  const str = String(s || "");
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function extractFencedBlocks(text) {
  if (!text || typeof text !== "string") return [];

  const blocks = [];

  // 1️⃣ ```tool / ```tool_call
  const reTool = /```(?:tool|tool_call)\s*([\s\S]*?)```/g;
  let m;
  while ((m = reTool.exec(text)) !== null) {
    blocks.push({ payload: (m[1] || "").trim(), source: "tool_fence" });
  }

  // 1b) Loose/malformed tool fence, common from weaker models:
  // ```tool
  // { "name": "list_dir", "args": { "path": "src" } }
  // </tool_call>
  const looseToolRe = /```(?:tool|tool_call)\s*([\s\S]*?)(?:<\/tool_call>|```|$)/g;
  while ((m = looseToolRe.exec(text)) !== null) {
    const payload = (m[1] || "").trim();
    if (payload.startsWith("{") && payload.endsWith("}")) {
      blocks.push({ payload, source: "loose_tool_fence" });
    }
  }
  // 2️⃣ ```json blocks
  const reJson = /```json\s*([\s\S]*?)```/g;
  while ((m = reJson.exec(text)) !== null) {
    const payload = (m[1] || "").trim();
    if (payload.startsWith("{") && payload.endsWith("}")) {
      blocks.push({ payload, source: "json_fence" });
    }
  }

  // 3️⃣ Any other code block
  const reAnyFence = /```[a-zA-Z0-9_-]*\s*([\s\S]*?)```/g;
  while ((m = reAnyFence.exec(text)) !== null) {
    const payload = (m[1] || "").trim();
    if (!payload) continue;

    // Entire block is JSON
    if (payload.startsWith("{") && payload.endsWith("}")) {
      blocks.push({ payload, source: "any_fence_json" });
      continue;
    }

    // JSON objects inside a code block
    const objRe = /({[\s\S]*?})/g;
    let o;
    while ((o = objRe.exec(payload)) !== null) {
      const candidate = (o[1] || "").trim();
      if (candidate.startsWith("{") && candidate.endsWith("}")) {
        blocks.push({ payload: candidate, source: "any_fence_json_fragment" });
      }
    }
  }

  return blocks;
}

function normalizeToolShape(obj) {
  if (!obj || typeof obj !== "object") return null;

  if (typeof obj.name === "string")
    return { name: obj.name, args: obj.args ?? {} };
  if (typeof obj.tool === "string")
    return { name: obj.tool, args: obj.input ?? obj.args ?? {} };
  if (typeof obj.tool_name === "string")
    return { name: obj.tool_name, args: obj.parameters ?? obj.args ?? {} };
  if (typeof obj.function === "string")
    return { name: obj.function, args: obj.arguments ?? obj.args ?? {} };

  return null;
}

function safeParseToolRequestJson(payload) {
  try {
    const obj = JSON.parse(payload);
    const normalized = normalizeToolShape(obj);
    if (!normalized) return null;

    const name = String(normalized.name || "").trim();
    const args = normalized.args ?? {};

    if (!ALLOWED_MODEL_TOOLS.has(name)) return null;

    return { name, args };
  } catch {
    return null;
  }
}

function tryParseBareToolJson(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) return null;
  return safeParseToolRequestJson(trimmed);
}
function tryParseNaturalLanguageToolCall(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const patterns = [
    {
      name: "list_dir",
      re: /\blist_dir\s*\(\s*([^)]+?)\s*\)/i,
      mapArgs: (m) => ({ path: String(m[1] || "").trim() }),
    },
    {
      name: "read_file",
      re: /\bread_file\s*\(\s*([^)]+?)\s*\)/i,
      mapArgs: (m) => ({ path: String(m[1] || "").trim() }),
    },
    {
      name: "write_file",
      re: /\bwrite_file\s*\(\s*([^)]+?)\s*\)/i,
      mapArgs: (m) => ({ path: String(m[1] || "").trim() }),
    },
    {
      name: "mkdir",
      re: /\bmkdir\s*\(\s*([^)]+?)\s*\)/i,
      mapArgs: (m) => ({ path: String(m[1] || "").trim() }),
    },
    {
      name: "search_in_file",
      re: /\bsearch_in_file\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/i,
      mapArgs: (m) => ({
        path: String(m[1] || "").trim(),
        query: String(m[2] || "").trim(),
      }),
    },
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern.re);
    if (!match) continue;

    const args = pattern.mapArgs(match);

    // Remove wrapping quotes if the model added them
    Object.keys(args).forEach((key) => {
      const value = String(args[key] || "").trim();
      args[key] = value.replace(/^["'`](.*)["'`]$/, "$1").trim();
    });

    if (!ALLOWED_MODEL_TOOLS.has(pattern.name)) return null;

    return {
      name: pattern.name,
      args,
    };
  }

  return null;
}
function stripToolBlocksForChat(text) {
  let s = String(text || "");

  // Remove complete tool fences
  s = s.replace(/```(?:tool|tool_call)\s*[\s\S]*?```/gi, "");

  // Remove incomplete tool fences that never closed
  s = s.replace(/```(?:tool|tool_call)\s*[\s\S]*$/gi, "");

  // Remove the helper line sometimes emitted before tool calls
  s = s.replace(/^\(Model requested one or more tools\.\)\s*$/gim, "");
  // Remove model sentence referring to tool calls (now hidden in calm chat)
  s = s.replace(/Here are the tool calls to create these files:\s*/gi, "");
  return s.trim();
}

function collectToolBatchPaths(calls, toolName) {
  return (Array.isArray(calls) ? calls : [])
    .filter((c) => c?.toolName === toolName)
    .map((c) => String(c?.args?.path || "").trim())
    .filter(Boolean);
}

const INSPECT_BEFORE_WRITE_TOOL_KINDS = new Set([
  "project_edit",
  "broken_preview_debug",
]);

const INSPECTION_TOOL_NAMES = new Set([
  "read_file",
  "list_dir",
  "search_in_file",
]);

const BLIND_WRITE_INSPECTION_EVIDENCE_KEYS = new Set();

function getNearestUserMessageIndexBeforeIndex(messages, index) {
  const items = Array.isArray(messages) ? messages : [];
  const numericIndex = Number(index);
  const start =
    Number.isFinite(numericIndex) && numericIndex >= 0
      ? Math.min(numericIndex - 1, items.length - 1)
      : items.length - 1;

  for (let i = start; i >= 0; i--) {
    if (items[i]?.role === "user") return i;
  }

  return -1;
}

function buildBlindWriteInspectionEvidenceKey({
  taskKind,
  userMessageIndex,
  userText,
}) {
  const kind = String(taskKind || "").trim() || "unknown";
  const userIndex =
    Number.isInteger(userMessageIndex) && userMessageIndex >= 0
      ? String(userMessageIndex)
      : "unknown";
  const goal = String(userText || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 400);

  return `${kind}::${userIndex}::${goal}`;
}

function isInspectBeforeWriteGuardedTaskKind(taskKind) {
  return INSPECT_BEFORE_WRITE_TOOL_KINDS.has(String(taskKind || "").trim());
}

function hasWriteFileToolCall(calls) {
  return (Array.isArray(calls) ? calls : []).some(
    (call) => String(call?.toolName || "").trim() === "write_file",
  );
}

function hasSuccessfulInspectionToolResult(results) {
  return (Array.isArray(results) ? results : []).some(
    (item) =>
      item?.ok &&
      INSPECTION_TOOL_NAMES.has(String(item?.toolName || "").trim()),
  );
}

function shouldBlockBlindWrite({
  calls,
  taskKind,
  userMessageIndex,
  userText,
}) {
  if (!isInspectBeforeWriteGuardedTaskKind(taskKind)) return false;
  if (!hasWriteFileToolCall(calls)) return false;

  const evidenceKey = buildBlindWriteInspectionEvidenceKey({
    taskKind,
    userMessageIndex,
    userText,
  });

  return !BLIND_WRITE_INSPECTION_EVIDENCE_KEYS.has(evidenceKey);
}

function rememberSuccessfulInspectionForTask({
  taskKind,
  userMessageIndex,
  userText,
  results,
}) {
  if (!isInspectBeforeWriteGuardedTaskKind(taskKind)) return;
  if (!hasSuccessfulInspectionToolResult(results)) return;

  BLIND_WRITE_INSPECTION_EVIDENCE_KEYS.add(
    buildBlindWriteInspectionEvidenceKey({
      taskKind,
      userMessageIndex,
      userText,
    }),
  );
}

function buildToolBatchWorkingMessage(calls) {
  const items = Array.isArray(calls) ? calls : [];
  const writePaths = collectToolBatchPaths(items, "write_file");
  const dirPaths = collectToolBatchPaths(items, "mkdir");
  const readPaths = collectToolBatchPaths(items, "read_file");
  const listPaths = collectToolBatchPaths(items, "list_dir");
  const searchPaths = collectToolBatchPaths(items, "search_in_file");

  const createdCount = writePaths.length + dirPaths.length;
  if (createdCount > 0) {
    if (createdCount === 1) {
      const onlyPath = writePaths[0] || dirPaths[0];
      return `Working… creating ${onlyPath}.`;
    }
    return "Working… creating project files";
  }

  if (readPaths.length === 1 && items.length === 1) {
    return `Working… reading ${readPaths[0]}.`;
  }

  if (listPaths.length === 1 && items.length === 1) {
    return `Working… listing ${listPaths[0]}.`;
  }

  if (searchPaths.length === 1 && items.length === 1) {
    return `Working… searching ${searchPaths[0]}.`;
  }

  const total = items.length;
  return `Working… applying ${total} tool ${total === 1 ? "action" : "actions"}.`;
}

function collectSuccessfulToolBatchPaths(results, toolName) {
  const items = Array.isArray(results) ? results : [];
  return items
    .filter(
      (item) => item?.ok && String(item?.toolName || "") === String(toolName),
    )
    .map((item) => String(item?.args?.path || "").trim())
    .filter(Boolean);
}

function collectFailedToolBatchPaths(results, toolName) {
  const items = Array.isArray(results) ? results : [];
  return items
    .filter(
      (item) =>
        !item?.ok &&
        !item?.cancelled &&
        String(item?.toolName || "") === String(toolName),
    )
    .map((item) => String(item?.args?.path || "").trim())
    .filter(Boolean);
}

function buildToolBatchDoneMessage(results) {
  const successfulWritePaths = collectSuccessfulToolBatchPaths(
    results,
    "write_file",
  );
  const successfulDirPaths = collectSuccessfulToolBatchPaths(results, "mkdir");
  const successfulPaths = [
    ...successfulDirPaths,
    ...successfulWritePaths,
  ].filter(Boolean);

  if (successfulPaths.length > 0) {
    const lines = successfulPaths.slice(0, 6).map((p) => `- ${p}`);
    if (successfulPaths.length > 6) {
      lines.push(`- ...and ${successfulPaths.length - 6} more`);
    }

    const intro =
      successfulPaths.length === 1
        ? "Done> wrote the following path:"
        : "Done> wrote the following paths:";

    return `${intro}\n${lines.join("\n")}`;
  }

  const failedWritePaths = collectFailedToolBatchPaths(results, "write_file");
  const failedDirPaths = collectFailedToolBatchPaths(results, "mkdir");
  const failedPaths = [...failedDirPaths, ...failedWritePaths].filter(Boolean);

  if (failedPaths.length > 0) {
    const lines = failedPaths.slice(0, 6).map((p) => `- ${p}`);
    if (failedPaths.length > 6) {
      lines.push(`- ...and ${failedPaths.length - 6} more`);
    }

    return `Done> no files were written.\nThe following requested paths failed:\n${lines.join("\n")}`;
  }

  return "";
}
function getLatestUserMessageText(messages) {
  const items = Array.isArray(messages) ? messages : [];
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (String(items[i]?.role || "") === "user") {
      return String(items[i]?.content || "").trim();
    }
  }
  return "";
}
function getNearestUserMessageTextBeforeIndex(messages, index) {
  const items = Array.isArray(messages) ? messages : [];
  const max = Math.min(
    typeof index === "number" ? index : items.length - 1,
    items.length - 1,
  );

  for (let i = max; i >= 0; i -= 1) {
    if (String(items[i]?.role || "") === "user") {
      return String(items[i]?.content || "").trim();
    }
  }

  return "";
}
function isShowChangesIntent(text) {
  const s = String(text || "").toLowerCase();
  return (
    s.includes("show the changes") ||
    s.includes("see the changes") ||
    s.includes("show me the changes") ||
    s.includes("see what changed") ||
    s.includes("review the changes") ||
    s.includes("display the changes")
  );
}

function isDependencyInstallIntent(text) {
  const s = String(text || "").toLowerCase();
  return (
    s.includes("install dependencies") ||
    s.includes("install the dependencies") ||
    s.includes("how do i install dependencies") ||
    s.includes("how do i install the dependencies") ||
    s.includes("install packages") ||
    s.includes("install the packages")
  );
}

function isPerformanceProjectRequest(text = "") {
  const s = String(text || "").toLowerCase().trim();
  if (!s) return false;

  return (
    /\b(performance|slow|sluggish|laggy|lag|lags|freezes?|freezing|stutters?|optimi[sz]e|speed up|faster|loading time|load time|takes too long|bundle|build size|gzip|web vitals|lighthouse|rerender|re-render|memory leak|high memory|cpu)\b/.test(
      s,
    ) ||
    s.includes("too many renders") ||
    s.includes("reduce bundle") ||
    s.includes("loads slowly") ||
    s.includes("slow to load") ||
    s.includes("make it faster") ||
    s.includes("make this faster")
  );
}

function normalizeDiagnosticPathKey(path = "") {
  return String(path || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/")
    .trim()
    .toLowerCase();
}

function isBinaryAssetPath(path = "") {
  return /\.(png|jpe?g|gif|webp|ico|bmp|svgz?|woff2?|ttf|otf|eot|mp4|webm|mov|mp3|wav|zip|pdf)$/i.test(
    String(path || "").trim(),
  );
}

function collectToolResultPathsFromText(text = "") {
  const source = String(text || "");
  const paths = [];

  for (const match of source.matchAll(/\(Path:\s*([^)]+)\)/g)) {
    if (match?.[1]) paths.push(match[1]);
  }

  for (const match of source.matchAll(/\bPath:\s*([^\r\n)]+)/g)) {
    if (match?.[1]) paths.push(match[1]);
  }

  return paths;
}

function pathKeyMatches(existingKey, nextKey) {
  if (!existingKey || !nextKey) return false;
  return (
    existingKey === nextKey ||
    existingKey.endsWith(`/${nextKey}`) ||
    nextKey.endsWith(`/${existingKey}`)
  );
}

function isDiagnosticReadTool(toolName = "") {
  return toolName === "read_file" || toolName === "list_dir";
}

function isPreviewIntent(text) {
  const s = String(text || "").toLowerCase();
  return (
    s.includes("preview") ||
    s.includes("run the app") ||
    s.includes("use the kforge preview flow") ||
    s.includes("open preview") ||
    s.includes("test this expo app on my phone") ||
    s.includes("on my phone")
  );
}


function buildInstallHandoffMessage() {
  return (
    "KForge can help with this through the Preview panel.\n\n" +
    "You can now leave the chat and open: Preview Panel → Install.\n\n" +
    "If the project needs dependencies, install them there before previewing or running."
  );
}

function buildPreviewHandoffMessage() {
  return (
    "KForge can help with this through the Preview panel.\n\n" +
    "Open: Preview Panel → Preview.\n\n" +
    "After checking Preview, reply with one of:\n" +
    "1. Preview succeeded\n" +
    "2. Preview failed\n\n" +
    "If this project uses a special preview flow, Preview may provide guidance rather than directly running the app inside KForge."
  );
}

function buildPostEditChangeSummary(context = null) {
  return buildCompletedWorkflowChangeSummary(context, {
    fallbackLine: "",
  });
}

function buildPostEditVerificationMessage(context = null) {
  const assistantResult = context?.assistantResult || null;
  const verificationStatus = String(
    context?.verificationStatus ||
      assistantResult?.verificationStatus ||
      VERIFICATION_STATUS.UNKNOWN,
  ).trim();
  const verificationSummary = String(
    context?.verificationSummary ||
      assistantResult?.verificationSummary ||
      "",
  ).trim();

  if (verificationStatus === VERIFICATION_STATUS.PASSED) {
    return `Status:\n- ${verificationSummary || "A verification step was completed."}`;
  }

  if (verificationStatus === VERIFICATION_STATUS.FAILED) {
    return (
      "Status:\n" +
      `- ${verificationSummary || "A verification step failed or reported an issue."}\n` +
      "- Suggested next action: Fix the error."
    );
  }

  if (verificationStatus === VERIFICATION_STATUS.SUGGESTED) {
    return (
      "Status:\n" +
      `- ${verificationSummary || "A verification step is suggested next."}\n` +
      "- Suggested next check: Preview the app."
    );
  }

  return (
    "Status:\n" +
    "- I have not run Preview, build, or tests from this completion.\n" +
    "- Suggested next check: Preview the app.\n" +
    "- If Preview fails, choose Fix the error."
  );
}

function buildPostEditNextStepMessage() {
  return (
    "Next:\nChoose an action below, or use Preview Panel → Preview to run or view it.\n\n" +
    "If dependencies are missing, use Preview Panel → Install first."
  );
}

function buildPostEditCompletionActions({
  context = null,
  appendMessage = null,
  sendWithPrompt = null,
} = {}) {
  if (typeof appendMessage !== "function") return [];

  const editedPaths = Array.isArray(context?.editedPaths)
    ? context.editedPaths.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const lastChangedPath =
    editedPaths.length > 0 ? editedPaths[editedPaths.length - 1] : "";

  return [
    {
      label: SUGGESTED_ACTION_LABEL.PREVIEW_APP,
      onClick: () => {
        appendMessage("user", `Choice: ${SUGGESTED_ACTION_LABEL.PREVIEW_APP}`);
        appendMessage("assistant", buildPreviewHandoffMessage());
      },
    },
    {
      label: SUGGESTED_ACTION_LABEL.VERIFY_CHANGES,
      onClick: () => {
        appendMessage("user", `Choice: ${SUGGESTED_ACTION_LABEL.VERIFY_CHANGES}`);
        appendMessage(
          "assistant",
          buildPostEditVerificationMessage(context),
        );
      },
    },
    {
      label: SUGGESTED_ACTION_LABEL.FIX_ERROR,
      onClick: () => {
        appendMessage("user", `Choice: ${SUGGESTED_ACTION_LABEL.FIX_ERROR}`);
        appendMessage(
          "assistant",
          "Starting preview-error triage. I will inspect the last changed file only first. If there is no concrete error evidence, I will ask for Preview logs instead of changing files.",
        );

        if (typeof sendWithPrompt === "function") {
          sendWithPrompt(
            "Repair a preview/build/runtime error after the completed implementation.\n\n" +
              (lastChangedPath
                ? `Last changed file from workflow state: ${lastChangedPath}\n\n`
                : "No last changed file path is recorded in workflow state.\n\n") +
              "The user chose Fix the error, but no concrete Preview/console log evidence has been provided in this button flow. Evidence-gated repair rules:\n" +
              "- Request exactly one read_file tool call for the last changed file when available.\n" +
              "- Do not call write_file on this first triage pass.\n" +
              "- Do not list directories, inspect package.json, create files, or guess missing framework files unless pasted error evidence specifically mentions them.\n" +
              "- After reading the file, if there is an obvious syntax/import/runtime problem in that file, explain the likely issue and ask the user to paste Preview logs before editing.\n" +
              "- If no obvious issue is visible, say no safe code change is justified yet and ask the user to paste the exact Preview logs or browser console error.\n" +
              "- Do not claim Preview/build/tests passed; the user must run Preview again after any later fix.",
            {
              silentUserAppend: true,
              skipCompletedWorkflowRoute: true,
              previewErrorEvidenceGate: true,
            },
          );
        }
      },
    },
    {
      label: SUGGESTED_ACTION_LABEL.SHOW_CHANGES,
      onClick: () => {
        appendMessage("user", `Choice: ${SUGGESTED_ACTION_LABEL.SHOW_CHANGES}`);
        appendMessage(
          "assistant",
          `Last implementation completed.\n\n${buildPostEditChangeSummary(
            context,
          )}\n\nThis is a changed-file review, not a Git-style diff.`,
        );
      },
    },
    {
      label: SUGGESTED_ACTION_LABEL.CONTINUE_EDITING,
      onClick: () => {
        appendMessage("user", `Choice: ${SUGGESTED_ACTION_LABEL.CONTINUE_EDITING}`);
        appendMessage(
          "assistant",
          "Tell me the next edit, or resend it more explicitly, and I will route it from the current project state.",
        );
      },
    },
    {
      label: SUGGESTED_ACTION_LABEL.NO_ACTION_NEEDED,
      onClick: () => {
        appendMessage("user", `Choice: ${SUGGESTED_ACTION_LABEL.NO_ACTION_NEEDED}`);
        appendMessage("assistant", "No problem — I will leave it there.");
      },
    },
  ];
}

function getAssistantResultActionTypeForContinuation({
  isPerformanceToolExecution = false,
  isFixToolExecution = false,
} = {}) {
  if (isPerformanceToolExecution) return ASSISTANT_ACTION_TYPE.PERFORMANCE;
  if (isFixToolExecution) return ASSISTANT_ACTION_TYPE.FIX;

  return ASSISTANT_ACTION_TYPE.IMPLEMENTATION;
}

function buildPartialAssistantResultForContinuation({
  isPerformanceToolExecution = false,
  isFixToolExecution = false,
  summary = "",
  source = "",
} = {}) {
  const actionType = getAssistantResultActionTypeForContinuation({
    isPerformanceToolExecution,
    isFixToolExecution,
  });

  return buildAssistantResultProtocol({
    actionResult: ASSISTANT_ACTION_RESULT.PARTIAL,
    actionType,
    nextStep:
      actionType === ASSISTANT_ACTION_TYPE.IMPLEMENTATION
        ? WORKFLOW_NEXT_STEP.CONTINUE_IMPLEMENTATION
        : "",
    summary,
    source,
  });
}
function buildAgentConversationInput(messages, tools, maxTurns = 20) {
  const relevant = (Array.isArray(messages) ? messages : [])
    .filter((m) => {
      const role = String(m?.role || "").trim();
      return role === "user" || role === "assistant" || role === "system";
    })
    .slice(-Math.max(1, maxTurns));

  const toolLines = (Array.isArray(tools) ? tools : []).map((tool) => {
    const name = String(tool?.name || "").trim();
    const description = String(tool?.description || "").trim();
    return `- ${name}: ${description}`;
  });

  const transcriptLines = relevant
    .map((m) => {
      const role = String(m?.role || "").trim();
      const label =
        role === "user"
          ? "User"
          : role === "assistant"
            ? "Assistant"
            : "System";

      const content =
        role === "assistant"
          ? stripToolBlocksForChat(String(m?.content || ""))
          : String(m?.content || "");

      return `${label}: ${content.trim()}`;
    })
    .filter(Boolean);

  return (
    `You are continuing an in-progress KForge conversation.\n\n` +
    `Available tools:\n${toolLines.join("\n")}\n\n` +
    `Rules:\n` +
    `- Respect the latest user request above earlier momentum.\n` +
    `- If the latest user request changes topic (for example from editing to previewing, explaining, or showing results), follow the latest request.\n` +
    `- If the latest user asks to preview, run, start, test, or use the KForge Preview flow, do NOT write files.\n` +
    `- For Preview/run requests, answer normally and guide the user to KForge Preview instead of making more code edits.\n` +
    `- KForge UI workflows such as Preview, Services, and Terminal are not callable tools in this loop.\n` +
    `- Do NOT emit tool names like preview, services, install, or terminal. Use normal assistant text for those handoffs.\n` +
    `- If the latest user asks to see changes, summarize the existing tool result or read the file if needed. Do NOT rewrite the file again.\n` +
    `- If the latest user asks to see changes, prefer read_file on the active file or most recently written file.\n` +
    `- Do NOT use list_dir for a "show changes" request unless the user explicitly asked for a directory listing.\n` +
    `- If a file was already written successfully, do NOT repeat the same write_file call unless the user explicitly asks for another edit.\n` +
    `- If the latest user request is still an unfinished implementation task, do NOT stop after a partial file creation or partial edit just to ask for permission to continue.\n` +
    `- After creating a new component or file that obviously still needs integration, continue with the next necessary inspection or edit step.\n` +
    `- Do NOT ask questions like "Would you like to integrate it?" when the integration is an obvious part of the still-active request.\n` +
    `- Only stop and ask a follow-up question when the next implementation step is genuinely ambiguous or there are multiple equally plausible directions.\n` +
    `- If the core user request has already been implemented, stop the tool loop and provide the final assistant answer instead of continuing into extra inspections or polish.\n` +
    `- Do NOT inspect or modify adjacent files like main entry files, global CSS, routing, or app shell files unless the user asked for that work or inspection has already confirmed it is truly required for the requested feature.\n` +
    `- Do NOT add styling, polish, refactors, or extra integrations after the requested feature is already working unless the user explicitly asked for them.\n` +
    `- For unfinished implementation work, do NOT stop at narrative progress updates such as saying you will integrate the new file next.\n` +
    `- If the task is still unfinished and the next implementation step is clear, the same continuation answer must emit the next single tool call instead of stopping after prose.\n` +
    `- After creating one required file, continue directly to the next obvious integration edit when it is still part of the same active request.\n` +
    `- Never write placeholder, abbreviated, or comment-only file contents such as "/* Updated content ... */". write_file content must be the full intended file text.\n` +
    `- If the user reports a blank page, dead link, broken UI, or not-working app, treat that as a bugfix request, not a preview request.\n` +
    `- If inspection shows a source/app file contains only placeholder or comment-only content, that file is broken. Do not ask the user for requirements; repair it with a minimal working implementation that fits the prior request.\n` +
    `- If a React App.jsx/App.tsx file is placeholder-only and the app is blank, write a complete minimal React component that renders visible UI.\n` +
    `- If you need a tool, request exactly one tool call.\n` +
    `- Prefer a single tool call at a time.\n` +
    `- If no more tools are needed, provide the final assistant answer.\n` +
    `- Do not repeat the full prior conversation unnecessarily.\n` +
    `- You are inspecting or continuing work inside an existing workspace unless the user explicitly asks to create files or folders.\n` +
    `- If the latest user request is normal in-project implementation work and routine inspection reveals a clear existing target, continue with the next necessary tool or edit step instead of stopping to ask for permission.\n` +
    `- For multi-file implementation requests, inspect each likely existing target file before writing it unless that exact file was already read in this conversation.\n` +
    `- For multi-file work, proceed one file/tool step at a time; edit only known inspected paths and stop clearly if another required file is genuinely ambiguous.\n` +
    `- Do not ask follow-up questions like which file or directory to use after routine inspection unless the request is genuinely ambiguous or multiple existing targets are equally plausible.\n` +
    `- For ordinary feature requests inside an existing project, prefer the simplest responsible existing file and continue.\n` +
    `- Do NOT introduce a router, routing library, navigation framework, or URL-based page structure unless inspection confirms the project already uses routing or the user explicitly asks for it.\n` +
    `- If the user asks for a "page" in a simple single-view app, prefer the simplest responsible in-app settings view, panel, section, or toggle before converting the app to routed navigation.\n` +
    `- If the next edit may require a new dependency, inspect package.json first and do NOT assume that dependency is already installed.\n` +
    `- If the workspace is empty and the latest user asks to add a page, feature, or app, do not start inventing files in the tool loop; answer normally and direct the user toward the supported new-project path instead.\n` +
    `- Do NOT create files or directories unless the user explicitly asks for them.\n` +
    `- When workspace context already names a likely existing file, prefer read_file on that candidate before broad directory listing.\n` +
    `- Use list_dir(".") as a fallback when no useful candidate file or folder is already visible from workspace context or prior tool results.\n` +
    `- If a tool already returned the requested information, DO NOT call the same tool again.\n` +
    `- For inspection-only or explanation requests, summarize the tool result for the user once enough information is available.\n` +
    `- For normal in-project implementation work, do NOT stop after the first inspection result just to summarize it.\n` +
    `- After a directory listing, use that result to choose the next necessary inspection tool or edit step.\n` +
    `- If the directory listing already shows a likely app target such as src/, app/, pages/, or package.json, continue with the next tool instead of narrating the structure.\n` +
    `- Only call another tool if new information is required for the current implementation step.\n` +
    `- For workspace inspection tasks, use at most 3 tool calls before answering.\n` +
    `- Prefer this order for implementation-oriented inspection: candidate read_file from workspace context when available, otherwise list_dir(".") or a candidate folder, then read_file on the most likely existing target.\n` +
    `- Do NOT inspect subdirectories like node_modules unless the user explicitly asks.\n` +
    `- Do NOT read more files once you have enough information to continue the edit or provide the final answer.\n` +
    `- If you need a tool, output ONLY a tool request in the exact fenced format.\n` +
    `- Do NOT describe the tool call in plain English.\n` +
    `- Do NOT write list_dir(path) or read_file(path).\n` +
    `- Return only a single tool block when requesting a tool, like:\n` +
    `\`\`\`tool\n{ "name": "list_dir", "args": { "path": "." } }\n\`\`\`\n\n` +
    `Conversation so far:\n${transcriptLines.join("\n")}\n\n` +
    `Continue from the latest state.`
  );
}
function normalizeAgentToolCall(call, activeFilePath) {
  if (!call || typeof call !== "object") return null;

  const name = String(call.name || "").trim();
  const args = { ...(call.args || {}) };

  if (!name || !ALLOWED_MODEL_TOOLS.has(name)) return null;

  if (name === "search_in_file") {
    if (!args.path && activeFilePath) args.path = activeFilePath;
    const q = String(args.query || "").trim();
    if (!q) return null;
    if (!args.path) return null;
  }

  return { name, args };
}

function extractSingleAgentToolCall(text, activeFilePath) {
  const raw = String(text || "");
  if (!raw.trim()) return null;

  const xmlCalls = extractXmlToolCalls(raw);
  if (xmlCalls.length > 0) {
    return normalizeAgentToolCall(xmlCalls[0], activeFilePath);
  }

  const blocks = extractFencedBlocks(raw);
  for (const block of blocks) {
    const parsed = safeParseToolRequestJson(block.payload);
    if (!parsed) continue;
    const normalized = normalizeAgentToolCall(parsed, activeFilePath);
    if (normalized) return normalized;
  }

  const bare = tryParseBareToolJson(raw);
  if (bare) {
    return normalizeAgentToolCall(bare, activeFilePath);
  }

  const natural = tryParseNaturalLanguageToolCall(raw);
  if (natural) {
    return normalizeAgentToolCall(natural, activeFilePath);
  }

  return null;
}
/**
 * Parse XML-ish tool calls.
 */
function extractXmlToolCalls(text) {
  const s = String(text || "");
  const hasDirectToolTag = Array.from(ALLOWED_MODEL_TOOLS).some((toolName) =>
    s.includes(`<${toolName}>`),
  );
  const hasInvokeToolCall = /<invoke\s+name="[^"]+"\s*>/i.test(s);
  if (!s.includes("<tool_call") && !hasDirectToolTag && !hasInvokeToolCall) {
    return [];
  }

  const calls = [];
  // Variant 0: <tool_call>list_dir
  // { "path": "src" }
  const simpleToolCallRe =
    /<tool_call>\s*([A-Za-z0-9_:-]+)\s*([\s\S]*?)(?=<\/tool_call>|<tool_call>|$)/gi;
  let simpleMatch;
  while ((simpleMatch = simpleToolCallRe.exec(s)) !== null) {
    const name = String(simpleMatch[1] || "").trim();
    const body = String(simpleMatch[2] || "").trim();

    if (!ALLOWED_MODEL_TOOLS.has(name)) continue;

    let args = {};
    const jsonMatch = body.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsedArgs = JSON.parse(jsonMatch[0]);
        if (parsedArgs && typeof parsedArgs === "object") {
          args = parsedArgs;
        }
      } catch {
        // Ignore malformed near-tool JSON.
      }
    }

    calls.push({ name, args, source: "xml_simple_tool_call" });
  }

  // Variant Direct: <read_file><path>src/App.jsx</path></read_file>
  // Also supports any allowed tool name as the outer tag.
  for (const directToolName of ALLOWED_MODEL_TOOLS) {
    const directRe = new RegExp(
      `<${directToolName}>\\s*([\\s\\S]*?)\\s*</${directToolName}>`,
      "gi",
    );

    let directMatch;
    while ((directMatch = directRe.exec(s)) !== null) {
      const body = String(directMatch[1] || "").trim();
      let args = {};

      if (body.startsWith("{") && body.endsWith("}")) {
        try {
          const parsedArgs = JSON.parse(body);
          if (parsedArgs && typeof parsedArgs === "object") {
            args = parsedArgs;
          }
        } catch {
          // Ignore malformed direct-tool JSON.
        }
      } else {
        const childRe = /<([A-Za-z0-9_:-]+)>\s*([\s\S]*?)\s*<\/\1>/g;
        let childMatch;
        while ((childMatch = childRe.exec(body)) !== null) {
          const rawKey = String(childMatch[1] || "").trim();
          const val = String(childMatch[2] || "").trim();
          if (!rawKey) continue;

          const kLower = rawKey.toLowerCase();
          let key = rawKey;
          if (
            kLower === "search_term" ||
            kLower === "term" ||
            kLower === "search"
          ) {
            key = "query";
          }

          args[key] = val;
        }
      }

      calls.push({ name: directToolName, args, source: "xml_direct_tool_tag" });
    }
  }
  // Variant A: <invoke name="..."> ... </invoke>
  const invokeRe = /<invoke\s+name="([^"]+)"\s*>([\s\S]*?)<\/invoke>/g;
  let m;
  while ((m = invokeRe.exec(s)) !== null) {
    const name = String(m[1] || "").trim();
    const body = String(m[2] || "");

    if (!ALLOWED_MODEL_TOOLS.has(name)) continue;

    const args = {};
    const paramRe = /<parameter\s+name="([^"]+)"\s*>([\s\S]*?)<\/parameter>/g;
    let p;
    while ((p = paramRe.exec(body)) !== null) {
      const k = String(p[1] || "").trim();
      const v = String(p[2] || "").trim();
      if (k) args[k] = v;
    }

    calls.push({ name, args, source: "xml_invoke" });
  }

  // Variant B: <function_name>...</function_name> + <parameters>...</parameters>
  const fnMatch = s.match(/<function_name>\s*([^<]+)\s*<\/function_name>/i);
  if (fnMatch) {
    const name = String(fnMatch[1] || "").trim();
    if (ALLOWED_MODEL_TOOLS.has(name)) {
      const args = {};

      const paramsMatch = s.match(
        /<parameters>\s*([\s\S]*?)\s*<\/parameters>/i,
      );
      if (paramsMatch) {
        const body = String(paramsMatch[1] || "");

        const childRe = /<([A-Za-z0-9_:-]+)>\s*([\s\S]*?)\s*<\/\1>/g;
        let c;
        while ((c = childRe.exec(body)) !== null) {
          const rawKey = String(c[1] || "").trim();
          const val = String(c[2] || "").trim();
          if (!rawKey) continue;

          const kLower = rawKey.toLowerCase();
          let key = rawKey;
          if (
            kLower === "search_term" ||
            kLower === "term" ||
            kLower === "search"
          )
            key = "query";

          args[key] = val;
        }
      }

      calls.push({ name, args, source: "xml_function_name" });
    }
  }
  return calls;
}

function ProviderMenuButton({
  provider,
  model,
  configured,
  advancedOpen,
  onToggleAdvanced,
  onChangeProviderModel,
  onConfigure,
}) {
  const [open, setOpen] = React.useState(false);

  const label = `${provider || "No Provider"} / ${model || "(none)"}`;

  const buttonTone = configured
    ? "bg-emerald-600/90 hover:bg-emerald-600 border-emerald-500/60"
    : "bg-red-600/90 hover:bg-red-600 border-red-500/60";

  return (
    <div className="relative">
      <button
        type="button"
        title={label}
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-2 px-2.5 py-1 rounded-md border",
          "text-sm font-semibold text-white",
          "max-w-[360px]",
          buttonTone,
        ].join(" ")}
      >
        <span className="truncate max-w-[300px]">{label}</span>
        <span className="text-yellow-300 font-extrabold text-xs leading-none">
          ▼
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 mt-2 w-64 rounded-md border border-zinc-800 bg-zinc-950 shadow-lg z-50 overflow-hidden">
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-900"
            onClick={() => {
              setOpen(false);
              onChangeProviderModel();
            }}
          >
            Change Provider / Model
          </button>

          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-900"
            onClick={() => {
              setOpen(false);
              onConfigure();
            }}
          >
            Configure AI
          </button>

          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-900"
            onClick={() => {
              setOpen(false);
              onToggleAdvanced();
            }}
          >
            {advancedOpen ? "Advanced settings ▴" : "Advanced settings ▾"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
const AI_HELP_LINKS = [
  {
    id: "user_guide",
    label: "User Guide",
    url: "https://kilmane.github.io/kforge/user-guide.html",
  },
  {
    id: "workspace_awareness",
    label: "Workspace Awareness",
    url: "https://kilmane.github.io/kforge/workspace-awareness.html",
  },
  {
    id: "providers_and_models",
    label: "Providers and Models",
    url: "https://kilmane.github.io/kforge/PROVIDERS_AND_MODELS.html",
  },
  {
    id: "ollama_cloud",
    label: "How to Use Ollama Cloud",
    url: "https://kilmane.github.io/kforge/ollama_cloud.html",
  },
  {
    id: "models_color_labels",
    label: "Models Color + Labels",
    url: "https://kilmane.github.io/kforge/MODELS_COLOR_LABELS.html",
  },
  {
    id: "api_keys_and_billing",
    label: "API Keys + Billing",
    url: "https://kilmane.github.io/kforge/api-keys-and-billing.html",
  },
  {
    id: "custom_providers",
    label: "Custom Provider (OpenAI-compatible)",
    url: "https://kilmane.github.io/kforge/custom_provider.html",
  },
  {
    id: "presets_inventory",
    label: "Presets Inventory",
    url: "https://kilmane.github.io/kforge/PRESETS_INVENTORY.html",
  },
  {
    id: "terminology",
    label: "Terminology",
    url: "https://kilmane.github.io/kforge/terminology.html",
  },
  {
    id: "project_memory",
    label: "What is Project Memory?",
    url: "https://kilmane.github.io/kforge/project-memory.html",
  },
  {
    id: "portability",
    label: "Portability",
    url: "https://kilmane.github.io/kforge/portability.html",
  },
];
function HelpMenuPlaceholder({ invoke }) {
  const [open, setOpen] = React.useState(false);

  async function openHelpLink(url) {
    const target = String(url || "").trim();
    if (!target) return;

    try {
      if (typeof invoke === "function") {
        await invoke("open_url", { url: target });
      } else {
        window.open(target, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(target, "_blank", "noopener,noreferrer");
    } finally {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        title="Help"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-2 px-2.5 py-1 rounded-md border",
          "text-sm font-semibold text-white",
          "bg-emerald-600/90 hover:bg-emerald-600 border-emerald-500/60",
        ].join(" ")}
      >
        <span>Help</span>
        <span className="text-yellow-300 font-extrabold text-xs leading-none">
          ▼
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 mt-2 w-72 rounded-md border border-zinc-800 bg-zinc-950 shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-800 bg-zinc-900/40">
            KForge Help
          </div>

          <div className="py-1">
            {AI_HELP_LINKS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-900"
                onClick={() => openHelpLink(item.url)}
                title={item.label}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
export default function AiPanel({
  // layout / open state
  projectPath,
  aiPanelOpen,
  aiPanelWidthClass,
  aiPanelWide,
  setAiPanelWide,
  setAiPanelOpen,
  setFocusMode,

  // provider header surface
  providerMeta,
  providerReady,
  modelWorkflowPolicy,
  disabledExplainer,
  headerStatus,
  providerGroupLabel,
  statusChipClass,
  showProviderSurfaceHint,

  // settings routing
  openSettings,
  aiProvider,

  // ephemeral switch note
  providerSwitchNote,
  handleDismissSwitchNote,

  // provider + model controls
  providerOptions,
  handleProviderChange,
  providerStatus,
  disabledProviderMessage,

  aiModel,
  setAiModel,
  modelPlaceholder,
  modelSuggestions,
  showModelHelper,
  modelHelperText,

  // transcript
  messages,
  TranscriptBubble,
  transcriptBottomRef,
  CHAT_CONTEXT_TURNS,
  lastSend,
  aiRunning,
  activityTick = 0,
  handleRetryLast,
  clearConversation,

  // prompt
  activeTab,
  handleUseActiveFileAsPrompt,
  includeActiveFile,
  setIncludeActiveFile,
  activeFileChip,

  askForPatch,
  setAskForPatch,

  // patch preview state/handlers (kept in App)
  patchPreview,
  patchPreviewVisible,
  copyPatchToClipboard,
  setPatchPreviewVisible,
  discardPatchPreview,
  appendMessage,
  updateMessage,
  onWorkspaceTreeRefresh,
  setWorkflowContext,

  aiPrompt,
  setAiPrompt,
  handlePromptKeyDown,

  // system + params
  aiSystem,
  setAiSystem,
  aiTemperature,
  setAiTemperature,
  aiMaxTokens,
  setAiMaxTokens,

  // actions
  runAi,
  handleSendChat,
  sendWithPrompt,
  handleAiTest,
  aiTestStatus,
  guardrailText,

  // output + ollama helper
  aiOutput,
  endpoints,
  invoke,
  setAiTestOutput,
  setRuntimeReachable,
  formatTauriError,
  buttonClass,
  iconButtonClass,
  GearIcon,

  // focus layout (dock expanded)
  focusLayout,
}) {
  const aiEndpoint = (endpoints?.[aiProvider] || "").trim();
  const isFocusLayout = !!focusLayout;
  const pendingAssistantText = useMemo(() => {
    return `Working${".".repeat(activityTick % 4)}`;
  }, [activityTick]);

  // ✅ Advanced settings (power user knobs). Calm by default.
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // ✅ Provider/Model picker (not "advanced")
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // ✅ Dev tools are for KForge development only (not for end users).
  // Hidden by default. Toggle with Ctrl+Shift+T (dev builds only).
  const isDevBuild = process.env.NODE_ENV === "development";
  const [devToolsEnabled, setDevToolsEnabled] = useState(() => {
    if (!isDevBuild) return false;
    return localStorage.getItem("kforge:devToolsEnabled") === "1";
  });

  // 🔧 Preview runner panel (dev-only runtime tool).
  // Collapsed by default to keep UI calm.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesSectionRef = useRef(null);
  const servicesPanelScrollRef = useRef(null);

  useEffect(() => {
    if (!servicesOpen) return;

    requestAnimationFrame(() => {
      if (servicesPanelScrollRef.current) {
        servicesPanelScrollRef.current.scrollTop = 0;
      }
    });
  }, [servicesOpen]);

  const revealChatForPromptActivity = useCallback(() => {
    setPreviewOpen(false);
    setTerminalOpen(false);
    setServicesOpen(false);

    if (isFocusLayout && typeof setFocusMode === "function") {
      setFocusMode(true);
    }
  }, [isFocusLayout, setFocusMode]);

  const handleSendChatFromPrompt = useCallback(() => {
    revealChatForPromptActivity();
    handleSendChat();
  }, [handleSendChat, revealChatForPromptActivity]);

  const handlePromptKeyDownFromPrompt = useCallback(
    (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        revealChatForPromptActivity();
      }

      handlePromptKeyDown(event);
    },
    [handlePromptKeyDown, revealChatForPromptActivity],
  );

  useEffect(() => {
    if (!isDevBuild) return;

    const onKeyDown = (e) => {
      const key = String(e.key || "").toLowerCase();
      if (e.ctrlKey && e.shiftKey && key === "t") {
        e.preventDefault();
        setDevToolsEnabled((v) => {
          const next = !v;
          localStorage.setItem("kforge:devToolsEnabled", next ? "1" : "0");
          return next;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDevBuild]);

  const aiModelStr = useMemo(() => {
    if (typeof aiModel === "string") return aiModel;
    if (
      aiModel &&
      typeof aiModel === "object" &&
      typeof aiModel.id === "string"
    )
      return aiModel.id;
    return "";
  }, [aiModel]);

  const pendingConsentRef = useRef(null);
  const preWriteSnapshotsRef = useRef([]);

  // Local cache still used, but global is the real guard.
  const processedKeysRef = useRef(new Set());
  const toolBatchRunningRef = useRef(false);
  const toolBatchRescanNeededRef = useRef(false);
  const [toolScanTick, setToolScanTick] = useState(0);

  // ✅ Reset caches when conversation clears
  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) {
      processedKeysRef.current = new Set();
      toolBatchRescanNeededRef.current = false;
      GLOBAL_SEEN_TOOL_KEYS.clear();
    }
  }, [messages]);

  const requestConsent = useCallback(
    async ({ toolName, args }) => {
      if (pendingConsentRef.current?.resolve) {
        try {
          pendingConsentRef.current.resolve("cancelled");
        } catch {
          // ignore
        }
        pendingConsentRef.current = null;
      }

      const tool = String(toolName || "tool");
      const id = uidShort();

      let resolve;
      const p = new Promise((r) => {
        resolve = r;
      });

      const gate = { settled: false, resolve };

      pendingConsentRef.current = { id, tool, resolve };

      const detail =
        tool === "read_file"
          ? `Read file (Path: ${String(args?.path || "").trim()})`
          : tool === "list_dir"
            ? `List directory (Path: ${String(args?.path || "").trim()})`
            : tool === "search_in_file"
              ? `Search in file (Path: ${String(args?.path || "").trim()} | Query: ${String(args?.query || "").trim()})`
              : "Awaiting approval…";

      const requestMsg = appendMessage(
        "system",
        formatToolLine({
          tool,
          status: "request",
          id,
          detail: detail || "Awaiting approval…",
        }),
        {
          actions: [
            {
              label: "Approve",
              onClick: () => {
                if (gate.settled) return;
                gate.settled = true;

                pendingConsentRef.current = null;

                updateMessage(requestMsg.id, {
                  actions: [
                    {
                      label: "Approved",
                      onClick: () => {},
                    },
                  ],
                });

                appendMessage(
                  "system",
                  formatToolLine({
                    tool,
                    status: "calling",
                    id,
                    detail: "Approved by user — executing…",
                  }),
                );

                try {
                  gate.resolve("approved");
                } catch {
                  // ignore
                }
              },
            },
            {
              label: "Cancel",
              onClick: () => {
                if (gate.settled) return;
                gate.settled = true;

                pendingConsentRef.current = null;

                updateMessage(requestMsg.id, {
                  actions: [
                    {
                      label: "Cancelled",
                      onClick: () => {},
                    },
                  ],
                });

                appendMessage(
                  "system",
                  formatToolLine({
                    tool,
                    status: "cancelled",
                    id,
                    detail: "User denied.",
                  }),
                );

                try {
                  gate.resolve("cancelled");
                } catch {
                  // ignore
                }
              },
            },
          ],
        },
      );

      return p;
    },
    [appendMessage, updateMessage],
  );
  const lastToolEventRef = useRef("");
  const appendTranscript = useCallback(
    (entry) => {
      const meta = entry?.meta || {};
      const fingerprint = `${meta.toolName || ""}:${meta.phase || ""}:${String(entry?.content || "").slice(0, 120)}`;

      if (fingerprint && lastToolEventRef.current === fingerprint) {
        return; // prevent duplicate transcript entries
      }

      lastToolEventRef.current = fingerprint;
      const phase = meta.phase;

      if (phase === "call") return;
      if (phase === "cancelled") return;

      const tool = meta.toolName || "tool";
      const id = pendingConsentRef.current?.id || "";

      if (phase === "result") {
        const body = String(entry?.content || "");
        appendMessage(
          "system",
          formatToolLine({ tool, status: "ok", id, detail: "" }) +
            (body ? `\n\n${body}` : ""),
        );
        return;
      }

      if (phase === "error") {
        const detail = String(entry?.content || "");
        appendMessage(
          "system",
          formatToolLine({ tool, status: "error", id, detail }),
        );
        return;
      }

      appendMessage("system", String(entry?.content || ""));
    },
    [appendMessage],
  );

  const invokeTool = useCallback(async (toolName, args) => {
    return await runToolHandler(toolName, args);
  }, []);

  const capturePreWriteSnapshot = useCallback(async (path) => {
    const cleanPath = String(path || "").trim();
    if (!isPreWriteSnapshotCandidatePath(cleanPath)) return null;

    try {
      const previousContent = String((await openFile(cleanPath)) ?? "");
      const byteLength = getTextByteLength(previousContent);

      if (byteLength > MAX_PRE_WRITE_SNAPSHOT_BYTES) {
        return null;
      }

      const snapshot = {
        path: cleanPath,
        previousContent,
        byteLength,
        capturedAt: Date.now(),
      };

      preWriteSnapshotsRef.current = [
        ...preWriteSnapshotsRef.current.filter(
          (item) => String(item?.path || "").trim() !== cleanPath,
        ),
        snapshot,
      ].slice(-PRE_WRITE_SNAPSHOT_LIMIT);

      return snapshot;
    } catch {
      return null;
    }
  }, []);

  const runTool = useCallback(
    async ({ toolName, args }) => {
      const res = await runToolCall({
        toolCall: { name: toolName, args },
        appendTranscript,
        requestConsent,
        invokeTool: async (toolName2, args2) => {
          try {
            if (toolName2 === "write_file") {
              await capturePreWriteSnapshot(args2?.path);
            }

            return await invokeTool(toolName2, args2);
          } catch (err) {
            const msg = formatTauriError ? formatTauriError(err) : String(err);
            throw new Error(msg);
          }
        },
        isConsentRequired: (toolName2) => !SAFE_AUTOMATIC_TOOLS.has(toolName2),
      });

      if (
        res?.ok &&
        (toolName === "write_file" || toolName === "mkdir") &&
        typeof onWorkspaceTreeRefresh === "function"
      ) {
        try {
          await onWorkspaceTreeRefresh();
        } catch {
          // Keep tool success intact even if Explorer refresh fails.
        }
      }

      return res;
    },
    [
      appendTranscript,
      requestConsent,
      invokeTool,
      capturePreWriteSnapshot,
      formatTauriError,
      onWorkspaceTreeRefresh,
    ],
  );

  // Model-initiated tool detection: scan assistant messages.
  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) return;
    if (toolBatchRunningRef.current) {
      toolBatchRescanNeededRef.current = true;
      return;
    }

    const processAssistantToolCalls = async () => {
      toolBatchRunningRef.current = true;
      const batchCalls = [];
      let triggerMessageIndex = -1;

      const queueCall = ({ key, toolName, args, sourceIndex }) => {
        if (
          GLOBAL_SEEN_TOOL_KEYS.has(key) ||
          processedKeysRef.current.has(key)
        ) {
          return;
        }

        if (triggerMessageIndex < 0 && typeof sourceIndex === "number") {
          triggerMessageIndex = sourceIndex;
        }

        GLOBAL_SEEN_TOOL_KEYS.add(key);
        processedKeysRef.current.add(key);
        batchCalls.push({ toolName, args });
      };

      try {
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (msg?.role !== "assistant") continue;

          const content = getMsgText(msg);
          if (!content) continue;

          const msgKey = String(msg?.id ?? msg?.ts ?? i);
          const pendingCalls = [];
          if (msg?.meta?.allowModelToolExecution !== true) {
            continue;
          }

          // A) XML tool calls
          const xmlCalls = extractXmlToolCalls(content);
          if (xmlCalls.length) {
            for (const c of xmlCalls) {
              const args = { ...(c.args || {}) };

              if (c.name === "search_in_file") {
                if (!args.path && activeTab?.path) args.path = activeTab.path;

                const q = String(args.query || "").trim();
                if (!q) {
                  appendMessage(
                    "system",
                    "[tool] ⚠️ search_in_file ignored: missing required arg: query",
                  );
                  continue;
                }
                if (!args.path) {
                  appendMessage(
                    "system",
                    "[tool] ⚠️ search_in_file ignored: no active file and no path provided",
                  );
                  continue;
                }
              }

              const tiny = hashString(`${c.name}|${JSON.stringify(args)}`);
              const key = `mtool:xml:${msgKey}:${tiny}`;
              queueCall({ key, toolName: c.name, args, sourceIndex: i });
            }
          }

          // B) Fenced blocks
          if (content.includes("```")) {
            const blocks = extractFencedBlocks(content);
            for (const b of blocks) {
              const parsed = safeParseToolRequestJson(b.payload);
              if (!parsed) continue;

              const args = { ...(parsed.args || {}) };

              if (parsed.name === "search_in_file") {
                if (!args.path && activeTab?.path) args.path = activeTab.path;

                const q = String(args.query || "").trim();
                if (!q) {
                  appendMessage(
                    "system",
                    "[tool] ⚠️ search_in_file ignored: missing required arg: query",
                  );
                  continue;
                }
                if (!args.path) {
                  appendMessage(
                    "system",
                    "[tool] ⚠️ search_in_file ignored: no active file and no path provided",
                  );
                  continue;
                }
              }

              const tiny = hashString(`${parsed.name}|${b.payload}`);
              const key = `mtool:fence:${msgKey}:${tiny}`;
              queueCall({ key, toolName: parsed.name, args, sourceIndex: i });
            }
          }

          // C) Bare JSON
          const bare = tryParseBareToolJson(content);
          if (bare) {
            const args = { ...(bare.args || {}) };

            if (bare.name === "search_in_file") {
              if (!args.path && activeTab?.path) args.path = activeTab.path;

              const q = String(args.query || "").trim();
              if (!q) {
                appendMessage(
                  "system",
                  "[tool] ⚠️ search_in_file ignored: missing required arg: query",
                );
              } else if (!args.path) {
                appendMessage(
                  "system",
                  "[tool] ⚠️ search_in_file ignored: no active file and no path provided",
                );
              } else {
                const tiny = hashString(`${bare.name}|${content.trim()}`);
                const key = `mtool:bare:${msgKey}:${tiny}`;
                queueCall({ key, toolName: bare.name, args, sourceIndex: i });
              }
            } else {
              const tiny = hashString(`${bare.name}|${content.trim()}`);
              const key = `mtool:bare:${msgKey}:${tiny}`;
              queueCall({ key, toolName: bare.name, args, sourceIndex: i });
            }
          }
          if (pendingCalls.length > 0) {
            continue;
          }
        }
        if (batchCalls.length > 0) {
          const latestUserText = getNearestUserMessageTextBeforeIndex(
            messages,
            triggerMessageIndex,
          );
          const latestUserMessageIndex = getNearestUserMessageIndexBeforeIndex(
            messages,
            triggerMessageIndex,
          );
          const triggerToolMessage =
            triggerMessageIndex >= 0 ? messages[triggerMessageIndex] : null;
          const triggerToolTaskKind = String(
            triggerToolMessage?.meta?.modelToolExecutionKind || "",
          ).trim();
          const isFixToolExecution =
            triggerToolTaskKind === "broken_preview_debug";
          const isControlledReadOnlyToolExecution =
            triggerToolMessage?.meta?.controlledReadOnlyToolExecution === true;

          if (isControlledReadOnlyToolExecution) {
            const readCalls = batchCalls.filter(
              (call) => String(call?.toolName || "").trim() === "read_file",
            );

            if (batchCalls.length !== 1 || readCalls.length !== 1) {
              appendMessage(
                "assistant",
                "KForge blocked this controlled inspection because the model requested more than one tool or a non-read tool.\n\nNo files were changed.",
                {
                  actions: [
                    {
                      label: "Back to chat",
                      onClick: () => {
                        appendMessage("user", "Choice: Back to chat");
                        appendMessage("assistant", "No problem — continue in chat when ready.");
                      },
                    },
                    {
                      label: SUGGESTED_ACTION_LABEL.STOP,
                      onClick: () => {
                        appendMessage("user", "Choice: Stop");
                        appendMessage("assistant", "Okay — stopping here. No files were changed.");
                      },
                    },
                  ],
                },
              );
              return;
            }
          }


          if (
            shouldBlockBlindWrite({
              calls: batchCalls,
              taskKind: triggerToolTaskKind,
              userMessageIndex: latestUserMessageIndex,
              userText: latestUserText,
            })
          ) {
            const assistantResult = buildAssistantResultProtocol({
              actionResult: ASSISTANT_ACTION_RESULT.BLOCKED,
              actionType: getAssistantResultActionTypeForContinuation({
                isFixToolExecution,
              }),
              summary: isFixToolExecution
                ? "KForge blocked a fix write before inspection completed."
                : "KForge blocked an edit write before project inspection completed.",
              source: "blind_write_guard",
            });
            const inspectFirstActionLabel =
              assistantResult.suggestedActions[0] ||
              SUGGESTED_ACTION_LABEL.INSPECT_FIRST;
            const stopActionLabel =
              assistantResult.suggestedActions.find(
                (item) => item === SUGGESTED_ACTION_LABEL.STOP,
              ) || SUGGESTED_ACTION_LABEL.STOP;

            appendMessage(
              "assistant",
              isFixToolExecution
                ? "KForge blocked a file write because the model tried to fix files before completing inspection.\n\nNo files were changed."
                : "KForge blocked a file write because the model tried to edit files before inspecting the project.\n\nNo files were changed.",
              {
                actions: [
                  {
                    label: inspectFirstActionLabel,
                    onClick: () => {
                      const originalGoal = String(
                        latestUserText ||
                          (isFixToolExecution
                            ? "Continue the previous fix/debug task."
                            : "Continue the previous implementation."),
                      ).trim();

                      appendMessage(
                        "assistant",
                        isFixToolExecution
                          ? "Inspecting first before attempting the fix."
                          : "Inspecting first before attempting the edit.",
                      );

                      if (typeof sendWithPrompt === "function") {
                        sendWithPrompt(
                          (isFixToolExecution
                            ? "Inspect before fixing.\n\n"
                            : "Inspect before editing.\n\n") +
                            `Original request: ${originalGoal}\n\n` +
                            "The previous model response tried to request write_file before inspection evidence was available.\n" +
                            "Do not request write_file yet. Request exactly one inspection tool call next: read_file, list_dir, or search_in_file.\n" +
                            (isFixToolExecution
                              ? "After the inspection result is available, continue with the smallest safe fix only if needed."
                              : "After the inspection result is available, continue with the smallest safe edit only if needed."),
                          {
                            silentUserAppend: true,
                            forceModelCapabilityTestOverride: true,
                          },
                        );
                      }
                    },
                  },
                  {
                    label: stopActionLabel,
                    onClick: () => {
                      appendMessage(
                        "assistant",
                        "Stopped. No files were changed by the blocked write.",
                      );
                    },
                  },
                ],
              },
            );
            return;
          }

          appendMessage("assistant", buildToolBatchWorkingMessage(batchCalls));

          const executedBatchResults = [];

          for (const call of batchCalls) {
            const result = await runTool({
              toolName: call.toolName,
              args: call.args,
            });

            executedBatchResults.push({
              toolName: String(call.toolName || ""),
              args: call.args || {},
              ok: !!result?.ok,
              cancelled: !!result?.cancelled,
              error: result?.error ? String(result.error) : "",
              result:
                typeof result?.result === "string"
                  ? result.result
                  : JSON.stringify(result?.result ?? {}, null, 2),
            });
          }

          rememberSuccessfulInspectionForTask({
            taskKind: triggerToolTaskKind,
            userMessageIndex: latestUserMessageIndex,
            userText: latestUserText,
            results: executedBatchResults,
          });

          const cancelledToolNames = executedBatchResults
            .filter((item) => item?.cancelled)
            .map((item) => item.toolName || "tool");

          if (cancelledToolNames.length > 0) {
            const cancelledList = Array.from(new Set(cancelledToolNames)).join(", ");
            appendMessage(
              "assistant",
              `Cancelled — stopped ${cancelledList}. I did not continue after the denied tool request.`,
            );
            return;
          }

          if (isControlledReadOnlyToolExecution) {
            const successfulReadItems = executedBatchResults
              .filter(
                (item) =>
                  item?.ok &&
                  String(item?.toolName || "").trim() === "read_file",
              )
              .map((item) => ({
                path: String(item?.args?.path || "").trim(),
                ok: true,
              }))
              .filter((item) => item.path);

            const formatControlledReadOnlyPaths = (items = []) => {
              const paths = Array.from(
                new Set(
                  items
                    .filter((item) => item?.ok)
                    .map((item) => String(item?.path || "").trim())
                    .filter(Boolean),
                ),
              );

              return paths.length > 0
                ? paths.map((path) => `- ${path}`).join("\n")
                : "- None yet";
            };

            const buildControlledReadOnlyProgressMessage = (items = [], lead = "This is only a partial inspection") =>
              "Read-only inspection step completed.\n\n" +
              "No files were changed.\n\n" +
              `${lead}.\n\n` +
              "Files inspected so far:\n" +
              formatControlledReadOnlyPaths(items) +
              "\n\nChoose the next safe step:";

            const buildControlledReadOnlyInspectionActions = (knownReadItems = []) => {
              const known = new Set(
                knownReadItems
                  .filter((item) => item?.ok)
                  .map((item) => String(item?.path || "").trim().toLowerCase())
                  .filter(Boolean),
              );
              const preferredNextReadPaths = [
                "package.json",
                "src/main.jsx",
                "src/App.css",
                "src/index.css",
                "src/App.jsx",
              ];
              const nextReadPath =
                preferredNextReadPaths.find(
                  (candidate) => !known.has(candidate.toLowerCase()),
                ) || "";
              const actions = [];

              if (nextReadPath) {
                actions.push({
                  label: "Continue inspection",
                  onClick: async () => {
                    appendMessage("user", "Choice: Continue inspection");
                    appendMessage(
                      "assistant",
                      `Working… reading ${nextReadPath}.\n\nModel reminder: for serious app-building, multi-file inspection, payments, backend, auth, deployment, or complex implementation, use a Recommended builder or High capability model from the Provider/Model preset list.`,
                    );

                    const result = await runTool({
                      toolName: "read_file",
                      args: { path: nextReadPath },
                    });

                    const nextKnownReadItems = result?.ok
                      ? [...knownReadItems, { path: nextReadPath, ok: true }]
                      : knownReadItems;

                    appendMessage(
                      "assistant",
                      result?.ok
                        ? `Read ${nextReadPath}.`
                        : `Could not read ${nextReadPath}: ${String(result?.error || "Unknown error")}`
                    );

                    appendMessage(
                      "assistant",
                      buildControlledReadOnlyProgressMessage(
                        nextKnownReadItems,
                        "This is still a partial inspection",
                      ),
                      {
                        actions:
                          buildControlledReadOnlyInspectionActions(
                            nextKnownReadItems,
                          ),
                      },
                    );
                  },
                });
              }

              actions.push(
                {
                  label: "Back to chat",
                  onClick: () => {
                    appendMessage("user", "Choice: Back to chat");
                    appendMessage("assistant", "No problem — continue in chat when ready.");
                  },
                },
                {
                  label: SUGGESTED_ACTION_LABEL.STOP,
                  onClick: () => {
                    appendMessage("user", "Choice: Stop");
                    appendMessage("assistant", "Okay — stopping here. No files were changed.");
                  },
                },
              );

              return actions;
            };

            appendMessage(
              "assistant",
              buildControlledReadOnlyProgressMessage(successfulReadItems),
              {
                actions:
                  buildControlledReadOnlyInspectionActions(successfulReadItems),
              },
            );
            return;
          }

          const doneMessage = buildToolBatchDoneMessage(executedBatchResults);
          if (doneMessage) {
            appendMessage("assistant", doneMessage);
          }

          const successfulWritePaths = collectSuccessfulToolBatchPaths(
            executedBatchResults,
            "write_file",
          );
          const successfulDirPaths = collectSuccessfulToolBatchPaths(
            executedBatchResults,
            "mkdir",
          );
          const failedWritePaths = collectFailedToolBatchPaths(
            executedBatchResults,
            "write_file",
          );
          const failedDirPaths = collectFailedToolBatchPaths(
            executedBatchResults,
            "mkdir",
          );

          const latestWrittenPath =
            successfulWritePaths.length > 0
              ? successfulWritePaths[successfulWritePaths.length - 1]
              : "";

          const fallbackReadPath = latestWrittenPath || activeTab?.path || "";

          const allWritesFailed =
            (failedWritePaths.length > 0 || failedDirPaths.length > 0) &&
            successfulWritePaths.length === 0 &&
            successfulDirPaths.length === 0;

          if (allWritesFailed) {
            appendMessage(
              "assistant",
              "Those file changes did not complete. Check the tool errors above. If no project folder is open, open one first in Explorer. I did not create any files.",
            );
          } else if (
            isDependencyInstallIntent(latestUserText) &&
            successfulWritePaths.length === 0 &&
            successfulDirPaths.length === 0
          ) {
            appendMessage("assistant", buildInstallHandoffMessage());
          } else if (
            isPreviewIntent(latestUserText) &&
            triggerToolTaskKind !== "project_edit" &&
            triggerToolTaskKind !== "broken_preview_debug" &&
            successfulWritePaths.length === 0 &&
            successfulDirPaths.length === 0
          ) {
            appendMessage("assistant", buildPreviewHandoffMessage());
          } else if (
            isShowChangesIntent(latestUserText) &&
            fallbackReadPath &&
            successfulWritePaths.length > 0
          ) {
            await runTool({
              toolName: "read_file",
              args: { path: fallbackReadPath },
            });
          } else if (
            isFixToolExecution &&
            successfulWritePaths.length === 0 &&
            successfulDirPaths.length === 0
          ) {
            appendMessage(
              "assistant",
              "I inspected the relevant file for the reported preview problem.\n\n" +
                "No files were changed.\n\n" +
                "I do not have concrete Preview logs or a browser console error, so no safe code change is justified yet. Paste the exact Preview logs or browser console error and I will use that evidence before making the smallest safe fix.",
            );
          } else if (successfulWritePaths.length > 0) {
            const completedWorkflowContext =
              createCompletedImplementationWorkflowContext({
                lastEditedPath: latestWrittenPath || "",
                editedPaths: successfulWritePaths,
                preWriteSnapshots: getSnapshotsForPaths(
                  preWriteSnapshotsRef.current,
                  successfulWritePaths,
                ),
                source: "tool_batch",
              });

            if (typeof setWorkflowContext === "function") {
              setWorkflowContext(completedWorkflowContext);
            }

            const fileCountLabel =
              successfulWritePaths.length === 1
                ? "1 file"
                : `${successfulWritePaths.length} files`;
            const writeCompletionMessage =
              `Done — updated ${fileCountLabel}.\n\n` +
              `${buildPostEditChangeSummary(completedWorkflowContext)}\n\n` +
              `${buildPostEditVerificationMessage(completedWorkflowContext)}\n\n` +
              buildPostEditNextStepMessage(completedWorkflowContext);

            appendMessage("assistant", writeCompletionMessage, {
              actions: buildPostEditCompletionActions({
                context: completedWorkflowContext,
                appendMessage,
                sendWithPrompt,
              }),
            });
          } else if (typeof runAi === "function") {
            try {
              const continuationTools = [
                {
                  name: "list_dir",
                  description: "List files and directories for a given path.",
                },
                {
                  name: "read_file",
                  description: "Read the contents of a file.",
                },
                {
                  name: "search_in_file",
                  description: "Search for text inside a file.",
                },
                {
                  name: "write_file",
                  description: "Write or replace a file when an edit is required.",
                },
                {
                  name: "mkdir",
                  description: "Create a directory when a new folder is required.",
                },
              ];

              const agentSuccessfulWritePaths = [];
              const agentSuccessfulDirPaths = [];
              const agentSuccessfulReadPaths = Array.isArray(batchCalls)
                ? batchCalls
                    .filter((call) => call?.toolName === "read_file")
                    .map((call) => String(call?.args?.path || "").trim())
                    .filter(Boolean)
                : [];
              const isPerformanceContinuation =
                isPerformanceProjectRequest(latestUserText);
              const performanceDiagnosticReadKeys = new Set();

              const rememberPerformanceDiagnosticPath = (path) => {
                const key = normalizeDiagnosticPathKey(path);
                if (key) performanceDiagnosticReadKeys.add(key);
              };

              const hasPerformanceDiagnosticPath = (path) => {
                const key = normalizeDiagnosticPathKey(path);
                if (!key) return false;
                return Array.from(performanceDiagnosticReadKeys).some((existing) =>
                  pathKeyMatches(existing, key),
                );
              };

              if (isPerformanceContinuation) {
                for (const call of Array.isArray(batchCalls) ? batchCalls : []) {
                  const toolName = String(call?.toolName || "").trim();
                  if (isDiagnosticReadTool(toolName)) {
                    rememberPerformanceDiagnosticPath(call?.args?.path);
                  }
                }

                for (const item of Array.isArray(executedBatchResults)
                  ? executedBatchResults
                  : []) {
                  for (const path of collectToolResultPathsFromText(item?.result)) {
                    rememberPerformanceDiagnosticPath(path);
                  }
                }
              }

              const agentResult = await runAgent({
                prompt: "",
                messages: [
                  ...(Array.isArray(messages) ? messages : []).map((m) => ({
                    role: String(m?.role || "system"),
                    content: String(m?.content || ""),
                  })),
                  ...executedBatchResults.map((item) => ({
                    role: "system",
                    content: item.cancelled
                      ? `Tool result:\n${item.toolName} was cancelled by the user.`
                      : item.ok
                        ? `Tool result:\n${item.result}`
                        : `Tool result:\n${item.toolName} failed.\n${item.error || "Unknown error"}`,
                  })),
                ],
                tools: continuationTools,
                initialSeenToolCalls: batchCalls.map((call) => ({
                  name: call.toolName,
                  args: call.args,
                })),
                callModel: async ({ messages: workingMessages }) => {
                  const input = buildAgentConversationInput(
                    workingMessages,
                    continuationTools,
                    CHAT_CONTEXT_TURNS,
                  );

                  const r = await runAi({ input });
                  if (!r?.ok) {
                    throw new Error(
                      String(r?.error || "Agent continuation failed"),
                    );
                  }

                  const output = String(r.output || "");
                  const cleaned = stripToolBlocksForChat(output);
                  const toolCall = extractSingleAgentToolCall(
                    output,
                    activeTab?.path,
                  );

                  return {
                    text: cleaned || output,
                    toolCall,
                  };
                },
                executeTool: async (toolCall) => {
                  const toolName = String(toolCall?.name || "").trim();
                  const args = toolCall?.args || {};
                  const requestedPath = String(args?.path || "").trim();

                  if (
                    isPerformanceContinuation &&
                    toolName === "read_file" &&
                    isBinaryAssetPath(requestedPath)
                  ) {
                    return {
                      ok: false,
                      error:
                        "Performance diagnosis blocked a binary asset read. Do not read image/font/media files as text; list the asset directory or inspect text files instead.",
                    };
                  }

                  if (
                    isPerformanceContinuation &&
                    isDiagnosticReadTool(toolName) &&
                    hasPerformanceDiagnosticPath(requestedPath)
                  ) {
                    return {
                      ok: false,
                      error:
                        "Performance diagnosis blocked a repeated diagnostic read for this path. Do not reread the same file or directory; use already inspected evidence, inspect one different text evidence target, request one smallest safe edit, or explain that no safe code edit is justified.",
                    };
                  }

                  const result = await runTool({ toolName, args });

                  if (result?.ok && toolName === "read_file") {
                    const path = String(args?.path || "").trim();
                    if (path) agentSuccessfulReadPaths.push(path);
                  }

                  if (
                    result?.ok &&
                    isPerformanceContinuation &&
                    isDiagnosticReadTool(toolName)
                  ) {
                    rememberPerformanceDiagnosticPath(requestedPath);

                    for (const path of collectToolResultPathsFromText(result?.result)) {
                      rememberPerformanceDiagnosticPath(path);
                    }
                  }

                  if (result?.ok && toolName === "write_file") {
                    const path = String(args?.path || "").trim();
                    if (path) agentSuccessfulWritePaths.push(path);
                  }

                  if (result?.ok && toolName === "mkdir") {
                    const path = String(args?.path || "").trim();
                    if (path) agentSuccessfulDirPaths.push(path);
                  }

                  return result;
                },
                appendTranscript: () => {},
                appendToolResult: () => {},
                maxSteps: 6,
              });

              const latestAgentWrittenPath =
                agentSuccessfulWritePaths.length > 0
                  ? agentSuccessfulWritePaths[agentSuccessfulWritePaths.length - 1]
                  : "";

              const agentMadeProjectChanges =
                agentSuccessfulWritePaths.length > 0;
              const completedWorkflowContext = agentMadeProjectChanges
                ? createCompletedImplementationWorkflowContext({
                    lastEditedPath: latestAgentWrittenPath || "",
                    editedPaths: agentSuccessfulWritePaths,
                    preWriteSnapshots: getSnapshotsForPaths(
                      preWriteSnapshotsRef.current,
                      agentSuccessfulWritePaths,
                    ),
                    source: "agent_continuation",
                  })
                : null;

              if (
                typeof setWorkflowContext === "function" &&
                completedWorkflowContext
              ) {
                setWorkflowContext(completedWorkflowContext);
              }

              const finalText = String(agentResult?.text || "").trim();
              const exactTargetTextNotFound =
                isExactTargetTextNotFoundReport(finalText);
              const inspectedPathForNoChange =
                agentSuccessfulReadPaths.length > 0
                  ? agentSuccessfulReadPaths[agentSuccessfulReadPaths.length - 1]
                  : String(activeTab?.path || "").trim();
              const isPerformanceToolExecution =
                !isFixToolExecution && isPerformanceProjectRequest(latestUserText);
              const isPreviewErrorEvidenceGate =
                isFixToolExecution &&
                triggerToolMessage?.meta?.previewErrorEvidenceGate === true;

              if (finalText && !agentMadeProjectChanges) {
                if (isPreviewErrorEvidenceGate) {
                  appendMessage(
                    "assistant",
                    "Preview-error triage stopped after inspection.\n\n" +
                      "No files were changed.\n\n" +
                      "I do not have concrete Preview logs or a browser console error, so no safe code change is justified yet. Paste the exact Preview logs or browser console error and I will use that evidence before making the smallest safe fix.",
                  );
                } else if (isPerformanceToolExecution) {
                  appendMessage(
                    "assistant",
                    `${finalText}\n\nNo files were changed by this performance diagnosis.`,
                  );
                } else if (isFixToolExecution) {
                  appendMessage(
                    "assistant",
                    "I inspected the relevant file for the reported preview problem.\n\n" +
                      "No files were changed.\n\n" +
                      "I cannot safely confirm the cause from inspection alone. Paste the exact Preview logs or browser console error and I will use that evidence before making the smallest safe fix.",
                  );
                } else if (exactTargetTextNotFound) {
                  const inspectedPathLine = inspectedPathForNoChange
                    ? `\n\nInspected file: ${inspectedPathForNoChange}`
                    : "";

                  appendMessage(
                    "assistant",
                    `${finalText}\n\n` +
                      "No files were changed.\n\n" +
                      "I inspected the file and did not find that exact requested text, so I stopped instead of attempting a broad rewrite." +
                      inspectedPathLine,
                    {
                      actions: [
                        ...(inspectedPathForNoChange
                          ? [
                              {
                                label: "Review inspected file",
                                onClick: () => {
                                  if (typeof sendWithPrompt === "function") {
                                    sendWithPrompt(
                                      "Review the inspected file only.\n\n" +
                                        `Original request: ${latestUserText}\n\n` +
                                        `Read this file and summarize the relevant current content without editing it:\n${inspectedPathForNoChange}\n\n` +
                                        "Request exactly one read_file tool call for that path. Do not write files.",
                                      {
                                        silentUserAppend: true,
                                        forceModelCapabilityTestOverride: true,
                                      },
                                    );
                                  }
                                },
                              },
                              {
                                label: "Search project",
                                onClick: () => {
                                  if (typeof sendWithPrompt === "function") {
                                    sendWithPrompt(
                                      "Search for the exact requested text before editing.\n\n" +
                                        `Original request: ${latestUserText}\n\n` +
                                        `Start with this inspected file:\n${inspectedPathForNoChange}\n\n` +
                                        "Request exactly one search_in_file tool call for that file. If the exact target text is not explicit in the original request, ask the user to paste the exact text and path. Do not write files.",
                                      {
                                        silentUserAppend: true,
                                        forceModelCapabilityTestOverride: true,
                                      },
                                    );
                                  }
                                },
                              },
                            ]
                          : []),
                        {
                          label: "Tell me exact text/path",
                          onClick: () => {
                            appendMessage(
                              "assistant",
                              "Please paste the exact text to find and the file path if you know it. I will inspect/search first and will not edit files unless the target is found.",
                            );
                          },
                        },
                        {
                          label: SUGGESTED_ACTION_LABEL.STOP,
                          onClick: () => {
                            appendMessage(
                              "assistant",
                              "Stopped - no files changed.",
                            );
                          },
                        },
                      ],
                    },
                  );
                } else {
                  appendMessage(
                    "assistant",
                    isFixToolExecution
                      ? "I inspected the relevant files for the fix, but I did not change any files yet."
                      : "I inspected the project, but I did not change any files yet. The requested edit has not been completed yet.",
                    {
                      actions: [
                        {
                          label: isFixToolExecution
                            ? SUGGESTED_ACTION_LABEL.CONTINUE_FIXING
                            : SUGGESTED_ACTION_LABEL.CONTINUE_EDITING,
                          onClick: () => {
                          const originalGoal = String(
                              latestUserText ||
                                (isFixToolExecution
                                  ? "Continue the previous fix/debug task."
                                  : "Continue the previous project edit."),
                            ).trim();

                            appendMessage(
                              "assistant",
                              isFixToolExecution
                                ? "Continuing the fix attempt. I will ask the model to request one concrete fix action next."
                                : "Continuing the edit attempt. I will ask the model to request one concrete file change next.",
                            );

                            if (typeof sendWithPrompt === "function") {
                              sendWithPrompt(
                                (isFixToolExecution
                                  ? "Continue the previous fix/debug task.\n\n"
                                  : "Continue the previous project edit.\n\n") +
                                  `Original request: ${originalGoal}\n\n` +
                                  "The project has already been inspected. Do not repeat broad inspection.\n" +
                                  (isFixToolExecution
                                    ? "Request exactly one tool call next. If the inspected evidence shows a file change is needed, request one write_file tool call for the smallest safe fix. If no code change is needed, explain the inspected evidence clearly and stop."
                                    : "Request exactly one write_file tool call next, or explain briefly why a file edit is impossible."),
                                {
                                  silentUserAppend: true,
                                  skipCompletedWorkflowRoute: true,
                                  skipDirectWorkflowHandoffRoute: true,
                                  forceProjectEdit: true,
                                  forceModelCapabilityTestOverride: true,
                                },
                              );
                            }
                          },
                        },
                      ],
                    },
                  );
                }
              } else if (finalText && agentMadeProjectChanges) {
                const fileCountLabel =
                  agentSuccessfulWritePaths.length === 1
                    ? "1 file"
                    : `${agentSuccessfulWritePaths.length} files`;

                appendMessage(
                  "assistant",
                  `Done — updated ${fileCountLabel}.\n\n${buildPostEditChangeSummary(
                    completedWorkflowContext,
                  )}\n\n${buildPostEditVerificationMessage(
                    completedWorkflowContext,
                  )}\n\n${buildPostEditNextStepMessage(completedWorkflowContext)}`,
                  {
                    actions: buildPostEditCompletionActions({
                      context: completedWorkflowContext,
                      appendMessage,
                      sendWithPrompt,
                    }),
                  },
                );
              } else if (finalText) {
                appendMessage("assistant", finalText);
              } else if (
                agentResult?.stopReason === "max_steps_reached" &&
                agentSuccessfulWritePaths.length > 0
              ) {
                const fileCountLabel =
                  agentSuccessfulWritePaths.length === 1
                    ? "1 file"
                    : `${agentSuccessfulWritePaths.length} files`;
                const agentWriteCompletionMessage =
                  `Done — updated ${fileCountLabel}.\n\n` +
                  `${buildPostEditChangeSummary(
                    completedWorkflowContext,
                  )}\n\n` +
                  `${buildPostEditVerificationMessage(completedWorkflowContext)}\n\n` +
                  buildPostEditNextStepMessage(completedWorkflowContext);

                appendMessage("assistant", agentWriteCompletionMessage, {
                  actions: buildPostEditCompletionActions({
                    context: completedWorkflowContext,
                    appendMessage,
                  }),
                });
              } else if (agentResult?.stopReason === "max_steps_reached") {
                const originalGoal = String(
                  latestUserText ||
                    (isPerformanceToolExecution
                      ? "Continue the previous performance diagnosis."
                      : isFixToolExecution
                        ? "Continue the previous fix/debug task."
                        : "Continue the previous implementation."),
                ).trim();
                const partialSummary =
                  "The agent reached the safe tool-step limit before changing files.";
                const assistantResult = buildPartialAssistantResultForContinuation({
                  isPerformanceToolExecution,
                  isFixToolExecution,
                  summary: partialSummary,
                  source: "agent_max_steps_reached",
                });

                if (
                  !isPerformanceToolExecution &&
                  !isFixToolExecution &&
                  typeof setWorkflowContext === "function"
                ) {
                  setWorkflowContext(
                    createPartialImplementationWorkflowContext({
                      lastUserGoal: originalGoal,
                      partialSummary,
                      assistantResult,
                      source: "agent_max_steps_reached",
                    }),
                  );
                }

                const continueActionLabel =
                  assistantResult.suggestedActions[0] ||
                  (isPerformanceToolExecution
                    ? SUGGESTED_ACTION_LABEL.CONTINUE_DIAGNOSING
                    : isFixToolExecution
                      ? SUGGESTED_ACTION_LABEL.CONTINUE_FIXING
                      : SUGGESTED_ACTION_LABEL.CONTINUE_IMPLEMENTATION);
                const stopActionLabel =
                  assistantResult.suggestedActions.find(
                    (item) => item === SUGGESTED_ACTION_LABEL.STOP,
                  ) || SUGGESTED_ACTION_LABEL.STOP;

                appendMessage(
                  "assistant",
                  isPerformanceToolExecution
                    ? "Performance diagnosis reached the safe tool-step limit before changing files.\n\nNo files were changed. KForge stopped here to avoid a runaway inspection loop.\n\nYou can continue with one more focused diagnostic step, or stop here."
                    : "The agent reached the safe tool-step limit before changing files.\n\nNo files were changed. KForge stopped here to avoid a runaway tool loop.\n\nYou can continue with one more focused step, or stop here.",
                  {
                    actions: [
                      {
                        label: continueActionLabel,
                        onClick: () => {
                          appendMessage(
                            "assistant",
                            isPerformanceToolExecution
                              ? "Continuing with one focused performance diagnostic step."
                              : "Continuing with one focused implementation step.",
                          );

                          if (typeof sendWithPrompt === "function") {
                            sendWithPrompt(
                              (isPerformanceToolExecution
                                ? "Continue the previous performance diagnosis.\n\n"
                                : isFixToolExecution
                                  ? "Continue the previous fix/debug task.\n\n"
                                  : "Continue the previous implementation.\n\n") +
                                `Original request: ${originalGoal}\n\n` +
                                (isPerformanceToolExecution
                                  ? "The previous run reached the safe tool-step limit without changing files. Do not reread the same files. Do not read binary assets as text. Request exactly one focused next step: one missing text evidence file, one smallest safe write_file change if evidence is enough, or a clear explanation that no safe code edit is justified. Do not blindly add React.memo, useMemo, or useCallback."
                                  : "The previous run reached the safe tool-step limit without changing files. Do not repeat broad inspection. Request exactly one focused implementation tool call next. If editing is possible, request one smallest safe write_file change. If more inspection is genuinely needed, request one read_file or list_dir call."),
                              {
                                silentUserAppend: true,
                                forceModelCapabilityTestOverride: true,
                              },
                            );
                          }
                        },
                      },
                      {
                        label: stopActionLabel,
                        onClick: () => {
                          appendMessage(
                            "assistant",
                            "Stopped. No files were changed by that run.",
                          );
                        },
                      },
                    ],
                  },
                );
              } else if (agentResult?.stopReason === "tool_cancelled") {
                const cancelledToolName = String(
                  agentResult?.cancelledToolName || "tool",
                ).trim();

                appendMessage(
                  "assistant",
                  `Cancelled — stopped ${cancelledToolName}. I did not continue after the denied tool request.`,
                );
              } else if (agentResult?.stopReason === "empty_response") {
                const originalGoal = String(
                  latestUserText ||
                    (isFixToolExecution
                      ? "Continue the previous fix/debug task."
                      : isPerformanceToolExecution
                        ? "Continue the previous performance diagnosis."
                        : "Continue the previous implementation."),
                ).trim();
                const partialSummary =
                  "The model stopped after inspection without requesting the next action.";
                const assistantResult = buildPartialAssistantResultForContinuation({
                  isPerformanceToolExecution,
                  isFixToolExecution,
                  summary: partialSummary,
                  source: "agent_empty_response",
                });

                if (
                  !isPerformanceToolExecution &&
                  !isFixToolExecution &&
                  typeof setWorkflowContext === "function"
                ) {
                  setWorkflowContext(
                    createPartialImplementationWorkflowContext({
                      lastUserGoal: originalGoal,
                      partialSummary,
                      assistantResult,
                      source: "agent_empty_response",
                    }),
                  );
                }

                const continueActionLabel =
                  assistantResult.suggestedActions[0] ||
                  (isFixToolExecution
                    ? SUGGESTED_ACTION_LABEL.CONTINUE_FIXING
                    : isPerformanceToolExecution
                      ? SUGGESTED_ACTION_LABEL.CONTINUE_DIAGNOSING
                      : SUGGESTED_ACTION_LABEL.CONTINUE_IMPLEMENTATION);

                appendMessage(
                  "assistant",
                  isFixToolExecution
                    ? "The model stopped after fix inspection and did not request the next action. No further files were changed."
                    : isPerformanceToolExecution
                      ? "The model stopped after partial performance inspection and did not request the next diagnostic step. No files were changed."
                      : "The model stopped after inspection and did not request the next implementation step. No further files were changed.",
                  {
                    actions: [
                      {
                        label: continueActionLabel,
                        onClick: () => {
                          appendMessage(
                            "assistant",
                            isFixToolExecution
                              ? "Continuing the fix attempt. I will ask the model to request one concrete tool call next."
                              : isPerformanceToolExecution
                                ? "Continuing the performance diagnosis. I will ask the model to request one concrete diagnostic step next."
                                : "Continuing the implementation. I will ask the model to request one concrete implementation step next.",
                          );

                          if (typeof sendWithPrompt === "function") {
                            sendWithPrompt(
                              (isFixToolExecution
                                ? "Continue the previous fix/debug task.\n\n"
                                : isPerformanceToolExecution
                                  ? "Continue the previous performance diagnosis.\n\n"
                                  : "Continue the previous implementation.\n\n") +
                                `Original request: ${originalGoal}\n\n` +
                                (isPerformanceToolExecution
                                  ? "The project has only been partially inspected. Do not reread the same file. Do not read binary assets as text. Request exactly one next diagnostic step: inspect one different missing text evidence target such as CSS, package.json, main entry, or a relevant component; request one smallest safe write_file change if evidence is enough; or explain that no safe code edit is justified. Do not blindly add React.memo, useMemo, or useCallback; use them only when inspected code shows a specific need."
                                  : "The project has already been inspected. Do not repeat broad inspection.\n" +
                                    (isFixToolExecution
                                      ? "Request exactly one concrete tool call next. If a file edit is needed, request write_file for the smallest safe fix. If more inspection is genuinely needed, request one read_file only. If no code change is needed, explain the inspected evidence clearly and stop."
                                      : "Request exactly one concrete implementation tool call next. If a file edit is needed, request write_file for the smallest safe continuation. If more inspection is genuinely needed, request one read_file only.")),
                              {
                                silentUserAppend: true,
                                forceModelCapabilityTestOverride: true,
                              },
                            );
                          }
                        },
                      },
                    ],
                  },
                );
              } else if (
                agentResult?.stopReason &&
                agentResult.stopReason !== "final_text" &&
                agentResult.stopReason !== "duplicate_tool_call"
              ) {
                appendMessage(
                  "system",
                  `Agent loop stopped: ${agentResult.stopReason}`,
                );
              }
            } catch (err) {
              appendMessage(
                "system",
                `[agent] Continuation failed: ${String(
                  err?.message || err || "Unknown error",
                )}`,
              );
            }
          }
        }
      } finally {
        toolBatchRunningRef.current = false;

        if (toolBatchRescanNeededRef.current) {
          toolBatchRescanNeededRef.current = false;
          setToolScanTick((tick) => tick + 1);
        }
      }
    };

    processAssistantToolCalls();
  }, [
    messages,
    toolScanTick,
    activeTab,
    appendMessage,
    runTool,
    runAi,
    sendWithPrompt,
    CHAT_CONTEXT_TURNS,
    setWorkflowContext,
  ]);

  const handleRequestToolOk = useCallback(() => {
    if (!activeTab?.path) {
      appendMessage(
        "system",
        "[tool] 🛡 Tool request blocked — open a file first, then click Tool: OK.",
      );
      return;
    }
    runTool({ toolName: "read_file", args: { path: activeTab.path } });
  }, [activeTab, appendMessage, runTool]);

  const handleRequestToolErr = useCallback(() => {
    if (!activeTab?.path) {
      appendMessage(
        "system",
        "[tool] 🛡 Tool request blocked — open a file first, then click Tool: Err.",
      );
      return;
    }
    const dir = dirnameOfPath(activeTab.path);
    runTool({ toolName: "list_dir", args: { path: dir } });
  }, [activeTab, appendMessage, runTool]);

  // Collapsed rail
  if (!aiPanelOpen) {
    return (
      <div className="w-10 border-l border-zinc-800 min-h-0 flex flex-col items-center justify-start py-2">
        <button
          className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs"
          onClick={() => setAiPanelOpen(true)}
          title="Show AI panel (Ctrl/Cmd+J)"
          type="button"
        >
          AI
        </button>

        <button
          className="mt-2 w-8 h-8 rounded bg-transparent border border-zinc-800 hover:bg-zinc-900 flex items-center justify-center"
          onClick={() => openSettings(null, "Opened from collapsed rail")}
          title="Settings"
          type="button"
        >
          <GearIcon className="w-4 h-4 text-zinc-200" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${aiPanelWidthClass} border-l border-zinc-800 min-h-0 h-full flex flex-col`}
    >
      {/* AI header: GPT-clean control */}
      <div className="p-2 border-b border-zinc-800 sticky top-0 z-30 bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <ProviderMenuButton
              provider={aiProvider}
              model={aiModelStr || "(none)"}
              configured={providerReady}
              advancedOpen={advancedOpen}
              onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
              onChangeProviderModel={() => setModelPickerOpen(true)}
              onConfigure={() =>
                openSettings(aiProvider, "Configure in Settings")
              }
            />

            <HelpMenuPlaceholder invoke={invoke} />

            {isDevBuild ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof setFocusMode === "function") {
                      setFocusMode(true);
                    }
                    setPreviewOpen((open) => !open);
                    setTerminalOpen(false);
                    setServicesOpen(false);
                  }}
                  title={previewOpen ? "Hide preview" : "Show preview"}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition ${
                    previewOpen
                      ? "border-zinc-700 bg-zinc-900 text-zinc-100"
                      : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/50 hover:text-zinc-100"
                  }`}
                >
                  <span>{previewOpen ? "▼" : "▶"}</span>
                  <span className="font-medium">Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof setFocusMode === "function") {
                      setFocusMode(true);
                    }
                    setTerminalOpen((open) => !open);
                    setPreviewOpen(false);
                    setServicesOpen(false);
                  }}
                  title={terminalOpen ? "Hide terminal" : "Show terminal"}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition ${
                    terminalOpen
                      ? "border-zinc-700 bg-zinc-900 text-zinc-100"
                      : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/50 hover:text-zinc-100"
                  }`}
                >
                  <span>{terminalOpen ? "▼" : "▶"}</span>
                  <span className="font-medium">Terminal</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof setFocusMode === "function") {
                      setFocusMode(true);
                    }
                    const nextServicesOpen = !servicesOpen;
                    setServicesOpen(nextServicesOpen);
                    setPreviewOpen(false);
                    setTerminalOpen(false);
                    if (nextServicesOpen) {
                      requestAnimationFrame(() => {
                        servicesSectionRef.current?.scrollIntoView({
                          block: "start",
                          behavior: "auto",
                        });
                      });
                    }
                  }}
                  title={servicesOpen ? "Hide services" : "Show services"}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition ${
                    servicesOpen
                      ? "border-zinc-700 bg-zinc-900 text-zinc-100"
                      : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/50 hover:text-zinc-100"
                  }`}
                >
                  <span>{servicesOpen ? "▼" : "▶"}</span>
                  <span className="font-medium">Services</span>
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs text-zinc-400 hover:text-zinc-200"
              onClick={() => setShowTranscript((v) => !v)}
              title={
                showTranscript ? "Return to chat view" : "Open full transcript"
              }
            >
              {showTranscript ? "Back to Chat" : "View Transcript"}
            </button>
          </div>
        </div>

        {isDevBuild ? (
          <>
            {previewOpen ? (
              <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                <PreviewPanel projectPath={projectPath} />
              </div>
            ) : null}

            {terminalOpen ? (
              <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                <CommandRunnerPanel projectPath={projectPath} />
              </div>
            ) : null}

            {servicesOpen ? (
              <div
                ref={servicesSectionRef}
                className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/30"
              >
                <div
                  ref={servicesPanelScrollRef}
                  className="max-h-[70vh] overflow-auto"
                >
                  <ServicePanel projectPath={projectPath} />
                </div>
              </div>
            ) : null}
          </>
        ) : null}
        {providerSwitchNote ? (
          <div className="mt-2 text-xs border border-zinc-800 rounded p-2 bg-zinc-900/20 flex items-start justify-between gap-2">
            <div className="opacity-80 leading-snug">{providerSwitchNote}</div>
            <button
              className={buttonClass("ghost")}
              onClick={handleDismissSwitchNote}
              type="button"
              title="Dismiss"
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </div>

      {/* MAIN AREA */}
      {isFocusLayout ? (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Top content area (no page scrolling) */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {/* Patch preview stays above chat when present */}
            {patchPreviewVisible || patchPreview ? (
              <div className="shrink-0 px-3 pt-3 pb-2">
                <PatchPreviewPanel
                  patchPreview={patchPreview}
                  patchPreviewVisible={patchPreviewVisible}
                  setPatchPreviewVisible={setPatchPreviewVisible}
                  copyPatchToClipboard={copyPatchToClipboard}
                  discardPatchPreview={discardPatchPreview}
                  buttonClass={buttonClass}
                />
              </div>
            ) : null}

            {/* Advanced panels only when toggled */}
            {advancedOpen ? (
              <div className="shrink-0 space-y-4">
                <SystemPanel
                  aiSystem={aiSystem}
                  setAiSystem={setAiSystem}
                  providerReady={providerReady}
                  invoke={invoke}
                />

                <ParametersPanel
                  aiTemperature={aiTemperature}
                  setAiTemperature={setAiTemperature}
                  aiMaxTokens={aiMaxTokens}
                  setAiMaxTokens={setAiMaxTokens}
                  providerReady={providerReady}
                />

                <OutputPanel aiOutput={aiOutput} />

                {aiProvider === "ollama" && (
                  <OllamaHelperPanel
                    aiRunning={aiRunning}
                    endpoints={endpoints}
                    invoke={invoke}
                    setAiTestOutput={setAiTestOutput}
                    setRuntimeReachable={setRuntimeReachable}
                    formatTauriError={formatTauriError}
                    buttonClass={buttonClass}
                  />
                )}
              </div>
            ) : null}

            {/* CHAT / TRANSCRIPT AREA */}
            <div className="flex-1 min-h-0 overflow-hidden rounded border border-zinc-800/60 bg-zinc-950/30 m-3">
              <div
                className={[
                  "h-full min-h-0 p-3",
                  showTranscript
                    ? "flex flex-col overflow-hidden"
                    : "overflow-y-auto",
                ].join(" ")}
              >
                {showTranscript ? (
                  <TranscriptPanel
                    messages={messages}
                    TranscriptBubble={TranscriptBubble}
                    transcriptBottomRef={transcriptBottomRef}
                    CHAT_CONTEXT_TURNS={CHAT_CONTEXT_TURNS}
                    lastSend={lastSend}
                    aiRunning={aiRunning}
                    pendingLabel={pendingAssistantText}
                    handleRetryLast={handleRetryLast}
                    clearConversation={clearConversation}
                    onRequestToolOk={handleRequestToolOk}
                    onRequestToolErr={handleRequestToolErr}
                    showDevTools={isDevBuild && devToolsEnabled && advancedOpen}
                    hideChrome={false}
                  />
                ) : (
                  <>
                    {/* GPT-clean chat view: user anchors, assistant replies, and relevant action system messages */}
                    {messages
                      .filter((m) => {
                        const r = String(m?.role || "").toLowerCase();
                        const content = String(m?.content || "");
                        const actionLabels = Array.isArray(m?.actions)
                          ? m.actions.map((a) => String(a?.label || ""))
                          : [];

                        if (r === "assistant" || r === "ai") return true;

                        if (r === "user" && content.trim()) {
                          return true;
                        }

                        // Hide resolved consent request rows from normal chat,
                        // but keep them in Transcript for history.
                        const isResolvedConsentRequest =
                          r === "system" &&
                          content.includes("🛡 Tool request:") &&
                          (actionLabels.includes("Approved") ||
                            actionLabels.includes("Cancelled"));

                        if (isResolvedConsentRequest) return false;

                        if (
                          r === "system" &&
                          Array.isArray(m?.actions) &&
                          m.actions.length > 0
                        ) {
                          return true;
                        }

                        return false;
                      })
                      .map((m, i) => {
                        const role = String(m?.role || "").toLowerCase();

                        const content =
                          role === "assistant" || role === "ai"
                            ? stripToolBlocksForChat(m.content)
                            : m.content;

                        if (
                          (role === "assistant" || role === "ai") &&
                          !String(content || "").trim()
                        ) {
                          return null;
                        }

                        return (
                          <TranscriptBubble
                            key={m.id || i}
                            role={m.role}
                            content={content}
                            ts={m.ts}
                            actionLabel={m.actionLabel}
                            onAction={m.action}
                            actions={m.actions}
                          />
                        );
                      })}

                    {aiRunning ? (
                      <TranscriptBubble
                        role="assistant"
                        content={pendingAssistantText}
                        ts={Date.now()}
                      />
                    ) : null}

                    <div ref={transcriptBottomRef} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Prompt pinned (BIG GUNS): sticky bottom to survive parent scroll/overflow quirks */}
          <div className="sticky bottom-0 z-20 shrink-0 border-t border-zinc-800 p-3 space-y-3 bg-zinc-950">
            <PromptPanel
              activeTab={activeTab}
              handleUseActiveFileAsPrompt={handleUseActiveFileAsPrompt}
              includeActiveFile={includeActiveFile}
              setIncludeActiveFile={setIncludeActiveFile}
              activeFileChip={activeFileChip}
              askForPatch={askForPatch}
              setAskForPatch={setAskForPatch}
              patchPreview={patchPreview}
              patchPreviewVisible={patchPreviewVisible}
              copyPatchToClipboard={copyPatchToClipboard}
              setPatchPreviewVisible={setPatchPreviewVisible}
              discardPatchPreview={discardPatchPreview}
              aiPrompt={aiPrompt}
              setAiPrompt={setAiPrompt}
              handlePromptKeyDown={handlePromptKeyDownFromPrompt}
              providerReady={providerReady}
              appendMessage={appendMessage}
              buttonClass={buttonClass}
              advancedOpen={advancedOpen}
            />

            <ActionsPanel
              providerReady={providerReady}
              aiRunning={aiRunning}
              handleSendChat={handleSendChatFromPrompt}
              handleAiTest={handleAiTest}
              aiTestStatus={aiTestStatus}
              guardrailText={guardrailText}
              openSettings={openSettings}
              aiProvider={aiProvider}
              buttonClass={buttonClass}
              showTest={true}
              showGuardrail={advancedOpen}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-3 space-y-4">
          {/* Classic / non-focus layout keeps provider controls inline */}
          <ProviderControlsPanel
            providerOptions={providerOptions}
            handleProviderChange={handleProviderChange}
            providerStatus={providerStatus}
            disabledProviderMessage={disabledProviderMessage}
            aiProvider={aiProvider}
            providerReady={providerReady}
            modelWorkflowPolicy={modelWorkflowPolicy}
            openSettings={openSettings}
            aiModel={aiModel}
            setAiModel={setAiModel}
            modelPlaceholder={modelPlaceholder}
            modelSuggestions={modelSuggestions}
            showModelHelper={showModelHelper}
            modelHelperText={modelHelperText}
            aiEndpoint={aiEndpoint}
            buttonClass={buttonClass}
          />

          <PatchPreviewPanel
            patchPreview={patchPreview}
            patchPreviewVisible={patchPreviewVisible}
            setPatchPreviewVisible={setPatchPreviewVisible}
            copyPatchToClipboard={copyPatchToClipboard}
            discardPatchPreview={discardPatchPreview}
            buttonClass={buttonClass}
          />

          <TranscriptPanel
            messages={messages}
            TranscriptBubble={TranscriptBubble}
            transcriptBottomRef={transcriptBottomRef}
            CHAT_CONTEXT_TURNS={CHAT_CONTEXT_TURNS}
            lastSend={lastSend}
            aiRunning={aiRunning}
            pendingLabel={pendingAssistantText}
            handleRetryLast={handleRetryLast}
          />

          <PromptPanel
            activeTab={activeTab}
            handleUseActiveFileAsPrompt={handleUseActiveFileAsPrompt}
            includeActiveFile={includeActiveFile}
            setIncludeActiveFile={setIncludeActiveFile}
            activeFileChip={activeFileChip}
            askForPatch={askForPatch}
            setAskForPatch={setAskForPatch}
            patchPreview={patchPreview}
            patchPreviewVisible={patchPreviewVisible}
            copyPatchToClipboard={copyPatchToClipboard}
            setPatchPreviewVisible={setPatchPreviewVisible}
            discardPatchPreview={discardPatchPreview}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            handlePromptKeyDown={handlePromptKeyDownFromPrompt}
            providerReady={providerReady}
            appendMessage={appendMessage}
            buttonClass={buttonClass}
            advancedOpen={advancedOpen}
          />

          <ActionsPanel
            providerReady={providerReady}
            aiRunning={aiRunning}
            handleSendChat={handleSendChatFromPrompt}
            handleAiTest={handleAiTest}
            aiTestStatus={aiTestStatus}
            guardrailText={guardrailText}
            openSettings={openSettings}
            aiProvider={aiProvider}
            buttonClass={buttonClass}
            showTest={true}
            showGuardrail={advancedOpen}
          />

          {advancedOpen ? (
            <div className="space-y-4">
              <SystemPanel
                aiSystem={aiSystem}
                setAiSystem={setAiSystem}
                providerReady={providerReady}
                invoke={invoke}
              />

              <ParametersPanel
                aiTemperature={aiTemperature}
                setAiTemperature={setAiTemperature}
                aiMaxTokens={aiMaxTokens}
                setAiMaxTokens={setAiMaxTokens}
                providerReady={providerReady}
              />

              <OutputPanel aiOutput={aiOutput} />

              {aiProvider === "ollama" && (
                <OllamaHelperPanel
                  aiRunning={aiRunning}
                  endpoints={endpoints}
                  invoke={invoke}
                  setAiTestOutput={setAiTestOutput}
                  setRuntimeReachable={setRuntimeReachable}
                  formatTauriError={formatTauriError}
                  buttonClass={buttonClass}
                />
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Change Provider/Model modal */}
      {modelPickerOpen ? (
        <div className="fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setModelPickerOpen(false)}
          />
          <div
            className="absolute left-1/2 top-1/2 w-[min(820px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div className="text-sm font-semibold text-zinc-100">
                Change Provider/Model
              </div>
              <button
                type="button"
                onClick={() => setModelPickerOpen(false)}
                className="text-[11px] px-2 py-0.5 rounded border border-zinc-800 hover:bg-zinc-900"
                title="Close"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <ProviderControlsPanel
                providerOptions={providerOptions}
                handleProviderChange={handleProviderChange}
                providerStatus={providerStatus}
                disabledProviderMessage={disabledProviderMessage}
                aiProvider={aiProvider}
                providerReady={providerReady}
                modelWorkflowPolicy={modelWorkflowPolicy}
                openSettings={openSettings}
                aiModel={aiModel}
                setAiModel={setAiModel}
                modelPlaceholder={modelPlaceholder}
                modelSuggestions={modelSuggestions}
                showModelHelper={showModelHelper}
                modelHelperText={modelHelperText}
                aiEndpoint={aiEndpoint}
                buttonClass={buttonClass}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
