export const PROJECT_INSPECTION_TASK_KIND = "project_inspection";

const PROJECT_INSPECTION_CONTINUATION_TOOLS = Object.freeze([
  Object.freeze({
    name: "list_dir",
    description: "List files and directories for a given path.",
  }),
  Object.freeze({
    name: "read_file",
    description: "Read the contents of a file.",
  }),
  Object.freeze({
    name: "search_in_file",
    description: "Search for text inside a file.",
  }),
]);

const PROJECT_INSPECTION_TOOL_NAMES = new Set(
  PROJECT_INSPECTION_CONTINUATION_TOOLS.map((tool) => tool.name),
);

export function isProjectInspectionTaskKind(taskKind = "") {
  return String(taskKind || "").trim() === PROJECT_INSPECTION_TASK_KIND;
}

export function isProjectInspectionToolAllowed(toolName = "") {
  return PROJECT_INSPECTION_TOOL_NAMES.has(
    String(toolName || "").trim(),
  );
}

export function buildProjectInspectionContinuationTools() {
  return PROJECT_INSPECTION_CONTINUATION_TOOLS.map((tool) => ({ ...tool }));
}

export function buildProjectInspectionRecoveryToolCall() {
  return {
    name: "list_dir",
    args: { path: "." },
  };
}

export function getProjectInspectionMaxSteps() {
  return 12;
}

export function shouldRequireProjectInspectionEvidence({
  taskKind = "",
  toolBlockCount = 0,
  askForPatch = false,
} = {}) {
  return (
    isProjectInspectionTaskKind(taskKind) &&
    Number(toolBlockCount) === 0 &&
    !askForPatch
  );
}
