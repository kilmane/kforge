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
  source = "tool_batch",
} = {}) {
  const normalizedEditedPaths = normalizeWorkflowPathList(editedPaths);
  const cleanLastEditedPath = String(lastEditedPath || "").trim();
  const finalLastEditedPath =
    cleanLastEditedPath ||
    (normalizedEditedPaths.length > 0
      ? normalizedEditedPaths[normalizedEditedPaths.length - 1]
      : "");

  return {
    taskKind: WORKFLOW_TASK_KIND.IMPLEMENTATION,
    status: WORKFLOW_STATUS.COMPLETED,
    nextStep: WORKFLOW_NEXT_STEP.PREVIEW,
    lastEditedPath: finalLastEditedPath,
    editedPaths:
      normalizedEditedPaths.length > 0
        ? normalizedEditedPaths
        : finalLastEditedPath
          ? [finalLastEditedPath]
          : [],
    updatedAt: Date.now(),
    source,
  };
}
