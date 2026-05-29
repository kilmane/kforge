export const WORKFLOW_TASK_KIND = Object.freeze({
  PROJECT_EDIT: "project_edit",
  IMPLEMENTATION: "implementation",
  FEATURE_BLUEPRINT: "feature_blueprint",
  DIRECT_HANDOFF: "direct_handoff",
});

export const WORKFLOW_STATUS = Object.freeze({
  BLOCKED_BY_MODEL_POLICY: "blocked_by_model_policy",
  ADVISORY_TEST_OVERRIDE: "advisory_test_override",
  IN_PROGRESS: "in_progress",
  TOOL_WAITING: "tool_waiting",
  COMPLETED: "completed",
  WAITING_FOR_USER_RESULT: "waiting_for_user_result",
});

export const WORKFLOW_NEXT_STEP = Object.freeze({
  SWITCH_MODEL_OR_PLAN: "switch_model_or_plan",
  TOOL_APPROVAL_TEST_MODE: "tool_approval_test_mode",
  FIX: "fix",
  PREVIEW: "preview",
  SHOW_CHANGES: "show_changes",
  VERIFY: "verify",
  ANOTHER_EDIT: "another_edit",
  START_IMPLEMENTATION: "start_implementation",
  CONTINUE_IMPLEMENTATION: "continue_implementation",
  REFINE_BLUEPRINT: "refine_blueprint",
  INSTALL: "install",
  CONNECT_SERVICE: "connect_service",
  DEPLOY: "deploy",
  OPEN_PROJECT: "open_project",
});

export const ASSISTANT_ACTION_RESULT = Object.freeze({
  SUCCESS: "success",
  FAIL: "fail",
  BLOCKED: "blocked",
  PARTIAL: "partial",
  AMBIGUOUS: "ambiguous",
  NEEDS_USER: "needs_user",
  NEEDS_TOOL: "needs_tool",
  NO_CHANGE_NEEDED: "no_change_needed",
});

export const ASSISTANT_ACTION_TYPE = Object.freeze({
  PROJECT_EDIT: "project_edit",
  IMPLEMENTATION: "implementation",
  FEATURE_BLUEPRINT: "feature_blueprint",
  DIRECT_HANDOFF: "direct_handoff",
  FIX: "fix",
  PERFORMANCE: "performance",
  PREVIEW: "preview",
  DEPLOY: "deploy",
  SERVICES: "services",
  MANUAL: "manual",
  SELF_VERIFICATION: "self_verification",
  UNKNOWN: "unknown",
});

export const SUGGESTED_ACTION_LABEL = Object.freeze({
  PREVIEW_APP: "Preview the app",
  SHOW_CHANGES: "Show changes",
  VERIFY_CHANGES: "Status",
  CONTINUE_EDITING: "Continue editing",
  CONTINUE_IMPLEMENTATION: "Continue implementation",
  CONTINUE_FIXING: "Continue fixing",
  CONTINUE_DIAGNOSING: "Continue diagnosing",
  START_IMPLEMENTATION: "Start implementation",
  REFINE_BLUEPRINT: "Refine blueprint",
  AI_ASSISTED_APP_BRIEF: "Use AI-assisted plan",
  FIX_ERROR: "Fix the error",
  SHOW_LOGS: "Show logs",
  TRY_AGAIN: "Try again",
  DEPLOY_VERCEL: "Deploy to Vercel",
  DEPLOY_NETLIFY: "Deploy to Netlify",
  OPEN_SERVICES: "Open Services",
  GIVE_MANUAL_STEPS: "Give manual steps",
  NO_ACTION_NEEDED: "No action needed",
  CONNECT_GITHUB_FIRST: "Connect GitHub first",
  CHOOSE_VERCEL: "Choose Vercel",
  CHOOSE_NETLIFY: "Choose Netlify",
  INSPECT_FIRST: "Inspect first",
  STOP: "Stop",
});

