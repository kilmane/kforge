import {
  createImplementationJob,
  evaluateImplementationToolRequest,
  getPendingImplementationOperations,
  hasCompletedPlannedImplementationOperations,
  isImplementationOperationCompletionTool,
  isImplementationReadTool,
  isImplementationWriteTool,
  normalizeImplementationPath,
  rememberImplementationToolResult,
} from "./implementationJobController.js";
import { TOOL_FAILURE_STAGE } from "../tools/toolRuntime.js";

export const CONTROLLED_IMPLEMENTATION_STATUS = Object.freeze({
  ACTIVE: "active",
  AWAITING_WRITE_APPROVAL: "awaiting_write_approval",
  COMPLETED: "completed",
  TERMINAL_UNCERTAIN: "terminal_uncertain",
  BOUNDED_FAILURE: "bounded_failure",
  CORRELATION_FAILURE: "correlation_failure",
});

export const CONTROLLED_RECOVERY_DIRECTIVE = Object.freeze({
  CONTINUE_WITH_DURABLE_EVIDENCE: "continue_with_durable_evidence",
  REFRESH_EXACT_TARGET: "refresh_exact_target",
  AWAIT_USER: "await_user",
  TERMINAL_UNCERTAIN: "terminal_uncertain",
  COMPLETED: "completed",
});

export const CONTROLLED_IMPLEMENTATION_EVENT = Object.freeze({
  REQUEST: "request",
  RESULT: "result",
  OPERATION_COMPLETION: "operation_completion",
  CONTINUATION: "continuation",
  TERMINAL: "terminal",
});

const MIN_CONTROLLED_TRANSITIONS = 12;
const MAX_CONTROLLED_TRANSITIONS = 64;
const MAX_RECORDED_EVENTS = 80;
const FINAL_CONTROLLED_RESPONSE_STEPS = 1;

