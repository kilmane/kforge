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

  return {
    taskKind: WORKFLOW_TASK_KIND.IMPLEMENTATION,
    status: WORKFLOW_STATUS.COMPLETED,
    nextStep,
    lastEditedPath: finalLastEditedPath,
    editedPaths:
      normalizedEditedPaths.length > 0
        ? normalizedEditedPaths
        : finalLastEditedPath
          ? [finalLastEditedPath]
          : [],
    changedFileSummaries: normalizedChangedFileSummaries,
    changeSummary: String(changeSummary || "").trim(),
    completedSummary: String(completedSummary || "").trim(),
    partialSummary: String(partialSummary || "").trim(),
    updatedAt: Date.now(),
    source,
  };
}