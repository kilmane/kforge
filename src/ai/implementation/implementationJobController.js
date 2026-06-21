export const IMPLEMENTATION_JOB_STATUS = Object.freeze({
  CREATED: "created",
  NEEDS_INSPECTION: "needs_inspection",
  INSPECTION_IN_PROGRESS: "inspection_in_progress",
  INSPECTION_COMPLETE: "inspection_complete",
  NEEDS_WRITE_PROPOSAL: "needs_write_proposal",
  WRITE_APPROVAL_PENDING: "write_approval_pending",
  WRITE_SUCCEEDED: "write_succeeded",
  WRITE_BLOCKED: "write_blocked",
  NEEDS_RECOVERY: "needs_recovery",
  RESTORE_AVAILABLE: "restore_available",
  RESTORED: "restored",
  STOPPED: "stopped",
  FAILED: "failed",
});

export const IMPLEMENTATION_JOB_ACTION = Object.freeze({
  INSPECT_LIKELY_FILE: "inspect_likely_file",
  INSPECT_SPECIFIC_FILE: "inspect_specific_file",
  REQUEST_WRITE_PROPOSAL: "request_write_proposal",
  APPROVE_WRITE: "approve_write",
  RETRY_WITH_EVIDENCE: "retry_with_evidence",
  SWITCH_MODEL: "switch_model",
  RESTORE_LAST_SNAPSHOT: "restore_last_snapshot",
  SHOW_BLOCKED_REASON: "show_blocked_reason",
  SHOW_MANUAL_STEPS: "show_manual_steps",
  STOP: "stop",
});

export const IMPLEMENTATION_JOB_TOOL_DECISION = Object.freeze({
  ALLOW: "allow",
  BLOCK_REPEATED_READ: "block_repeated_read",
  BLOCK_UNSAFE_WRITE_WITHOUT_INSPECTION: "block_unsafe_write_without_inspection",
});

