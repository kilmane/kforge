export const WORKFLOW_TASK_KIND = Object.freeze({
  PROJECT_EDIT: "project_edit",
  IMPLEMENTATION: "implementation",
});

export const WORKFLOW_STATUS = Object.freeze({
  BLOCKED_BY_MODEL_POLICY: "blocked_by_model_policy",
  ADVISORY_TEST_OVERRIDE: "advisory_test_override",
  IN_PROGRESS: "in_progress",
  TOOL_WAITING: "tool_waiting",
  COMPLETED: "completed",
});

export const WORKFLOW_NEXT_STEP = Object.freeze({
  SWITCH_MODEL_OR_PLAN: "switch_model_or_plan",
  TOOL_APPROVAL_TEST_MODE: "tool_approval_test_mode",
  FIX: "fix",
  PREVIEW: "preview",
  SHOW_CHANGES: "show_changes",
  ANOTHER_EDIT: "another_edit",
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
  FIX: "fix",
  PERFORMANCE: "performance",
  PREVIEW: "preview",
  DEPLOY: "deploy",
  SERVICES: "services",
  MANUAL: "manual",
  UNKNOWN: "unknown",
});

export const SUGGESTED_ACTION_LABEL = Object.freeze({
  PREVIEW_APP: "Preview the app",
  SHOW_CHANGES: "Show changes",
  CONTINUE_EDITING: "Continue editing",
  CONTINUE_FIXING: "Continue fixing",
  CONTINUE_DIAGNOSING: "Continue diagnosing",
  FIX_ERROR: "Fix the error",
  SHOW_LOGS: "Show logs",
  TRY_AGAIN: "Try again",
  DEPLOY_VERCEL: "Deploy to Vercel",
  DEPLOY_NETLIFY: "Deploy to Netlify",
  OPEN_SERVICES: "Open Services",
  GIVE_MANUAL_STEPS: "Give manual steps",
  CONNECT_GITHUB_FIRST: "Connect GitHub first",
  CHOOSE_VERCEL: "Choose Vercel",
  CHOOSE_NETLIFY: "Choose Netlify",
  INSPECT_FIRST: "Inspect first",
  STOP: "Stop",
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
      SUGGESTED_ACTION_LABEL.SHOW_CHANGES,
      SUGGESTED_ACTION_LABEL.CONTINUE_EDITING,
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
  source = "",
} = {}) {
  const normalizedActionResult = normalizeAssistantActionResult(actionResult);
  const normalizedActionType = normalizeAssistantActionType(actionType);
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
    options?.fallbackLine || "I do not have a detailed summary of each file yet.",
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

export function createImplementationInProgressWorkflowContext() {
  return {
    taskKind: WORKFLOW_TASK_KIND.IMPLEMENTATION,
    status: WORKFLOW_STATUS.IN_PROGRESS,
    nextStep: WORKFLOW_NEXT_STEP.PREVIEW,
    updatedAt: Date.now(),
    source: "send_with_prompt",
  };
}

export function createCompletedImplementationWorkflowContext({
  lastEditedPath = "",
  editedPaths = [],
  changedFileSummaries = [],
  changeSummary = "",
  completedSummary = "",
  partialSummary = "",
  assistantResult = null,
  nextStep = WORKFLOW_NEXT_STEP.PREVIEW,
  source = "tool_batch",
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
      actionResult: ASSISTANT_ACTION_RESULT.SUCCESS,
      actionType: ASSISTANT_ACTION_TYPE.PROJECT_EDIT,
      changedPaths: finalEditedPaths,
      nextStep,
      source,
    });

  return {
    taskKind: WORKFLOW_TASK_KIND.IMPLEMENTATION,
    status: WORKFLOW_STATUS.COMPLETED,
    nextStep,
    lastEditedPath: finalLastEditedPath,
    editedPaths: finalEditedPaths,
    changedFileSummaries: normalizedChangedFileSummaries,
    changeSummary: String(changeSummary || "").trim(),
    completedSummary: String(completedSummary || "").trim(),
    partialSummary: String(partialSummary || "").trim(),
    assistantResult: finalAssistantResult,
    updatedAt: Date.now(),
    source,
  };
}