export const VERIFICATION_STATUS = Object.freeze({
  NOT_RUN: "not_run",
  SUGGESTED: "suggested",
  PASSED: "passed",
  FAILED: "failed",
  UNKNOWN: "unknown",
});

function normalizeWorkflowPathList(paths = []) {
  const sourcePaths = Array.isArray(paths) ? paths : [];
  const seen = new Set();
  const normalized = [];

  sourcePaths.forEach((path) => {
    const cleanPath = String(path || "").trim();
    if (!cleanPath || seen.has(cleanPath)) return;

    seen.add(cleanPath);
    normalized.push(cleanPath);
  });

  return normalized;
}

function normalizeChangedFileSummaries(changedFileSummaries = []) {
  const sourceSummaries = Array.isArray(changedFileSummaries)
    ? changedFileSummaries
    : [];

  return sourceSummaries
    .map((item) => {
      if (typeof item === "string") {
        return {
          path: "",
          summary: item.trim(),
        };
      }

      return {
        path: String(item?.path || "").trim(),
        summary: String(item?.summary || "").trim(),
      };
    })
    .filter((item) => item.summary);
}

function normalizePreWriteSnapshots(preWriteSnapshots = []) {
  const sourceSnapshots = Array.isArray(preWriteSnapshots)
    ? preWriteSnapshots
    : [];

  return sourceSnapshots
    .map((item) => {
      const previousContent =
        typeof item?.previousContent === "string" ? item.previousContent : "";

      return {
        path: String(item?.path || "").trim(),
        previousContent,
        byteLength: new TextEncoder().encode(previousContent).length,
        capturedAt: Number.isFinite(Number(item?.capturedAt))
          ? Number(item.capturedAt)
          : Date.now(),
      };
    })
    .filter((item) => item.path);
}

function normalizeAssistantActionResult(result = "") {
  const cleanResult = String(result || "").trim();

  return Object.values(ASSISTANT_ACTION_RESULT).includes(cleanResult)
    ? cleanResult
    : ASSISTANT_ACTION_RESULT.AMBIGUOUS;
}

function normalizeAssistantActionType(actionType = "") {
  const cleanActionType = String(actionType || "").trim();

  return Object.values(ASSISTANT_ACTION_TYPE).includes(cleanActionType)
    ? cleanActionType
    : ASSISTANT_ACTION_TYPE.UNKNOWN;
}

function normalizeVerificationStatus(status = "") {
  const cleanStatus = String(status || "").trim();

  return Object.values(VERIFICATION_STATUS).includes(cleanStatus)
    ? cleanStatus
    : VERIFICATION_STATUS.UNKNOWN;
}

