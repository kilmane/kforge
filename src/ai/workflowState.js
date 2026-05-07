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
