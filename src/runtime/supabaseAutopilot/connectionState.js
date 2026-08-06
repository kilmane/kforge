export const initialSupabaseConnectionState = {
  phase: "checking",
  snapshot: null,
  selectedProjectRef: "",
  error: "",
};

export function supabaseConnectionReducer(state, action) {
  switch (action.type) {
    case "begin":
      return {
        ...state,
        phase: action.phase,
        error: "",
      };
    case "snapshot": {
      const snapshot = normalizeSnapshot(action.snapshot);
      return {
        phase: snapshot.status,
        snapshot,
        selectedProjectRef:
          snapshot.status === "choose_project"
            ? chooseProjectRef(snapshot, state.selectedProjectRef)
            : "",
        error: "",
      };
    }
    case "select_project":
      return {
        ...state,
        selectedProjectRef: String(action.projectRef || ""),
        error: "",
      };
    case "error":
      return {
        ...state,
        phase: "error",
        error: safeErrorMessage(action.error),
      };
    default:
      return state;
  }
}

function normalizeSnapshot(value) {
  const snapshot = value && typeof value === "object" ? value : {};
  const supportedStatuses = new Set([
    "disconnected",
    "choose_project",
    "connected_read_only",
    "reconnect_required",
  ]);
  const status = supportedStatuses.has(snapshot.status)
    ? snapshot.status
    : "disconnected";

  return {
    status,
    message: String(snapshot.message || ""),
    organizations: Array.isArray(snapshot.organizations)
      ? snapshot.organizations
      : [],
    projects: Array.isArray(snapshot.projects) ? snapshot.projects : [],
    project:
      snapshot.project && typeof snapshot.project === "object"
        ? snapshot.project
        : null,
  };
}

function chooseProjectRef(snapshot, currentRef) {
  if (
    currentRef &&
    snapshot.projects.some((project) => project.reference === currentRef)
  ) {
    return currentRef;
  }
  return snapshot.projects[0]?.reference || "";
}

function safeErrorMessage(error) {
  const message =
    typeof error === "string"
      ? error
      : error?.message || "Supabase connection failed.";
  return String(message).slice(0, 700);
}
