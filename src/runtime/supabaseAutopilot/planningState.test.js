import {
  canStartSupabasePlanning,
  initialSupabasePlanningState,
  safePlanningError,
  supabasePlanningReducer,
} from "./planningState";

describe("Supabase planning state", () => {
  test("starts idle and enters a loading state without stale output", () => {
    expect(initialSupabasePlanningState.phase).toBe("idle");
    expect(
      supabasePlanningReducer(
        {
          phase: "success",
          plan: { old: true },
          presentation: { old: true },
          error: "",
        },
        { type: "begin" },
      ),
    ).toEqual({
      phase: "loading",
      plan: null,
      presentation: null,
      error: "",
    });
  });

  test("accepts a validated plan and its presentation", () => {
    const plan = { schemaVersion: "supabase-autopilot-plan/v1" };
    const presentation = { title: "Plan" };

    expect(
      supabasePlanningReducer(initialSupabasePlanningState, {
        type: "success",
        plan,
        presentation,
      }),
    ).toEqual({
      phase: "success",
      plan,
      presentation,
      error: "",
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