export function buildSuggestedActionsForAssistantResult({
  actionResult = ASSISTANT_ACTION_RESULT.AMBIGUOUS,
  actionType = ASSISTANT_ACTION_TYPE.UNKNOWN,
} = {}) {
  const result = normalizeAssistantActionResult(actionResult);
  const type = normalizeAssistantActionType(actionType);

  if (
    result === ASSISTANT_ACTION_RESULT.SUCCESS &&
    type === ASSISTANT_ACTION_TYPE.PROJECT_EDIT
  ) {
    return [
      SUGGESTED_ACTION_LABEL.PREVIEW_APP,
      SUGGESTED_ACTION_LABEL.VERIFY_CHANGES,
      SUGGESTED_ACTION_LABEL.SHOW_CHANGES,
      SUGGESTED_ACTION_LABEL.CONTINUE_EDITING,
      SUGGESTED_ACTION_LABEL.NO_ACTION_NEEDED,
    ];
  }

  if (
    result === ASSISTANT_ACTION_RESULT.SUCCESS &&
    type === ASSISTANT_ACTION_TYPE.FEATURE_BLUEPRINT
  ) {
    return [
      SUGGESTED_ACTION_LABEL.START_IMPLEMENTATION,
      SUGGESTED_ACTION_LABEL.REFINE_BLUEPRINT,
      SUGGESTED_ACTION_LABEL.INSPECT_FIRST,
      SUGGESTED_ACTION_LABEL.NO_ACTION_NEEDED,
    ];
  }

  if (
    result === ASSISTANT_ACTION_RESULT.SUCCESS &&
    type === ASSISTANT_ACTION_TYPE.PREVIEW
  ) {
    return [
      SUGGESTED_ACTION_LABEL.DEPLOY_VERCEL,
      SUGGESTED_ACTION_LABEL.DEPLOY_NETLIFY,
      SUGGESTED_ACTION_LABEL.CONTINUE_EDITING,
    ];
  }

  if (
    result === ASSISTANT_ACTION_RESULT.FAIL &&
    type === ASSISTANT_ACTION_TYPE.PREVIEW
  ) {
    return [
      SUGGESTED_ACTION_LABEL.FIX_ERROR,
      SUGGESTED_ACTION_LABEL.SHOW_LOGS,
      SUGGESTED_ACTION_LABEL.TRY_AGAIN,
    ];
  }

  if (
    result === ASSISTANT_ACTION_RESULT.NEEDS_USER &&
    type === ASSISTANT_ACTION_TYPE.DEPLOY
  ) {
    return [
      SUGGESTED_ACTION_LABEL.CHOOSE_VERCEL,
      SUGGESTED_ACTION_LABEL.CHOOSE_NETLIFY,
      SUGGESTED_ACTION_LABEL.GIVE_MANUAL_STEPS,
    ];
  }

  if (
    result === ASSISTANT_ACTION_RESULT.BLOCKED &&
    (type === ASSISTANT_ACTION_TYPE.PROJECT_EDIT ||
      type === ASSISTANT_ACTION_TYPE.IMPLEMENTATION ||
      type === ASSISTANT_ACTION_TYPE.FIX)
  ) {
    return [
      SUGGESTED_ACTION_LABEL.INSPECT_FIRST,
      SUGGESTED_ACTION_LABEL.STOP,
    ];
  }

  if (
    result === ASSISTANT_ACTION_RESULT.PARTIAL &&
    type === ASSISTANT_ACTION_TYPE.PERFORMANCE
  ) {
    return [
      SUGGESTED_ACTION_LABEL.CONTINUE_DIAGNOSING,
      SUGGESTED_ACTION_LABEL.STOP,
    ];
  }

  if (
    result === ASSISTANT_ACTION_RESULT.PARTIAL &&
    type === ASSISTANT_ACTION_TYPE.FIX
  ) {
    return [
      SUGGESTED_ACTION_LABEL.CONTINUE_FIXING,
      SUGGESTED_ACTION_LABEL.STOP,
    ];
  }

  if (
    result === ASSISTANT_ACTION_RESULT.PARTIAL &&
    type === ASSISTANT_ACTION_TYPE.IMPLEMENTATION
  ) {
    return [
      SUGGESTED_ACTION_LABEL.CONTINUE_IMPLEMENTATION,
      SUGGESTED_ACTION_LABEL.PREVIEW_APP,
      SUGGESTED_ACTION_LABEL.SHOW_CHANGES,
      SUGGESTED_ACTION_LABEL.STOP,
    ];
  }

  if (result === ASSISTANT_ACTION_RESULT.PARTIAL) {
    return [
      SUGGESTED_ACTION_LABEL.CONTINUE_EDITING,
      SUGGESTED_ACTION_LABEL.STOP,
    ];
  }

  if (result === ASSISTANT_ACTION_RESULT.NO_CHANGE_NEEDED) {
    return [
      SUGGESTED_ACTION_LABEL.PREVIEW_APP,
      SUGGESTED_ACTION_LABEL.CONTINUE_EDITING,
      SUGGESTED_ACTION_LABEL.GIVE_MANUAL_STEPS,
    ];
  }

  return [
    SUGGESTED_ACTION_LABEL.SHOW_CHANGES,
    SUGGESTED_ACTION_LABEL.CONTINUE_EDITING,
    SUGGESTED_ACTION_LABEL.GIVE_MANUAL_STEPS,
  ];
}

