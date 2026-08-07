import { validateSupabaseAutopilotReconciliation } from "../../ai/supabaseAutopilot/reconciliationSchema";

export const initialSupabasePlanningState = Object.freeze({
  phase: "idle",
  plan: null,
  reconciliation: null,
  presentation: null,
  error: "",
});

export function supabasePlanningReducer(state, action) {
  switch (action.type) {
    case "reset":
      return initialSupabasePlanningState;
    case "begin":
      return {
        phase: "loading",
        plan: null,
        reconciliation: null,
        presentation: null,
        error: "",
      };
    case "success": {
      const reconciliationValidation =
        validateSupabaseAutopilotReconciliation(action.reconciliation);
      if (
        !action.plan ||
        typeof action.plan !== "object" ||
        !action.presentation ||
        typeof action.presentation !== "object" ||
        !reconciliationValidation.valid
      ) {
        return {
          phase: "error",
          plan: null,
          reconciliation: null,
          presentation: null,
          error: "The planning result was malformed.",
        };
      }
      return {
        phase: "success",
        plan: action.plan,
        reconciliation: action.reconciliation,
        presentation: action.presentation,
        error: "",
      };
    }
    case "error":
      return {
        phase: "error",
        plan: null,
        reconciliation: null,
        presentation: null,
        error: safePlanningError(action.error),
      };
    default:
      return state;
  }
}

export function canStartSupabasePlanning({
  verifiedProject,
  projectPath,
  objective,
} = {}) {
  return Boolean(
    verifiedProject &&
      typeof verifiedProject === "object" &&
      String(verifiedProject.reference || "").trim() &&
      String(projectPath || "").trim() &&
      String(objective || "").trim(),
  );
}

export function safePlanningError(error) {
  const message =
    typeof error === "string"
      ? error
      : error?.message || "The read-only planning inspection failed.";
  return String(message).replace(/\s+/g, " ").trim().slice(0, 700);
}
