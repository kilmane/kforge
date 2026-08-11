import fs from "fs";
import path from "path";

import {
  createBlockedProjectEditWorkflowContext,
  resolvePendingProjectEditRequest,
} from "./workflowState";

const appSource = fs.readFileSync(
  path.join(__dirname, "..", "App.js"),
  "utf8",
);

const aiPanelSource = fs.readFileSync(
  path.join(__dirname, "panel", "AiPanel.jsx"),
  "utf8",
);


function getAppSourceSection(startToken, endToken) {
  const startIndex = appSource.indexOf(startToken);
  const endIndex = appSource.indexOf(endToken, startIndex);

  if (startIndex < 0 || endIndex < 0) {
    throw new Error(
      `Could not find App.js contract section: ${startToken} -> ${endToken}`,
    );
  }

  return appSource.slice(startIndex, endIndex);
}

function expectRecoveryActions(section) {
  expect(section).toContain('label: "Resume pending app-build step"');
  expect(section).toContain('"Switch model, then resume"');
  expect(section).toContain(
    "resolvePendingProjectEditRequest",
  );
  expect(section).toMatch(
    /label:\s*"Continue in test mode"[\s\S]*?\.\.\.resumeRequest\.options,[\s\S]*?forceModelCapabilityTestOverride:\s*true/,
  );
  expect(section).toContain(
    "the pending app-build step is paused, not lost",
  );
  expect(section).toContain("{ actions: [resumeAction] }");
  expect(section).toContain("buildCompletedWorkflowChangeSummary(");
  expect(section).toContain(
    "Stopped the pending app-build step. Previously written files remain in the project.",
  );
  expect(section.match(/const runPrompt = sendWithPromptRef\.current;/g)).toHaveLength(2);
  expect(section).toMatch(
    /const resumePendingAppBuildStep = \(\) => \{[\s\S]*?runPrompt\(resumeRequest\.prompt/,
  );
  expect(section).toMatch(
    /label:\s*"Continue in test mode"[\s\S]*?runPrompt\(/,
  );
  expect(section).not.toMatch(/\bsendWithPrompt\s*\(/);
}

function createPendingCssRecoveryFixture() {
  const originalGoal = "Build a polished Hajj companion.";
  const continuationPrompt =
    "Continue the controlled app-build implementation with the styling pass only.";
  const baselineSnapshots = {
    "src/App.jsx": "original app source",
    "src/App.css": "original app styles",
  };
  const inspectedPaths = ["src/App.jsx", "src/App.css"];
  const editedPaths = ["src/App.jsx"];

  const previousWorkflowContext = {
    taskKind: "project_edit",
    status: "partial_implementation",
    nextStep: "continue_implementation",
    lastUserGoal: originalGoal,
    editedPaths,
    inspectedPaths,
    appBuildBaselineSnapshots: baselineSnapshots,
    partialSummary:
      "The app-build worker wrote source, but the styling pass is still pending.",
    source: "app_build_implementation",
  };

  const pendingProjectEditRequest = {
    prompt: continuationPrompt,
    options: {
      silentUserAppend: true,
      skipCompletedWorkflowRoute: true,
      skipDirectWorkflowHandoffRoute: true,
      forceProjectEdit: true,
      forceAppBuildImplementation: true,
      inspectedPaths,
      appBuildBaselineSnapshots: baselineSnapshots,
      appBuildEditedPaths: editedPaths,
      modelToolInspectedPaths: inspectedPaths,
      modelToolOriginalGoal: originalGoal,
      lastUserGoal: originalGoal,
    },
  };

  const blockedContext = createBlockedProjectEditWorkflowContext(
    continuationPrompt,
    {
      providerId: "openai",
      modelId: "test-limited-model",
    },
    {
      previousWorkflowContext,
      pendingProjectEditRequest,
    },
  );

  return {
    originalGoal,
    baselineSnapshots,
    inspectedPaths,
    editedPaths,
    previousWorkflowContext,
    pendingProjectEditRequest,
    blockedContext,
  };
}

describe("app-build provider recovery", () => {
  test("preserves a pending CSS continuation when the model capability gate blocks it", () => {
    const {
      originalGoal,
      baselineSnapshots,
      inspectedPaths,
      editedPaths,
      previousWorkflowContext,
      pendingProjectEditRequest,
      blockedContext,
    } = createPendingCssRecoveryFixture();

    expect(blockedContext).toEqual(
      expect.objectContaining({
        lastUserGoal: originalGoal,
        editedPaths,
        inspectedPaths,
        appBuildBaselineSnapshots: baselineSnapshots,
        partialSummary: previousWorkflowContext.partialSummary,
        pendingProjectEditRequest,
      }),
    );
  });

  test("retrieves the complete pending request for a safe resume", () => {
    const { pendingProjectEditRequest, blockedContext } =
      createPendingCssRecoveryFixture();

    const resumeRequest = resolvePendingProjectEditRequest(blockedContext);

    expect(resumeRequest).toEqual(pendingProjectEditRequest);
    expect(resumeRequest).not.toBe(pendingProjectEditRequest);
    expect(resumeRequest.options).not.toBe(pendingProjectEditRequest.options);
  });

  test("the initial capability gate captures the complete request options", () => {
    const initialGateSection = getAppSourceSection(
      'if (projectEditRoute.action === "gate_model_capability_project_edit")',
      'if (projectEditRoute.action === "project_edit")',
    );

    expect(initialGateSection).toMatch(
      /previousWorkflowContext:\s*workflowContext,[\s\S]*?pendingProjectEditRequest:\s*\{[\s\S]*?prompt:\s*draft,[\s\S]*?options:\s*\{\s*\.\.\.opts\s*\}/,
    );
  });

  test("both capability-gate routes expose complete app-build recovery actions", () => {
    const followupSection = getAppSourceSection(
      'if (blockedModelPolicyRoute?.action === "blocked_model_policy_followup")',
      "if (isModelCapabilityTestOverride)",
    );
    const initialGateSection = getAppSourceSection(
      'if (projectEditRoute.action === "gate_model_capability_project_edit")',
      'if (projectEditRoute.action === "project_edit")',
    );

    expectRecoveryActions(followupSection);
    expectRecoveryActions(initialGateSection);
  });

  test("generic project edits survive a model switch and auto-resume with a Project builder", () => {
    const pendingProjectEditRequest = {
      prompt: "Implement the approved Supabase application wiring plan.",
      options: {
        forceProjectEdit: true,
        modelToolOriginalGoal: "Show existing feature records in the app.",
        modelToolAllowedWritePaths: [
          "src/lib/supabase.js",
          "src/lib/supabaseQueries.js",
          "src/App.jsx",
        ],
      },
    };

    const blockedContext = createBlockedProjectEditWorkflowContext(
      pendingProjectEditRequest.prompt,
      {
        mode: "guarded_edit",
        tier: "sandbox",
      },
      {
        pendingProjectEditRequest,
      },
    );

    expect(resolvePendingProjectEditRequest(blockedContext)).toEqual(
      pendingProjectEditRequest,
    );

    const initialGateSection = getAppSourceSection(
      'if (projectEditRoute.action === "gate_model_capability_project_edit")',
      'if (projectEditRoute.action === "project_edit")',
    );

    expect(initialGateSection).not.toMatch(
      /if \(!hasPendingAppBuildStep\) \{[\s\S]*?setWorkflowContext\(null\)/,
    );
    expect(initialGateSection).toContain(
      "KForge will automatically resume the preserved project-edit request",
    );

    expect(appSource).toMatch(
      /displayModelWorkflowPolicy\?\.capability !==[\s\S]*?MODEL_CAPABILITIES\.PROJECT_BUILDER[\s\S]*?resolvePendingProjectEditRequest\(workflowContext\)[\s\S]*?forceAppBuildImplementation === true[\s\S]*?const runPrompt = sendWithPromptRef\.current;[\s\S]*?runPrompt\(resumeRequest\.prompt, \{[\s\S]*?\.\.\.resumeRequest\.options,[\s\S]*?silentUserAppend: true/,
    );
  });
  test("Back to chat pauses pending recovery without discarding its context", () => {
    const followupSection = getAppSourceSection(
      'if (blockedModelPolicyRoute?.action === "blocked_model_policy_followup")',
      "if (isModelCapabilityTestOverride)",
    );
    const initialGateSection = getAppSourceSection(
      'if (projectEditRoute.action === "gate_model_capability_project_edit")',
      'if (projectEditRoute.action === "project_edit")',
    );

    expect(followupSection).toMatch(
      /label:\s*"Back to chat"[\s\S]*?if \(hasPendingAppBuildStep\) \{[\s\S]*?setWorkflowContext\(\{[\s\S]*?\.\.\.workflowContext,[\s\S]*?status:\s*WORKFLOW_STATUS\.WAITING_FOR_USER_RESULT,[\s\S]*?nextStep:\s*WORKFLOW_NEXT_STEP\.CONTINUE_IMPLEMENTATION/,
    );
    expect(initialGateSection).toMatch(
      /label:\s*"Back to chat"[\s\S]*?if \(hasPendingAppBuildStep\) \{[\s\S]*?setWorkflowContext\(\{[\s\S]*?\.\.\.blockedProjectEditContext,[\s\S]*?status:\s*WORKFLOW_STATUS\.WAITING_FOR_USER_RESULT,[\s\S]*?nextStep:\s*WORKFLOW_NEXT_STEP\.CONTINUE_IMPLEMENTATION/,
    );
  });
  test("controlled Supabase app wiring forwards the validated database contract", () => {
    const startIndex = aiPanelSource.indexOf(
      "const handleStartSupabaseAppWiring = useCallback",
    );
    const endIndex = aiPanelSource.indexOf(
      "const handleRequestToolOk = useCallback",
      startIndex,
    );

    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(endIndex).toBeGreaterThan(startIndex);

    const wiringSection = aiPanelSource.slice(startIndex, endIndex);

    expect(wiringSection).toContain(
      "buildSupabaseAppWiringDatabaseContract(payload?.plan)",
    );
    expect(wiringSection).toContain(
      "Approved database contract:\\n${databaseContractLines}\\n\\n",
    );
    expect(wiringSection).toContain(
      "The approved database contract above is authoritative for application wiring.",
    );
    expect(wiringSection).toContain(
      "Do not invent, rename, or substitute database objects.",
    );
    expect(wiringSection).toContain(
      "store it inside that column rather than spreading it into undeclared database columns.",
    );
    expect(wiringSection).toContain(
      "modelToolAllowedWritePaths: allowedWritePaths",
    );
    expect(wiringSection).toContain(
      "modelToolContinuationContext: supabaseAppWiringContinuationContext",
    );
  });

  test("Supabase wiring contract survives tool metadata and focused continuations", () => {
    expect(appSource).toContain(
      'const modelToolContinuationContext = String(',
    );
    expect(appSource).toContain(
      'opts.modelToolContinuationContext || ""',
    );
    expect(appSource).toContain("modelToolContinuationContext,");

    expect(aiPanelSource).toContain(
      'triggerToolMessage?.meta?.modelToolContinuationContext || ""',
    );
    expect(aiPanelSource).toContain(
      "continuationContext: triggerToolContinuationContext",
    );

    const continuationContextMatches =
      aiPanelSource.match(
        /modelToolContinuationContext:\s*implementationJob\.continuationContext/g,
      ) || [];
    const continuationPathMatches =
      aiPanelSource.match(
        /modelToolAllowedWritePaths:\s*implementationJob\.allowedWritePaths/g,
      ) || [];

    expect(continuationContextMatches).toHaveLength(3);
    expect(continuationPathMatches).toHaveLength(3);
  });
});
