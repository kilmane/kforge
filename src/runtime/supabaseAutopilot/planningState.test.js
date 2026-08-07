import { fingerprintPlan } from "../../ai/supabaseAutopilot/planSchema";
import {
  canStartSupabasePlanning,
  initialSupabasePlanningState,
  safePlanningError,
  supabasePlanningReducer,
} from "./planningState";

function createReconciliation() {
  const value = {
    schemaVersion: "supabase-autopilot-reconciliation/v1",
    sourcePlanFingerprint: "fnv1a64-1111111122222222",
    selectedProject: {
      name: "Development",
      reference: "dev-ref",
    },
    proposedMigration: {
      version: "31234567890123",
      name: "supabase_autopilot_111122222222",
      identity: "supabase_autopilot_111122222222",
      status: "unused",
    },
    status: "already-satisfied",
    findings: [],
    proposedAdditiveChanges: [],
    manualReview: [],
    conflicts: [],
    warnings: [],
    limitations: [],
    sqlDraft: "",
    canApply: false,
    executionStatus: "not-applied",
    nothingAppliedStatement:
      "Planning only: nothing was applied. SQL was not executed and no database or application changes were made.",
  };
  return { ...value, fingerprint: fingerprintPlan(value) };
}

describe("Supabase planning state", () => {
  test("starts idle and enters a loading state without stale output", () => {
    expect(initialSupabasePlanningState.phase).toBe("idle");
    expect(
      supabasePlanningReducer(
        {
          phase: "success",
          plan: { old: true },
          reconciliation: { old: true },
          presentation: { old: true },
          error: "",
        },
        { type: "begin" },
      ),
    ).toEqual({
      phase: "loading",
      plan: null,
      reconciliation: null,
      presentation: null,
      error: "",
    });
  });

  test("accepts a validated plan and its presentation", () => {
    const plan = { schemaVersion: "supabase-autopilot-plan/v1" };
    const presentation = { title: "Plan" };
    const reconciliation = createReconciliation();

    expect(
      supabasePlanningReducer(initialSupabasePlanningState, {
        type: "success",
        plan,
        reconciliation,
        presentation,
      }),
    ).toEqual({
      phase: "success",
      plan,
      reconciliation,
      presentation,
      error: "",
    });
  });

  test("rejects malformed reconciliation output instead of retaining it", () => {
    expect(
      supabasePlanningReducer(initialSupabasePlanningState, {
        type: "success",
        plan: { schemaVersion: "supabase-autopilot-plan/v1" },
        reconciliation: { canApply: true },
        presentation: { title: "Plan" },
      }),
    ).toEqual({
      phase: "error",
      plan: null,
      reconciliation: null,
      presentation: null,
      error: "The planning result was malformed.",
    });
  });

  test("uses a bounded single-line safe error", () => {
    expect(safePlanningError(new Error(`unsafe\n${"x".repeat(900)}`))).toHaveLength(
      700,
    );
  });

  test("requires a verified project, open path, and objective", () => {
    const ready = {
      verifiedProject: { reference: "dev-ref" },
      projectPath: "D:\\hajj",
      objective: "Add sign-in",
    };

    expect(canStartSupabasePlanning(ready)).toBe(true);
    expect(
      canStartSupabasePlanning({ ...ready, verifiedProject: null }),
    ).toBe(false);
    expect(canStartSupabasePlanning({ ...ready, projectPath: "" })).toBe(false);
    expect(canStartSupabasePlanning({ ...ready, objective: " " })).toBe(false);
  });
});