function normalizeFailureStage(value) {
  const stage = String(value || "").trim();
  return Object.values(TOOL_FAILURE_STAGE).includes(stage) ? stage : "";
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePathKey(value = "") {
  return normalizeImplementationPath(value).toLowerCase();
}

function getLatestPathSequence(records = [], path = "") {
  const pathKey = normalizePathKey(path);
  return (Array.isArray(records) ? records : []).reduce(
    (latest, record) =>
      normalizePathKey(record?.path) === pathKey &&
      Number.isInteger(record?.sequence)
        ? Math.max(latest, record.sequence)
        : latest,
    0,
  );
}

function getPendingOperationTransitionState(job = {}) {
  const current = createImplementationJob(job);
  return getPendingImplementationOperations(current).map((operation) => {
    const latestMutationSequence = getLatestPathSequence(
      current.successfulMutations,
      operation.path,
    );
    const latestInspectionSequence = getLatestPathSequence(
      current.inspectionHistory,
      operation.path,
    );
    return {
      operation,
      latestMutationSequence,
      latestInspectionSequence,
      needsInitialMutation: latestMutationSequence === 0,
      needsPostMutationInspection:
        latestMutationSequence > 0 &&
        latestInspectionSequence <= latestMutationSequence,
    };
  });
}

export function getControlledImplementationTransitionLimit(job = {}) {
  const current = createImplementationJob(job);
  const pendingOperations = getPendingImplementationOperations(current);
  const targetPathKeys = new Set(
    pendingOperations.map((operation) => normalizePathKey(operation.path)),
  );
  const reusableEvidencePathKeys = new Set(
    (Array.isArray(current.reusableCapabilities)
      ? current.reusableCapabilities
      : [])
      .map((evidence) => normalizePathKey(evidence?.path))
      .filter((pathKey) => pathKey && !targetPathKeys.has(pathKey)),
  );
  const responsibilityCount = pendingOperations.reduce(
    (total, operation) =>
      total +
      Math.max(
        1,
        Array.isArray(operation?.responsibilityIds)
          ? operation.responsibilityIds.length
          : 0,
      ),
    0,
  );

  // Each responsibility may require one mutation plus its mandatory fresh
  // inspection. Initial evidence is bounded by the larger of the structured
  // responsibility count or the declared target/helper evidence paths. Each
  // target may also use its one bounded refresh, and each operation receives
  // one completion transition plus one bounded recovery turn.
  const initialEvidenceAllowance = Math.max(
    responsibilityCount,
    targetPathKeys.size + reusableEvidencePathKeys.size,
  );
  const structuredLimit =
    responsibilityCount * 2 +
    pendingOperations.length * 2 +
    initialEvidenceAllowance +
    targetPathKeys.size;

  return Math.min(
    MAX_CONTROLLED_TRANSITIONS,
    Math.max(MIN_CONTROLLED_TRANSITIONS, structuredLimit),
  );
}

export function getControlledImplementationRequiredTransitionReserve(job = {}) {
  return getPendingOperationTransitionState(job).reduce((total, state) => {
    if (state.needsInitialMutation) return total + 3;
    if (state.needsPostMutationInspection) return total + 2;
    return total + 1;
  }, 0);
}

function normalizeEvent(event = {}) {
  return {
    type: String(event?.type || "").trim(),
    callId: String(event?.callId || "").trim(),
    toolName: String(event?.toolName || "").trim(),
    requestedPath: normalizeImplementationPath(event?.requestedPath),
    executedPath: normalizeImplementationPath(event?.executedPath),
    ok: typeof event?.ok === "boolean" ? event.ok : null,
    skipped: event?.skipped === true,
    cancelled: event?.cancelled === true,
    failureStage: normalizeFailureStage(event?.failureStage),
    requiresFreshInspection: event?.requiresFreshInspection === true,
    reason: String(event?.reason || "").trim(),
    operationId: String(event?.operationId || "").trim(),
    satisfiedResponsibilityIds: Array.from(
      new Set(
        (Array.isArray(event?.satisfiedResponsibilityIds)
          ? event.satisfiedResponsibilityIds
          : [])
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    ).slice(0, 20),
    transition: Number.isInteger(event?.transition)
      ? event.transition
      : 0,
  };
}

function appendEvent(lifecycle, event) {
  return {
    ...lifecycle,
    events: [...lifecycle.events, normalizeEvent(event)].slice(
      -MAX_RECORDED_EVENTS,
    ),
  };
}

function buildLifecycleId(job) {
  return `controlled-${String(job?.jobId || "implementation").trim()}`;
}

function buildCallId(lifecycle, sequence) {
  return `${lifecycle.lifecycleId}:call-${String(sequence).padStart(4, "0")}`;
}

export function isControlledImplementationJob(job = {}) {
  const current = createImplementationJob(job);
  return (
    Array.isArray(current.allowedWritePaths) &&
    current.allowedWritePaths.length > 0 &&
    Array.isArray(current.supabaseAppWiringContract) &&
    current.supabaseAppWiringContract.length > 0
  );
}

export function getPendingControlledWritePaths(lifecycle = {}) {
  const current = createControlledImplementationLifecycle(lifecycle);
  return Array.from(
    new Set(
      getPendingImplementationOperations(current.job).map(
        (operation) => operation.path,
      ),
    ),
  );
}

export function isPendingControlledImplementation(lifecycle = {}) {
  const current = createControlledImplementationLifecycle(lifecycle);
  return (
    isControlledImplementationJob(current.job) &&
    current.status !== CONTROLLED_IMPLEMENTATION_STATUS.COMPLETED &&
    current.status !== CONTROLLED_IMPLEMENTATION_STATUS.TERMINAL_UNCERTAIN &&
    current.status !== CONTROLLED_IMPLEMENTATION_STATUS.BOUNDED_FAILURE &&
    current.status !== CONTROLLED_IMPLEMENTATION_STATUS.CORRELATION_FAILURE &&
    getPendingImplementationOperations(current.job).length > 0
  );
}

export function isCanonicalControlledImplementationLifecycle(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.version === 2 &&
      typeof value.lifecycleId === "string" &&
      value.lifecycleId.trim() &&
      value.job &&
      typeof value.job === "object" &&
      Array.isArray(value.job.plannedOperations) &&
      value.job.plannedOperations.length > 0 &&
      isControlledImplementationJob(value.job),
  );
}

function buildRecoveryDirective(type, lifecycle, result = {}) {
  return {
    type,
    targetPath: normalizeImplementationPath(
      type === CONTROLLED_RECOVERY_DIRECTIVE.REFRESH_EXACT_TARGET
        ? lifecycle?.requiredFreshInspectionPath || result?.requestedPath
        : "",
    ),
    reason: String(
      result?.reason || lifecycle?.terminalReason || "",
    ).trim(),
  };
}

export function getControlledRecoveryDirective(lifecycle, result = {}) {
  const current = createControlledImplementationLifecycle(lifecycle);

  if (
    current.status === CONTROLLED_IMPLEMENTATION_STATUS.COMPLETED ||
    hasCompletedPlannedImplementationOperations(current.job)
  ) {
    return buildRecoveryDirective(
      CONTROLLED_RECOVERY_DIRECTIVE.COMPLETED,
      current,
      result,
    );
  }

  if (
    current.status === CONTROLLED_IMPLEMENTATION_STATUS.TERMINAL_UNCERTAIN ||
    current.status === CONTROLLED_IMPLEMENTATION_STATUS.BOUNDED_FAILURE ||
    current.status === CONTROLLED_IMPLEMENTATION_STATUS.CORRELATION_FAILURE
  ) {
    return buildRecoveryDirective(
      CONTROLLED_RECOVERY_DIRECTIVE.TERMINAL_UNCERTAIN,
      current,
      result,
    );
  }

  if (
    result?.cancelled === true ||
    result?.failureStage === TOOL_FAILURE_STAGE.APPROVAL
  ) {
    return buildRecoveryDirective(
      CONTROLLED_RECOVERY_DIRECTIVE.AWAIT_USER,
      current,
      result,
    );
  }

  if (
    result?.failureStage === TOOL_FAILURE_STAGE.PRE_APPROVAL &&
    result?.requiresFreshInspection === true &&
    current.requiredFreshInspectionPath
  ) {
    return buildRecoveryDirective(
      CONTROLLED_RECOVERY_DIRECTIVE.REFRESH_EXACT_TARGET,
      current,
      result,
    );
  }

  return buildRecoveryDirective(
    CONTROLLED_RECOVERY_DIRECTIVE.CONTINUE_WITH_DURABLE_EVIDENCE,
    current,
    result,
  );
}

export function createControlledImplementationLifecycle(seed = {}) {
  const jobSeed = seed?.job || seed;
  const job = createImplementationJob(jobSeed);
  const derivedTransitionLimit = getControlledImplementationTransitionLimit(job);
  const completed = hasCompletedPlannedImplementationOperations(job);
  const status = completed
    ? CONTROLLED_IMPLEMENTATION_STATUS.COMPLETED
    : Object.values(CONTROLLED_IMPLEMENTATION_STATUS).includes(seed?.status)
      ? seed.status
      : CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE;

  return {
    version: 2,
    lifecycleId:
      String(seed?.lifecycleId || "").trim() || buildLifecycleId(job),
    status,
    job,
    nextCallSequence: normalizePositiveInteger(seed?.nextCallSequence, 1),
    transitionCount: Number.isInteger(seed?.transitionCount)
      ? Math.max(0, seed.transitionCount)
      : 0,
    maxTransitions: Math.min(
      MAX_CONTROLLED_TRANSITIONS,
      normalizePositiveInteger(seed?.maxTransitions, derivedTransitionLimit),
    ),
    terminalReason: String(seed?.terminalReason || "").trim(),
    requiredFreshInspectionPath: normalizeImplementationPath(
      seed?.requiredFreshInspectionPath,
    ),
    events: (Array.isArray(seed?.events) ? seed.events : [])
      .map(normalizeEvent)
      .slice(-MAX_RECORDED_EVENTS),
  };
}

export function getControlledImplementationAgentStepBudget(lifecycle = {}) {
  const current = createControlledImplementationLifecycle(lifecycle);
  const remainingTransitions = Math.max(
    0,
    current.maxTransitions - current.transitionCount,
  );
  return remainingTransitions + FINAL_CONTROLLED_RESPONSE_STEPS;
}

function withBoundedFailure(lifecycle, reason) {
  const current = createControlledImplementationLifecycle(lifecycle);
  const failed = {
    ...current,
    status: CONTROLLED_IMPLEMENTATION_STATUS.BOUNDED_FAILURE,
    terminalReason: String(reason || "Controlled lifecycle budget exhausted."),
  };

  return appendEvent(failed, {
    type: CONTROLLED_IMPLEMENTATION_EVENT.TERMINAL,
    reason: failed.terminalReason,
    transition: failed.transitionCount,
  });
}

function hasTransitionBudget(lifecycle) {
  return lifecycle.transitionCount < lifecycle.maxTransitions;
}

function getRequiredCapacityForToolRequest(lifecycle, toolName, path) {
  const pendingStates = getPendingOperationTransitionState(lifecycle.job);
  const reserve = getControlledImplementationRequiredTransitionReserve(
    lifecycle.job,
  );
  const pathKey = normalizePathKey(path);
  const matchingStates = pendingStates.filter(
    (state) => normalizePathKey(state.operation.path) === pathKey,
  );

  if (isImplementationOperationCompletionTool(toolName)) return reserve;

  if (
    toolName === "read_file" &&
    matchingStates.some((state) => state.needsPostMutationInspection)
  ) {
    return reserve;
  }

  if (isImplementationWriteTool(toolName) && matchingStates.length > 0) {
    return matchingStates.some((state) => state.needsInitialMutation)
      ? reserve
      : reserve + 2;
  }

  return reserve + 1;
}

export function beginControlledToolRequest(lifecycle, toolCall = {}) {
  let current = createControlledImplementationLifecycle(lifecycle);
  const toolName = String(toolCall?.name || toolCall?.toolName || "").trim();
  const args = toolCall?.args && typeof toolCall.args === "object"
    ? toolCall.args
    : {};
  const requestedPath = normalizeImplementationPath(
    args?.path || args?.dirPath || "",
  );

  if (!isPendingControlledImplementation(current)) {
    return {
      lifecycle: current,
      request: null,
      shouldExecute: false,
      result: null,
    };
  }

  const remainingTransitions = Math.max(
    0,
    current.maxTransitions - current.transitionCount,
  );
  const requiredCapacity = getRequiredCapacityForToolRequest(
    current,
    toolName,
    requestedPath,
  );
  if (!hasTransitionBudget(current) || remainingTransitions < requiredCapacity) {
    current = withBoundedFailure(
      current,
      "Controlled implementation reached its safe transition boundary while preserving mandatory mutation, post-mutation inspection, and operation-completion capacity.",
    );
    return {
      lifecycle: current,
      request: null,
      shouldExecute: false,
      result: null,
    };
  }

  const callSequence = current.nextCallSequence;
  const callId = buildCallId(current, callSequence);
  const transition = current.transitionCount + 1;
  const request = {
    callId,
    toolName,
    args,
    requestedPath,
  };

  current = appendEvent(
    {
      ...current,
      nextCallSequence: callSequence + 1,
      transitionCount: transition,
      status: isImplementationWriteTool(toolName)
        ? CONTROLLED_IMPLEMENTATION_STATUS.AWAITING_WRITE_APPROVAL
        : CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE,
    },
    {
      type: CONTROLLED_IMPLEMENTATION_EVENT.REQUEST,
      callId,
      toolName,
      requestedPath,
      transition,
    },
  );

  const decision =
    isImplementationReadTool(toolName) ||
    isImplementationWriteTool(toolName) ||
    isImplementationOperationCompletionTool(toolName)
      ? evaluateImplementationToolRequest(
          current.job,
          { name: toolName, args },
          {
            blockRepeatedReads: true,
            requireInspectionBeforeWrite: true,
            requiredFreshInspectionPath:
              current.requiredFreshInspectionPath,
          },
        )
      : {
          ok: false,
          error:
            "Controlled implementation blocked an unsupported tool request.",
        };

  if (decision.ok) {
    return {
      lifecycle: current,
      request,
      shouldExecute: true,
      result: null,
    };
  }

  const blockedToolResult = {
    ok: false,
    toolName,
    args,
    error: decision.error,
    skipped: true,
    failureStage: TOOL_FAILURE_STAGE.PRE_APPROVAL,
  };
  const completed = completeControlledToolRequest(
    current,
    request,
    blockedToolResult,
  );

  return {
    lifecycle: completed.lifecycle,
    request,
    shouldExecute: false,
    result: completed.result,
  };
}

export function completeControlledToolRequest(
  lifecycle,
  request,
  toolResult = {},
) {
  let current = createControlledImplementationLifecycle(lifecycle);
  const callId = String(request?.callId || "").trim();
  const toolName = String(request?.toolName || "").trim();
  const requestedPath = normalizeImplementationPath(request?.requestedPath);
  const resultToolName = String(toolResult?.toolName || toolName).trim();
  const resultHasCallId = Object.prototype.hasOwnProperty.call(
    toolResult || {},
    "callId",
  );
  const resultCallId = resultHasCallId
    ? String(toolResult?.callId || "").trim()
    : "";
  // The awaited adapter callback is scoped to one pending request, so older
  // handlers may omit a result ID. When a lower layer does provide one, it is
  // independent evidence and must match rather than being normalized away.
  const skipped = toolResult?.skipped === true;
  const cancelled = toolResult?.cancelled === true;
  const requiresFreshInspection =
    toolResult?.requiresFreshInspection === true;
  const explicitFailureStage = normalizeFailureStage(toolResult?.failureStage);
  const stoppedBeforeExecution =
    skipped ||
    cancelled ||
    explicitFailureStage === TOOL_FAILURE_STAGE.PRE_APPROVAL ||
    explicitFailureStage === TOOL_FAILURE_STAGE.APPROVAL;
  const executedPath = stoppedBeforeExecution
    ? ""
    : normalizeImplementationPath(
        toolResult?.args?.path || toolResult?.args?.dirPath || requestedPath,
      );
  const correlated =
    Boolean(callId) &&
    (!resultHasCallId || resultCallId === callId) &&
    resultToolName === toolName &&
    (!requestedPath ||
      !executedPath ||
      requestedPath.toLowerCase() === executedPath.toLowerCase());

  if (!correlated) {
    const reason =
      "Controlled tool result did not match its request identity, tool, and path.";
    current = appendEvent(
      {
        ...current,
        status: CONTROLLED_IMPLEMENTATION_STATUS.CORRELATION_FAILURE,
        terminalReason: reason,
      },
      {
        type: CONTROLLED_IMPLEMENTATION_EVENT.RESULT,
        callId,
        toolName: resultToolName,
        requestedPath,
        executedPath,
        ok: false,
        reason,
        transition: current.transitionCount,
      },
    );

    return {
      lifecycle: current,
      result: current.events[current.events.length - 1],
      recovery: getControlledRecoveryDirective(
        current,
        current.events[current.events.length - 1],
      ),
    };
  }

  const normalizedResult = {
    ...toolResult,
    callId,
    sequence: current.transitionCount,
    toolName,
    args: {
      ...(toolResult?.args && typeof toolResult.args === "object"
        ? toolResult.args
        : request?.args || {}),
      ...(requestedPath ? { path: requestedPath } : {}),
    },
  };
  const job = rememberImplementationToolResult(
    current.job,
    { name: toolName, args: request?.args || {} },
    normalizedResult,
  );
  const completed = hasCompletedPlannedImplementationOperations(job);
  const writeFailed =
    isImplementationWriteTool(toolName) && !Boolean(toolResult?.ok);
  const failureStage = writeFailed
    ? explicitFailureStage ||
      (cancelled
        ? TOOL_FAILURE_STAGE.APPROVAL
        : TOOL_FAILURE_STAGE.EXECUTION)
    : explicitFailureStage;
  const approvedMutationExecutionFailed =
    isImplementationWriteTool(toolName) &&
    writeFailed &&
    failureStage === TOOL_FAILURE_STAGE.EXECUTION;
  const mutationFailureReason = approvedMutationExecutionFailed
    ? `Controlled implementation stopped after an approved ${toolName} execution failed. Filesystem state is uncertain; fresh inspection, a fresh proposal, and new approval are required before another mutation.`
    : "";
  const requiresTargetRefresh =
    writeFailed &&
    failureStage === TOOL_FAILURE_STAGE.PRE_APPROVAL &&
    requiresFreshInspection;
  const completedRequiredRefresh = Boolean(
    toolResult?.ok &&
      isImplementationReadTool(toolName) &&
      current.requiredFreshInspectionPath &&
      requestedPath.toLowerCase() ===
        current.requiredFreshInspectionPath.toLowerCase(),
  );
  const requiredFreshInspectionPath = requiresTargetRefresh
    ? requestedPath
    : completedRequiredRefresh
      ? ""
      : current.requiredFreshInspectionPath;
  const resultEvent = normalizeEvent({
    type: isImplementationOperationCompletionTool(toolName)
      ? CONTROLLED_IMPLEMENTATION_EVENT.OPERATION_COMPLETION
      : CONTROLLED_IMPLEMENTATION_EVENT.RESULT,
    callId,
    toolName,
    requestedPath,
    executedPath,
    ok: Boolean(toolResult?.ok),
    skipped,
    cancelled,
    failureStage,
    requiresFreshInspection,
    reason: toolResult?.ok
      ? ""
      : cancelled
        ? "User cancelled or rejected tool approval."
        : String(toolResult?.error || "Tool failed."),
    operationId: request?.args?.operationId,
    satisfiedResponsibilityIds:
      request?.args?.satisfiedResponsibilityIds,
    transition: current.transitionCount,
  });

  current = appendEvent(
    {
      ...current,
      job,
      requiredFreshInspectionPath,
      status: approvedMutationExecutionFailed
        ? CONTROLLED_IMPLEMENTATION_STATUS.TERMINAL_UNCERTAIN
        : completed
          ? CONTROLLED_IMPLEMENTATION_STATUS.COMPLETED
          : CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE,
      terminalReason: mutationFailureReason,
    },
    resultEvent,
  );

  return {
    lifecycle: current,
    result: resultEvent,
    recovery: getControlledRecoveryDirective(current, resultEvent),
  };
}

export async function executeControlledImplementationTurn({
  lifecycle,
  toolCall,
  executeTool,
} = {}) {
  if (!isCanonicalControlledImplementationLifecycle(lifecycle)) {
    const reason =
      "KForge blocked controlled implementation because its canonical lifecycle state was missing or malformed.";
    return {
      lifecycle: null,
      request: null,
      requestEvent: null,
      result: {
        type: CONTROLLED_IMPLEMENTATION_EVENT.TERMINAL,
        ok: false,
        reason,
      },
      toolResult: {
        ok: false,
        toolName: String(toolCall?.name || toolCall?.toolName || "").trim(),
        args: toolCall?.args || {},
        error: reason,
        skipped: true,
        failureStage: TOOL_FAILURE_STAGE.PRE_APPROVAL,
        stopAgent: true,
      },
      recovery: {
        type: CONTROLLED_RECOVERY_DIRECTIVE.TERMINAL_UNCERTAIN,
        targetPath: "",
        reason,
      },
    };
  }

  const begun = beginControlledToolRequest(lifecycle, toolCall);
  const requestEvent = begun.request
    ? begun.lifecycle.events.find(
        (event) =>
          event.type === CONTROLLED_IMPLEMENTATION_EVENT.REQUEST &&
          event.callId === begun.request.callId,
      ) || null
    : null;

  if (!begun.request || !begun.shouldExecute) {
    const recovery = begun.result
      ? getControlledRecoveryDirective(begun.lifecycle, begun.result)
      : getControlledRecoveryDirective(begun.lifecycle);
    return {
      lifecycle: begun.lifecycle,
      request: begun.request,
      requestEvent,
      result: begun.result,
      toolResult: begun.result
        ? {
            ok: false,
            callId: begun.request?.callId || "",
            toolName: begun.request?.toolName || "",
            args: begun.request?.args || {},
            skipped: true,
            error: String(begun.result?.reason || "Tool request skipped."),
            failureStage: begun.result?.failureStage || TOOL_FAILURE_STAGE.PRE_APPROVAL,
            requiresFreshInspection:
              begun.result?.requiresFreshInspection === true,
          }
        : {
            ok: false,
            toolName: String(toolCall?.name || toolCall?.toolName || "").trim(),
            args: toolCall?.args || {},
            error:
              begun.lifecycle.terminalReason ||
              "Controlled implementation stopped safely.",
          },
      recovery,
    };
  }

  let toolResult;
  if (isImplementationOperationCompletionTool(begun.request.toolName)) {
    toolResult = {
      ok: true,
      callId: begun.request.callId,
      toolName: begun.request.toolName,
      args: begun.request.args,
      result: `Recorded completion for planned operation ${String(
        begun.request.args?.operationId || "",
      ).trim()}.`,
    };
  } else if (typeof executeTool !== "function") {
    toolResult = {
      ok: false,
      toolName: begun.request.toolName,
      args: begun.request.args,
      error: "Controlled implementation has no tool executor.",
      failureStage: TOOL_FAILURE_STAGE.EXECUTION,
    };
  } else {
    try {
      toolResult = await executeTool({ ...begun.request });
    } catch (error) {
      toolResult = {
        ok: false,
        toolName: begun.request.toolName,
        args: begun.request.args,
        error: String(error?.message || error || "Controlled tool execution failed."),
        failureStage: TOOL_FAILURE_STAGE.EXECUTION,
      };
    }
  }

  const completed = completeControlledToolRequest(
    begun.lifecycle,
    begun.request,
    toolResult,
  );
  return {
    lifecycle: completed.lifecycle,
    request: begun.request,
    requestEvent,
    result: completed.result,
    toolResult: {
      ...toolResult,
      callId: Object.prototype.hasOwnProperty.call(toolResult || {}, "callId")
        ? toolResult.callId
        : begun.request.callId,
      controlledCallId: begun.request.callId,
      toolName: begun.request.toolName,
      args: begun.request.args,
      controlledRecovery: completed.recovery,
      stopAgent:
        completed.recovery?.type ===
        CONTROLLED_RECOVERY_DIRECTIVE.TERMINAL_UNCERTAIN,
    },
    recovery: completed.recovery,
  };
}

export async function processControlledToolQueue(
  lifecycle,
  toolCalls = [],
  { executeTool } = {},
) {
  if (typeof executeTool !== "function") {
    throw new Error("processControlledToolQueue requires executeTool");
  }

  let current = createControlledImplementationLifecycle(lifecycle);
  const results = [];

  for (const toolCall of Array.isArray(toolCalls) ? toolCalls : []) {
    const turn = await executeControlledImplementationTurn({
      lifecycle: current,
      toolCall,
      executeTool,
    });
    if (!turn.lifecycle) break;
    current = turn.lifecycle;
    if (turn.result) results.push(turn.result);

    if (
      current.status === CONTROLLED_IMPLEMENTATION_STATUS.CORRELATION_FAILURE ||
      current.status === CONTROLLED_IMPLEMENTATION_STATUS.BOUNDED_FAILURE ||
      current.status === CONTROLLED_IMPLEMENTATION_STATUS.TERMINAL_UNCERTAIN
    ) {
      break;
    }
  }

  return { lifecycle: current, results };
}

export function continueControlledImplementationAfterProse(
  lifecycle,
  { reason = "Model returned prose while approved writes remain pending." } = {},
) {
  let current = createControlledImplementationLifecycle(lifecycle);

  if (!isPendingControlledImplementation(current)) {
    return { lifecycle: current, shouldContinue: false };
  }

  const remainingTransitions = Math.max(
    0,
    current.maxTransitions - current.transitionCount,
  );
  const requiredReserve =
    getControlledImplementationRequiredTransitionReserve(current.job);
  if (!hasTransitionBudget(current) || remainingTransitions <= requiredReserve) {
    current = withBoundedFailure(
      current,
      "Controlled implementation reached its safe transition boundary after repeated non-actionable model responses while preserving mandatory verification and completion capacity.",
    );
    return { lifecycle: current, shouldContinue: false };
  }

  const transition = current.transitionCount + 1;
  current = appendEvent(
    {
      ...current,
      status: CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE,
      transitionCount: transition,
    },
    {
      type: CONTROLLED_IMPLEMENTATION_EVENT.CONTINUATION,
      reason,
      transition,
    },
  );

  return { lifecycle: current, shouldContinue: true };
}

export function markControlledImplementationBoundedFailure(
  lifecycle,
  reason,
) {
  return withBoundedFailure(lifecycle, reason);
}
