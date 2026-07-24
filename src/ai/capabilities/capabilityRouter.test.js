import { getCapabilityRouteDecision } from "./capabilityRouter";
import { getDirectWorkflowHandoffRouteDecision } from "./directWorkflowHandoff";

const OPEN_PROJECT = {
  projectOpen: true,
  emptyProjectFolder: false,
};

const HAJJ_COMPANION_INSPECTION_PROMPT = `Inspect this existing Hajj Companion project without changing any files.

Identify:
1. Which files define the Hajj stages and checklist items.
2. How checked items and stage completion are currently stored.
3. Whether progress uses React state, localStorage, or another method.
4. What user/profile or form data already exists.
5. The exact data structure that should be saved per signed-in user in Supabase.

Do not edit, create, or delete anything. Report the relevant file paths and current data structure only.`;

describe("capability routing priority", () => {
  test("keeps the original Hajj Companion prompt in read-only project inspection", () => {
    const decision = getCapabilityRouteDecision(
      HAJJ_COMPANION_INSPECTION_PROMPT,
      OPEN_PROJECT,
    );

    expect(decision).toEqual({
      kind: "project_inspection",
      confidence: "high",
      source: "capability_router_explicit_project_inspection",
    });
    expect(decision.serviceTrigger).toBeUndefined();
    expect(
      getDirectWorkflowHandoffRouteDecision({ promptTask: decision }),
    ).toBeNull();
  });

  test.each([
    "Inspect the Supabase client implementation without changing files",
    "Explain our GitHub publishing code without editing anything",
    "Inspect the Stripe integration without changing files",
    "Review the deployment configuration without changing files",
    "Audit the OpenAI client implementation without changing files",
  ])("prioritizes explicit project inspection over service wording: %s", (prompt) => {
    expect(getCapabilityRouteDecision(prompt, OPEN_PROJECT)).toMatchObject({
      kind: "project_inspection",
      confidence: "high",
    });
  });

  test.each([
    ["Open Services and check Supabase setup", "supabase_service"],
    ["Connect this project to Supabase", "supabase_service"],
    ["Could you open Services and review Supabase setup?", "supabase_service"],
    ["Can you check Supabase setup and explain the findings?", "supabase_service"],
    ["Explain the setup, then connect this project to Supabase", "supabase_service"],
    ["Open Services and configure Stripe payments", "stripe_service"],
    ["Open Services and configure OpenAI", "openai_service"],
    ["Open Services and deploy this project", "deploy_service"],
    ["Explain the deployment plan, then deploy this project", "deploy_service"],
  ])("preserves direct service routing: %s", (prompt, expectedKind) => {
    const decision = getCapabilityRouteDecision(prompt, OPEN_PROJECT);

    expect(decision).toMatchObject({
      kind: expectedKind,
    });
    expect(
      getDirectWorkflowHandoffRouteDecision({ promptTask: decision }),
    ).toMatchObject({
      action: expectedKind,
    });
  });

  test.each([
    "Inspect and fix the Supabase client implementation",
    "Identify and delete unused Supabase client files",
  ])("keeps affirmative project mutations out of read-only inspection: %s", (prompt) => {
    expect(getCapabilityRouteDecision(prompt, OPEN_PROJECT)).toMatchObject({
      kind: "project_edit",
      confidence: "high",
    });
  });

  test("keeps explanatory service language in project inspection", () => {
    expect(
      getCapabilityRouteDecision(
        "Explain how the project code connects to Supabase without editing files",
        OPEN_PROJECT,
      ),
    ).toMatchObject({
      kind: "project_inspection",
      confidence: "high",
    });
  });

  test("preserves multi-service confirmation behavior", () => {
    expect(
      getCapabilityRouteDecision(
        "Connect this project to Supabase and Stripe",
        OPEN_PROJECT,
      ),
    ).toMatchObject({
      kind: "ambiguous_service_trigger",
      serviceTrigger: {
        service: "multi_service",
      },
    });
  });

  test.each([
    "Do not open Services",
    "Do not connect Supabase",
    "Without GitHub",
  ])("does not turn negative wording into a service or inspection route: %s", (prompt) => {
    expect(getCapabilityRouteDecision(prompt, OPEN_PROJECT)).toBeNull();
  });

  test("preserves project availability and workspace mutual-exclusion guards", () => {
    const prompt = "Open Services and check Supabase setup";

    expect(
      getCapabilityRouteDecision(prompt, {
        projectOpen: false,
        emptyProjectFolder: false,
      }),
    ).toBeNull();
    expect(
      getCapabilityRouteDecision(prompt, {
        projectOpen: true,
        emptyProjectFolder: true,
      }),
    ).toBeNull();
  });
});