export function buildAssistantResultProtocol({
  actionResult = ASSISTANT_ACTION_RESULT.AMBIGUOUS,
  actionType = ASSISTANT_ACTION_TYPE.UNKNOWN,
  summary = "",
  changedPaths = [],
  nextStep = "",
  suggestedActions = null,
  verificationStatus = VERIFICATION_STATUS.UNKNOWN,
  verificationSummary = "",
  source = "",
} = {}) {
  const normalizedActionResult = normalizeAssistantActionResult(actionResult);
  const normalizedActionType = normalizeAssistantActionType(actionType);
  const normalizedVerificationStatus = normalizeVerificationStatus(verificationStatus);
  const normalizedChangedPaths = normalizeWorkflowPathList(changedPaths);
  const normalizedSuggestedActions = Array.isArray(suggestedActions)
    ? suggestedActions.map((item) => String(item || "").trim()).filter(Boolean)
    : buildSuggestedActionsForAssistantResult({
        actionResult: normalizedActionResult,
        actionType: normalizedActionType,
      });

  return {
    actionResult: normalizedActionResult,
    actionType: normalizedActionType,
    summary: String(summary || "").trim(),
    changedPaths: normalizedChangedPaths,
    nextStep: String(nextStep || "").trim(),
    suggestedActions: normalizedSuggestedActions,
    verificationStatus: normalizedVerificationStatus,
    verificationSummary: String(verificationSummary || "").trim(),
    updatedAt: Date.now(),
    source: String(source || "").trim(),
  };
}

export function buildCompletedWorkflowChangeSummary(context = null, options = {}) {
  const editedPaths = normalizeWorkflowPathList(context?.editedPaths);
  const lastEditedPath = String(context?.lastEditedPath || "").trim();
  const changedFileSummaries = normalizeChangedFileSummaries(
    context?.changedFileSummaries,
  );
  const fallbackLine = String(
    Object.prototype.hasOwnProperty.call(options || {}, "fallbackLine")
      ? options.fallbackLine
      : "I do not have a detailed summary of each file yet.",
  ).trim();
  const maxPaths =
    Number.isFinite(options?.maxPaths) && options.maxPaths > 0
      ? Math.floor(options.maxPaths)
      : 8;

  const paths =
    editedPaths.length > 0 ? editedPaths : lastEditedPath ? [lastEditedPath] : [];

  if (paths.length === 0) {
    return (
      "Changed:\n" +
      "- Implementation completed, but no changed file path was recorded.\n\n" +
      fallbackLine
    );
  }

  const summaryByPath = new Map();
  changedFileSummaries.forEach((item) => {
    if (item.path && item.summary && !summaryByPath.has(item.path)) {
      summaryByPath.set(item.path, item.summary);
    }
  });

  const visiblePaths = paths.slice(0, maxPaths);
  const lines = visiblePaths.map((path) => {
    const summary = summaryByPath.get(path);
    return summary ? `- ${path} — ${summary}` : `- ${path}`;
  });

  if (paths.length > visiblePaths.length) {
    lines.push(`- ...and ${paths.length - visiblePaths.length} more`);
  }

  const hasMissingSummaries =
    changedFileSummaries.length === 0 ||
    visiblePaths.some((path) => !summaryByPath.has(path));

  return (
    `Changed:\n${lines.join("\n")}` +
    (hasMissingSummaries && fallbackLine ? `\n\n${fallbackLine}` : "")
  );
}

