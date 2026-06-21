export const ITERATION_CONTROLLER_DECISION = Object.freeze({
  ALLOW: "allow",
  BLOCK_REPEATED_READ: "block_repeated_read",
});

export const ITERATION_ALLOWED_NEXT_ACTION = Object.freeze({
  WRITE_SMALLEST_SAFE_CHANGE: "write_smallest_safe_change",
  READ_DIFFERENT_RELEVANT_FILE: "read_different_relevant_file",
  STOP_WITH_REASON: "stop_with_reason",
  SWITCH_MODEL: "switch_model",
});

export function normalizeIterationPath(path = "") {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

export function normalizeIterationPathKey(path = "") {
  return normalizeIterationPath(path).toLowerCase();
}

export function createIterationControllerState(seed = {}) {
  return {
    originalGoal: String(seed.originalGoal || "").trim(),
    taskKind: String(seed.taskKind || "").trim(),
    modelPolicyKind: String(seed.modelPolicyKind || "").trim(),
    inspectedPaths: Array.isArray(seed.inspectedPaths)
      ? seed.inspectedPaths.map(normalizeIterationPath).filter(Boolean)
      : [],
    writtenPaths: Array.isArray(seed.writtenPaths)
      ? seed.writtenPaths.map(normalizeIterationPath).filter(Boolean)
      : [],
    failedToolCount: Number.isFinite(seed.failedToolCount)
      ? seed.failedToolCount
      : 0,
    blockedRepeatedReadCount: Number.isFinite(seed.blockedRepeatedReadCount)
      ? seed.blockedRepeatedReadCount
      : 0,
    lastToolName: String(seed.lastToolName || "").trim(),
    lastToolPath: normalizeIterationPath(seed.lastToolPath || ""),
    lastToolOk:
      typeof seed.lastToolOk === "boolean" ? seed.lastToolOk : null,
  };
}

export function isIterationReadTool(toolName = "") {
  return ["read_file", "list_dir", "search_in_file"].includes(
    String(toolName || "").trim(),
  );
}

export function isIterationWriteTool(toolName = "") {
  return ["write_file", "mkdir"].includes(String(toolName || "").trim());
}

export function isVisualCssIterationGoal(text = "") {
  const s = String(text || "").toLowerCase();
  return /\b(ui|ux|visual|style|styling|css|layout|readability|readable|theme|palette|colour|color|heading|title|button|card|background|contrast|polished|modern)\b/.test(
    s,
  );
}

export function hasIterationPath(paths = [], path = "") {
  const targetKey = normalizeIterationPathKey(path);
  if (!targetKey) return false;

  return (Array.isArray(paths) ? paths : []).some(
    (candidate) => normalizeIterationPathKey(candidate) === targetKey,
  );
}

export function rememberIterationToolResult(state, toolCall, result) {
  const current = createIterationControllerState(state);
  const toolName = String(toolCall?.name || toolCall?.toolName || "").trim();
  const path = normalizeIterationPath(toolCall?.args?.path || "");
  const ok = Boolean(result?.ok);

  const next = {
    ...current,
    lastToolName: toolName,
    lastToolPath: path,
    lastToolOk: ok,
  };

  if (!ok) {
    next.failedToolCount += 1;
    return next;
  }

  if (path && isIterationReadTool(toolName)) {
    if (!hasIterationPath(next.inspectedPaths, path)) {
      next.inspectedPaths = [...next.inspectedPaths, path];
    }
  }

  if (path && isIterationWriteTool(toolName)) {
    if (!hasIterationPath(next.writtenPaths, path)) {
      next.writtenPaths = [...next.writtenPaths, path];
    }
  }

  return next;
}

export function evaluateIterationToolRequest(state, toolCall, options = {}) {
  const current = createIterationControllerState(state);
  const toolName = String(toolCall?.name || toolCall?.toolName || "").trim();
  const path = normalizeIterationPath(toolCall?.args?.path || "");
  const originalGoal =
    String(options.originalGoal || current.originalGoal || "").trim();

  const blockRepeatedReads = Boolean(options.blockRepeatedReads);
  const visualCssGoal = isVisualCssIterationGoal(originalGoal);

  if (
    blockRepeatedReads &&
    visualCssGoal &&
    isIterationReadTool(toolName) &&
    path &&
    hasIterationPath(current.inspectedPaths, path) &&
    !hasIterationPath(current.writtenPaths, path)
  ) {
    return {
      decision: ITERATION_CONTROLLER_DECISION.BLOCK_REPEATED_READ,
      ok: false,
      allowedNextActions: [
        ITERATION_ALLOWED_NEXT_ACTION.WRITE_SMALLEST_SAFE_CHANGE,
        ITERATION_ALLOWED_NEXT_ACTION.READ_DIFFERENT_RELEVANT_FILE,
        ITERATION_ALLOWED_NEXT_ACTION.STOP_WITH_REASON,
      ],
      error:
        "KForge blocked a repeated read of an already inspected file for this visual/UI/CSS iteration. Use the inspected evidence, request one smallest safe write_file change, inspect one different clearly relevant text file, or explain that no safe code edit is justified.",
      path,
      toolName,
    };
  }

  return {
    decision: ITERATION_CONTROLLER_DECISION.ALLOW,
    ok: true,
    allowedNextActions: [],
    error: "",
    path,
    toolName,
  };
}
