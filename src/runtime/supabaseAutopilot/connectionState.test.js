import {
  initialSupabaseConnectionState,
  supabaseConnectionReducer,
} from "./connectionState";

const projectsSnapshot = {
  status: "choose_project",
  message: "Connected to Supabase.",
  organizations: [{ id: "org-1", slug: "team", name: "Team" }],
  projects: [
    { name: "Development", reference: "dev-ref" },
    { name: "Staging", reference: "stage-ref" },
  ],
  project: null,
};

describe("Supabase Autopilot connection state", () => {
  test("starts by checking for a securely stored session", () => {
    expect(initialSupabaseConnectionState.phase).toBe("checking");
    expect(initialSupabaseConnectionState.snapshot).toBeNull();
  });

  test("normalizes a project list and selects its first project", () => {
    const state = supabaseConnectionReducer(initialSupabaseConnectionState, {
      type: "snapshot",
      snapshot: projectsSnapshot,
    });

    expect(state.phase).toBe("choose_project");
    expect(state.selectedProjectRef).toBe("dev-ref");
    expect(state.snapshot.projects).toHaveLength(2);
  });

  test("preserves a valid project choice across a refreshed snapshot", () => {
    const chosen = {
      ...initialSupabaseConnectionState,
      selectedProjectRef: "stage-ref",
    };
    const state = supabaseConnectionReducer(chosen, {
      type: "snapshot",
      snapshot: projectsSnapshot,
    });

    expect(state.selectedProjectRef).toBe("stage-ref");
  });

  test("represents a verified read-only project without tool details", () => {
    const state = supabaseConnectionReducer(initialSupabaseConnectionState, {
      type: "snapshot",
      snapshot: {
        status: "connected_read_only",
        message: "Read-only inspection connection verified.",
        project: {
          name: "Development",
          reference: "dev-ref",
          api_url: "https://dev-ref.supabase.co",
        },
      },
    });

    expect(state.phase).toBe("connected_read_only");
    expect(state.snapshot.project.reference).toBe("dev-ref");
    expect(state.selectedProjectRef).toBe("");
  });

  test("uses a bounded safe error string", () => {
    const state = supabaseConnectionReducer(initialSupabaseConnectionState, {
      type: "error",
      error: "x".repeat(900),
    });

    expect(state.phase).toBe("error");
    expect(state.error).toHaveLength(700);
  });
});