export function createDirectHandoffWorkflowContext({
  handoffType = "",
  expectedResult = "",
  nextStep = "",
  lastUserGoal = "",
  source = "direct_handoff",
  verificationStatus = VERIFICATION_STATUS.UNKNOWN,
  verificationSummary = "",
} = {}) {
  const cleanHandoffType = String(handoffType || "").trim();
  const cleanNextStep = String(nextStep || cleanHandoffType || "").trim();

  return {
    taskKind: WORKFLOW_TASK_KIND.DIRECT_HANDOFF,
    status: WORKFLOW_STATUS.WAITING_FOR_USER_RESULT,
    nextStep: cleanNextStep,
    handoffType: cleanHandoffType,
    expectedResult: String(expectedResult || "").trim(),
    lastUserGoal: String(lastUserGoal || "").trim(),
    verificationStatus: normalizeVerificationStatus(verificationStatus),
    verificationSummary: String(verificationSummary || "").trim(),
    updatedAt: Date.now(),
    source: String(source || "").trim(),
  };
}
export function createAdvisoryTestOverrideWorkflowContext(
  previousContext = null,
) {
  return {
    ...(previousContext || {}),
    status: WORKFLOW_STATUS.ADVISORY_TEST_OVERRIDE,
    nextStep: WORKFLOW_NEXT_STEP.TOOL_APPROVAL_TEST_MODE,
    overrideReason: "user_explicit_test_current_model",
    updatedAt: Date.now(),
    source: "model_policy_advisory_override",
  };
}

export function createBugfixWorkflowContext(
  previousContext = null,
  source = "bugfix_followup",
) {
  return {
    ...(previousContext || {}),
    status: WORKFLOW_STATUS.IN_PROGRESS,
    nextStep: WORKFLOW_NEXT_STEP.FIX,
    updatedAt: Date.now(),
    source,
  };
}

export function createBlockedProjectEditWorkflowContext(lastUserGoal = "") {
  return {
    taskKind: WORKFLOW_TASK_KIND.PROJECT_EDIT,
    status: WORKFLOW_STATUS.BLOCKED_BY_MODEL_POLICY,
    nextStep: WORKFLOW_NEXT_STEP.SWITCH_MODEL_OR_PLAN,
    blockedReason: "advisory_only",
    lastUserGoal,
    updatedAt: Date.now(),
    source: "model_policy_advisory_only",
  };
}

export function createCompletedFeatureBlueprintWorkflowContext({
  lastUserGoal = "",
  blueprintSummary = "",
  source = "feature_blueprint",
} = {}) {
  const cleanBlueprintSummary = String(blueprintSummary || "").trim();
  const assistantResult = buildAssistantResultProtocol({
    actionResult: ASSISTANT_ACTION_RESULT.SUCCESS,
    actionType: ASSISTANT_ACTION_TYPE.FEATURE_BLUEPRINT,
    summary: cleanBlueprintSummary || "Feature blueprint prepared.",
    nextStep: WORKFLOW_NEXT_STEP.START_IMPLEMENTATION,
    source,
  });

  return {
    taskKind: WORKFLOW_TASK_KIND.FEATURE_BLUEPRINT,
    status: WORKFLOW_STATUS.COMPLETED,
    nextStep: WORKFLOW_NEXT_STEP.START_IMPLEMENTATION,
    lastUserGoal: String(lastUserGoal || "").trim(),
    blueprintSummary: cleanBlueprintSummary,
    assistantResult,
    updatedAt: Date.now(),
    source,
  };
}

export function createImplementationInProgressWorkflowContext() {
  return {
    taskKind: WORKFLOW_TASK_KIND.IMPLEMENTATION,
    status: WORKFLOW_STATUS.IN_PROGRESS,
    nextStep: WORKFLOW_NEXT_STEP.PREVIEW,
    updatedAt: Date.now(),
    source: "send_with_prompt",
  };
}