export function normalizeImplementationPath(path = "") {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

export function normalizeImplementationPathKey(path = "") {
  return normalizeImplementationPath(path).toLowerCase();
}

export function isImplementationReadTool(toolName = "") {
  return ["read_file", "list_dir", "search_in_file"].includes(
    String(toolName || "").trim(),
  );
}

export function isImplementationWriteTool(toolName = "") {
  return ["write_file", "mkdir"].includes(String(toolName || "").trim());
}

export function normalizeImplementationPathList(paths = []) {
  const seen = new Set();
  const normalized = [];

  for (const path of Array.isArray(paths) ? paths : []) {
    const cleanPath = normalizeImplementationPath(path);
    const key = normalizeImplementationPathKey(cleanPath);

    if (!cleanPath || seen.has(key)) continue;

    seen.add(key);
    normalized.push(cleanPath);
  }

  return normalized;
}

export function hasImplementationPath(paths = [], path = "") {
  const targetKey = normalizeImplementationPathKey(path);
  if (!targetKey) return false;

  return (Array.isArray(paths) ? paths : []).some(
    (candidate) => normalizeImplementationPathKey(candidate) === targetKey,
  );
}

function createImplementationJobId() {
  return `implementation-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeToolRecord(record = {}) {
  const toolName = String(record?.toolName || record?.name || "").trim();
  const path = normalizeImplementationPath(record?.path || record?.args?.path || "");

  return {
    toolName,
    path,
    ok: typeof record?.ok === "boolean" ? record.ok : null,
    error: String(record?.error || "").trim(),
    at: Number.isFinite(record?.at) ? record.at : Date.now(),
  };
}

export function createImplementationJob(seed = {}) {
  const now = Date.now();
  const createdAt = Number.isFinite(seed.createdAt) ? seed.createdAt : now;

  return {
    jobId: String(seed.jobId || "").trim() || createImplementationJobId(),
    status:
      String(seed.status || "").trim() ||
      IMPLEMENTATION_JOB_STATUS.NEEDS_INSPECTION,
    originalGoal: String(seed.originalGoal || "").trim(),
    taskKind: String(seed.taskKind || "implementation").trim(),
    modelPolicyKind: String(seed.modelPolicyKind || "").trim(),
    createdAt,
    updatedAt: Number.isFinite(seed.updatedAt) ? seed.updatedAt : now,
    inspectedPaths: normalizeImplementationPathList(seed.inspectedPaths),
    attemptedWrites: normalizeImplementationPathList(seed.attemptedWrites),
    successfulWrites: normalizeImplementationPathList(seed.successfulWrites),
    blockedWrites: normalizeImplementationPathList(seed.blockedWrites),
    failedTools: Array.isArray(seed.failedTools)
      ? seed.failedTools.map(normalizeToolRecord)
      : [],
    preWriteSnapshots: Array.isArray(seed.preWriteSnapshots)
      ? seed.preWriteSnapshots
      : [],
    allowedNextActions: Array.isArray(seed.allowedNextActions)
      ? seed.allowedNextActions.map((item) => String(item || "").trim()).filter(Boolean)
      : [IMPLEMENTATION_JOB_ACTION.INSPECT_LIKELY_FILE],
    lastAssistantResult: seed.lastAssistantResult || null,
    lastSafeStopReason: String(seed.lastSafeStopReason || "").trim(),
  };
}

export function rememberImplementationInspection(job, path = "") {
  const current = createImplementationJob(job);
  const cleanPath = normalizeImplementationPath(path);

  if (!cleanPath || hasImplementationPath(current.inspectedPaths, cleanPath)) {
    return {
      ...current,
      updatedAt: Date.now(),
    };
  }

  return {
    ...current,
    status: IMPLEMENTATION_JOB_STATUS.INSPECTION_COMPLETE,
    inspectedPaths: [...current.inspectedPaths, cleanPath],
    allowedNextActions: [
      IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
      IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
      IMPLEMENTATION_JOB_ACTION.STOP,
    ],
    updatedAt: Date.now(),
  };
}

export function rememberImplementationWriteAttempt(job, toolCall = {}, result = {}) {
  const current = createImplementationJob(job);
  const toolName = String(toolCall?.name || toolCall?.toolName || "").trim();
  const path = normalizeImplementationPath(toolCall?.args?.path || "");
  const ok = Boolean(result?.ok);

  if (!path || !isImplementationWriteTool(toolName)) {
    return current;
  }

  const attemptedWrites = hasImplementationPath(current.attemptedWrites, path)
    ? current.attemptedWrites
    : [...current.attemptedWrites, path];

  if (ok) {
    return {
      ...current,
      status: IMPLEMENTATION_JOB_STATUS.WRITE_SUCCEEDED,
      attemptedWrites,
      successfulWrites: hasImplementationPath(current.successfulWrites, path)
        ? current.successfulWrites
        : [...current.successfulWrites, path],
      allowedNextActions: [
        IMPLEMENTATION_JOB_ACTION.RESTORE_LAST_SNAPSHOT,
        IMPLEMENTATION_JOB_ACTION.STOP,
      ],
      updatedAt: Date.now(),
    };
  }

  return {
    ...current,
    status: IMPLEMENTATION_JOB_STATUS.WRITE_BLOCKED,
    attemptedWrites,
    blockedWrites: hasImplementationPath(current.blockedWrites, path)
      ? current.blockedWrites
      : [...current.blockedWrites, path],
    allowedNextActions: [
      IMPLEMENTATION_JOB_ACTION.RETRY_WITH_EVIDENCE,
      IMPLEMENTATION_JOB_ACTION.SHOW_BLOCKED_REASON,
      IMPLEMENTATION_JOB_ACTION.STOP,
    ],
    updatedAt: Date.now(),
  };
}

export function rememberImplementationToolFailure(job, toolCall = {}, error = "") {
  const current = createImplementationJob(job);
  const failedTool = normalizeToolRecord({
    toolName: toolCall?.name || toolCall?.toolName,
    path: toolCall?.args?.path,
    ok: false,
    error,
  });

  return {
    ...current,
    status: IMPLEMENTATION_JOB_STATUS.NEEDS_RECOVERY,
    failedTools: [...current.failedTools, failedTool],
    allowedNextActions: [
      IMPLEMENTATION_JOB_ACTION.RETRY_WITH_EVIDENCE,
      IMPLEMENTATION_JOB_ACTION.SWITCH_MODEL,
      IMPLEMENTATION_JOB_ACTION.STOP,
    ],
    updatedAt: Date.now(),
  };
}

export function evaluateImplementationToolRequest(job, toolCall = {}, options = {}) {
  const current = createImplementationJob(job);
  const toolName = String(toolCall?.name || toolCall?.toolName || "").trim();
  const path = normalizeImplementationPath(toolCall?.args?.path || "");
  const blockRepeatedReads = options.blockRepeatedReads !== false;
  const requireInspectionBeforeWrite =
    options.requireInspectionBeforeWrite === true;

  if (
    blockRepeatedReads &&
    isImplementationReadTool(toolName) &&
    path &&
    hasImplementationPath(current.inspectedPaths, path) &&
    !hasImplementationPath(current.successfulWrites, path)
  ) {
    return {
      decision: IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_REPEATED_READ,
      ok: false,
      path,
      toolName,
      allowedNextActions: [
        IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
        IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
        IMPLEMENTATION_JOB_ACTION.STOP,
      ],
      error:
        "KForge blocked a repeated read of an already inspected file for this implementation job. Use the inspected evidence, request one smallest safe write_file change, inspect one different clearly relevant text file, or stop with a clear job-specific reason.",
    };
  }

  if (
    requireInspectionBeforeWrite &&
    isImplementationWriteTool(toolName) &&
    path &&
    current.inspectedPaths.length === 0
  ) {
    return {
      decision:
        IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_UNSAFE_WRITE_WITHOUT_INSPECTION,
      ok: false,
      path,
      toolName,
      allowedNextActions: [
        IMPLEMENTATION_JOB_ACTION.INSPECT_LIKELY_FILE,
        IMPLEMENTATION_JOB_ACTION.STOP,
      ],
      error:
        "KForge blocked a write request before any relevant file was inspected for this implementation job.",
    };
  }

  return {
    decision: IMPLEMENTATION_JOB_TOOL_DECISION.ALLOW,
    ok: true,
    path,
    toolName,
    allowedNextActions: [],
    error: "",
  };
}

export function buildImplementationJobFocusedPrompt(job, fallbackGoal = "") {
  const current = createImplementationJob(job);
  const originalGoal = current.originalGoal || String(fallbackGoal || "").trim();
  const inspectedPaths = current.inspectedPaths.length
    ? current.inspectedPaths.join(", ")
    : "none yet";

  return (
    "Continue the active KForge implementation job.\n\n" +
    `Original request: ${originalGoal}\n\n` +
    `Already inspected paths: ${inspectedPaths}\n\n` +
    "Do not repeat broad inspection. Request exactly one valid fenced ```tool``` block next.\n" +
    "If the inspected evidence is enough, request one write_file tool for the smallest safe change.\n" +
    "If more evidence is genuinely needed, request one read_file for one different clearly relevant text file.\n" +
    "If no safe code edit is justified, explain the job-specific reason and stop."
  );
}