export function createPartialImplementationWorkflowContext({
  lastUserGoal = "",
  lastEditedPath = "",
  editedPaths = [],
  changedFileSummaries = [],
  partialSummary = "",
  assistantResult = null,
  nextStep = WORKFLOW_NEXT_STEP.CONTINUE_IMPLEMENTATION,
  source = "partial_implementation",
} = {}) {
  const normalizedEditedPaths = normalizeWorkflowPathList(editedPaths);
  const normalizedChangedFileSummaries =
    normalizeChangedFileSummaries(changedFileSummaries);
  const cleanLastEditedPath = String(lastEditedPath || "").trim();
  const finalLastEditedPath =
    cleanLastEditedPath ||
    (normalizedEditedPaths.length > 0
      ? normalizedEditedPaths[normalizedEditedPaths.length - 1]
      : "");

  const finalEditedPaths =
    normalizedEditedPaths.length > 0
      ? normalizedEditedPaths
      : finalLastEditedPath
        ? [finalLastEditedPath]
        : [];

  const finalAssistantResult =
    assistantResult ||
    buildAssistantResultProtocol({
      actionResult: ASSISTANT_ACTION_RESULT.PARTIAL,
      actionType: ASSISTANT_ACTION_TYPE.IMPLEMENTATION,
      changedPaths: finalEditedPaths,
      nextStep,
      source,
    });

  return {
    taskKind: WORKFLOW_TASK_KIND.IMPLEMENTATION,
    status: WORKFLOW_STATUS.IN_PROGRESS,
    nextStep,
    lastUserGoal: String(lastUserGoal || "").trim(),
    lastEditedPath: finalLastEditedPath,
    editedPaths: finalEditedPaths,
    changedFileSummaries: normalizedChangedFileSummaries,
    partialSummary: String(partialSummary || "").trim(),
    assistantResult: finalAssistantResult,
    updatedAt: Date.now(),
    source,
  };
}

export function createCompletedImplementationWorkflowContext({
  lastEditedPath = "",
  editedPaths = [],
  changedFileSummaries = [],
  preWriteSnapshots = [],
  changeSummary = "",
  completedSummary = "",
  partialSummary = "",
  verificationStatus = VERIFICATION_STATUS.NOT_RUN,
  verificationSummary = "Preview, build, and tests have not been run yet.",
  assistantResult = null,
  nextStep = WORKFLOW_NEXT_STEP.PREVIEW,
  source = "tool_batch",
} = {}) {
  const normalizedEditedPaths = normalizeWorkflowPathList(editedPaths);
  const normalizedChangedFileSummaries =
    normalizeChangedFileSummaries(changedFileSummaries);
  const normalizedPreWriteSnapshots =
    normalizePreWriteSnapshots(preWriteSnapshots);
  const cleanLastEditedPath = String(lastEditedPath || "").trim();
  const finalLastEditedPath =
    cleanLastEditedPath ||
    (normalizedEditedPaths.length > 0
      ? normalizedEditedPaths[normalizedEditedPaths.length - 1]
      : "");

  const finalEditedPaths =
    normalizedEditedPaths.length > 0
      ? normalizedEditedPaths
      : finalLastEditedPath
        ? [finalLastEditedPath]
        : [];

  const finalAssistantResult =
    assistantResult ||
    buildAssistantResultProtocol({
      actionResult: ASSISTANT_ACTION_RESULT.SUCCESS,
      actionType: ASSISTANT_ACTION_TYPE.PROJECT_EDIT,
      changedPaths: finalEditedPaths,
      nextStep,
      verificationStatus,
      verificationSummary,
      source,
    });

  return {
    taskKind: WORKFLOW_TASK_KIND.IMPLEMENTATION,
    status: WORKFLOW_STATUS.COMPLETED,
    nextStep,
    lastEditedPath: finalLastEditedPath,
    editedPaths: finalEditedPaths,
    changedFileSummaries: normalizedChangedFileSummaries,
    preWriteSnapshots: normalizedPreWriteSnapshots,
    changeSummary: String(changeSummary || "").trim(),
    completedSummary: String(completedSummary || "").trim(),
    partialSummary: String(partialSummary || "").trim(),
    verificationStatus: normalizeVerificationStatus(verificationStatus),
    verificationSummary: String(verificationSummary || "").trim(),
    assistantResult: finalAssistantResult,
    updatedAt: Date.now(),
    source,
  };
}
