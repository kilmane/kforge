import {
  IMPLEMENTATION_JOB_ACTION,
  IMPLEMENTATION_JOB_STATUS,
  IMPLEMENTATION_JOB_TOOL_DECISION,
  buildImplementationJobBlockedWriteRecoveryPrompt,
  buildImplementationJobFocusedPrompt,
  buildImplementationJobInspectionPrompt,
  buildImplementationJobReadProgressionPrompt,
  createImplementationJob,
  evaluateAndRememberImplementationToolRequest,
  evaluateImplementationOperationCompletion,
  evaluateImplementationToolRequest,
  getImplementationFileFingerprint,
  getImplementationJobAllowedNextActions,
  hasCompletedPlannedImplementationOperations,
  hasCompletedPlannedImplementationWrites,
  rememberImplementationInspection,
  rememberImplementationOperationCompletion,
  rememberImplementationToolFailure,
  rememberImplementationToolResult,
  rememberImplementationWriteAttempt,
} from "./implementationJobController";

const appFingerprint = "fnv1a64-0123456789abcdef";
const nextAppFingerprint = "fnv1a64-fedcba9876543210";

function plannedOperation({
  id = "application-operation-app",
  path = "src/App.jsx",
  responsibilityIds = ["auth-ui-session", "progress-save-persistence"],
} = {}) {
  return {
    id,
    path,
    role: "react-integration",
    purpose: "Complete the approved application integration.",
    responsibilityIds,
    responsibilities: responsibilityIds.map((responsibilityId) => ({
      id: responsibilityId,
      purpose: `Implement ${responsibilityId}.`,
    })),
    status: "proposed",
  };
}

test("createImplementationJob starts with inspection as its only next action", () => {
  const job = createImplementationJob({
    originalGoal: "  Update the app  ",
  });

  expect(job.status).toBe(IMPLEMENTATION_JOB_STATUS.NEEDS_INSPECTION);
  expect(job.originalGoal).toBe("Update the app");
  expect(getImplementationJobAllowedNextActions(job)).toEqual([
    IMPLEMENTATION_JOB_ACTION.INSPECT_LIKELY_FILE,
  ]);
});

test("createImplementationJob normalizes inspected paths and allows a write proposal", () => {
  const job = createImplementationJob({
    inspectedPaths: [
      " src\\App.jsx ",
      "./src/App.jsx",
      "src/App.css",
      "",
    ],
  });

  expect(job.inspectedPaths).toEqual(["src/App.jsx", "src/App.css"]);
  expect(getImplementationJobAllowedNextActions(job)).toEqual([
    IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
    IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
    IMPLEMENTATION_JOB_ACTION.STOP,
  ]);
});

test("implementation job blocks writes outside its explicit allowed paths", () => {
  const job = createImplementationJob({
    inspectedPaths: ["src/App.jsx"],
    allowedWritePaths: [
      " src\\App.jsx ",
      "./src/lib/data.js",
      "src/App.jsx",
    ],
  });

  expect(job.allowedWritePaths).toEqual([
    "src/App.jsx",
    "src/lib/data.js",
  ]);

  const allowed = evaluateImplementationToolRequest(
    job,
    {
      name: "write_file",
      args: { path: "src/App.jsx", content: "complete file text" },
    },
    { requireInspectionBeforeWrite: true },
  );

  const blocked = evaluateImplementationToolRequest(
    job,
    {
      name: "write_file",
      args: { path: "src/Other.jsx", content: "complete file text" },
    },
    { requireInspectionBeforeWrite: true },
  );

  expect(allowed.ok).toBe(true);
  expect(blocked.ok).toBe(false);
  expect(blocked.decision).toBe(
    IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_UNPLANNED_WRITE_PATH,
  );
  expect(blocked.error).toMatch(/outside the approved implementation paths/i);
});
test("rememberImplementationInspection records one normalized path without duplicates", () => {
  const initialJob = createImplementationJob({
    originalGoal: "Change the heading",
  });

  const inspectedJob = rememberImplementationInspection(
    initialJob,
    " ./src/App.jsx ",
  );

  const repeatedJob = rememberImplementationInspection(
    inspectedJob,
    "src\\App.jsx",
  );

  expect(inspectedJob.status).toBe(
    IMPLEMENTATION_JOB_STATUS.INSPECTION_COMPLETE,
  );
  expect(repeatedJob.inspectedPaths).toEqual(["src/App.jsx"]);
  expect(getImplementationJobAllowedNextActions(repeatedJob)).toEqual([
    IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
    IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
    IMPLEMENTATION_JOB_ACTION.STOP,
  ]);
});

test("evaluateImplementationToolRequest blocks a repeated read", () => {
  const job = createImplementationJob({
    inspectedPaths: ["src/App.jsx"],
  });

  const decision = evaluateImplementationToolRequest(job, {
    name: "read_file",
    args: { path: "./src/App.jsx" },
  });

  expect(decision.decision).toBe(
    IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_REPEATED_READ,
  );
  expect(decision.ok).toBe(false);
  expect(decision.path).toBe("src/App.jsx");
  expect(decision.allowedNextActions).toEqual([
    IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
    IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
    IMPLEMENTATION_JOB_ACTION.STOP,
  ]);
});

test("evaluateImplementationToolRequest blocks a write before inspection", () => {
  const job = createImplementationJob({
    originalGoal: "Update the home screen",
  });

  const decision = evaluateImplementationToolRequest(
    job,
    {
      name: "write_file",
      args: {
        path: "src/App.jsx",
        content: "complete file text",
      },
    },
    {
      requireInspectionBeforeWrite: true,
    },
  );

  expect(decision.decision).toBe(
    IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_UNSAFE_WRITE_WITHOUT_INSPECTION,
  );
  expect(decision.ok).toBe(false);
  expect(decision.allowedNextActions).toEqual([
    IMPLEMENTATION_JOB_ACTION.INSPECT_LIKELY_FILE,
    IMPLEMENTATION_JOB_ACTION.STOP,
  ]);
});

test("evaluateImplementationToolRequest allows one pending-target refresh after intervening inspections", () => {
  const job = createImplementationJob({
    allowedWritePaths: ["src/App.jsx"],
    plannedOperations: [plannedOperation()],
    inspectedPaths: [
      "src/App.jsx",
      "src/lib/supabase.js",
      "src/lib/queries.js",
    ],
    inspectionHistory: [
      {
        callId: "call-0001",
        path: "src/App.jsx",
        fingerprint: appFingerprint,
        sequence: 1,
      },
      {
        callId: "call-0002",
        path: "src/lib/supabase.js",
        fingerprint: "fnv1a64-1111111111111111",
        sequence: 2,
      },
      {
        callId: "call-0003",
        path: "src/lib/queries.js",
        fingerprint: "fnv1a64-2222222222222222",
        sequence: 3,
      },
    ],
  });

  const decision = evaluateImplementationToolRequest(job, {
    name: "read_file",
    args: { path: "src/App.jsx" },
  });

  expect(decision).toEqual(
    expect.objectContaining({
      decision: IMPLEMENTATION_JOB_TOOL_DECISION.ALLOW,
      ok: true,
      path: "src/App.jsx",
      refreshInspection: true,
    }),
  );
});

test("evaluateImplementationToolRequest bounds pending-target refreshes per mutation epoch", () => {
  const job = createImplementationJob({
    allowedWritePaths: ["src/App.jsx"],
    plannedOperations: [plannedOperation()],
    inspectedPaths: ["src/App.jsx", "src/lib/supabase.js"],
    inspectionHistory: [
      {
        callId: "call-0001",
        path: "src/App.jsx",
        fingerprint: appFingerprint,
        sequence: 1,
      },
      {
        callId: "call-0002",
        path: "src/lib/supabase.js",
        fingerprint: "fnv1a64-1111111111111111",
        sequence: 2,
      },
      {
        callId: "call-0003",
        path: "src/App.jsx",
        fingerprint: nextAppFingerprint,
        sequence: 3,
      },
      {
        callId: "call-0004",
        path: "src/lib/supabase.js",
        fingerprint: "fnv1a64-2222222222222222",
        sequence: 4,
      },
    ],
  });

  const decision = evaluateImplementationToolRequest(job, {
    name: "read_file",
    args: { path: "src/App.jsx" },
  });

  expect(decision.decision).toBe(
    IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_REPEATED_READ,
  );
  expect(decision.ok).toBe(false);
});

test("evaluateImplementationToolRequest blocks a repeated write to a completed approved path", () => {
  const operation = plannedOperation();
  const job = createImplementationJob({
    inspectedPaths: ["src/App.jsx"],
    allowedWritePaths: ["src/App.jsx", "src/Other.jsx"],
    plannedOperations: [operation, plannedOperation({
      id: "application-operation-other",
      path: "src/Other.jsx",
      responsibilityIds: ["feature-data-access"],
    })],
    completedOperationIds: [operation.id],
  });

  const decision = evaluateImplementationToolRequest(job, {
    name: "write_file",
    args: {
      path: "src/App.jsx",
      content: "complete file text",
    },
  });

  expect(decision.decision).toBe(
    IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_COMPLETED_WRITE_PATH,
  );
  expect(decision.ok).toBe(false);
  expect(decision.error).toMatch(/operation is already complete/i);
});

test("evaluateAndRememberImplementationToolRequest records a blocked repeated read", () => {
  const job = createImplementationJob({
    inspectedPaths: ["src/App.jsx"],
  });

  const outcome = evaluateAndRememberImplementationToolRequest(
    job,
    {
      name: "read_file",
      args: { path: "./src/App.jsx" },
    },
    {
      blockRepeatedReads: true,
      requireInspectionBeforeWrite: true,
    },
  );

  expect(outcome.decision.decision).toBe(
    IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_REPEATED_READ,
  );
  expect(outcome.decision.ok).toBe(false);
  expect(outcome.job.status).toBe(
    IMPLEMENTATION_JOB_STATUS.NEEDS_RECOVERY,
  );
  expect(outcome.job.failedTools).toHaveLength(1);
  expect(outcome.job.failedTools[0]).toMatchObject({
    toolName: "read_file",
    path: "src/App.jsx",
    ok: false,
  });
  expect(outcome.job.failedTools[0].error).toContain(
    "blocked a repeated read",
  );
});

test("evaluateAndRememberImplementationToolRequest records a blocked blind write", () => {
  const job = createImplementationJob({
    originalGoal: "Update the app",
  });

  const outcome = evaluateAndRememberImplementationToolRequest(
    job,
    {
      name: "write_file",
      args: {
        path: "src/App.jsx",
        content: "complete file text",
      },
    },
    {
      requireInspectionBeforeWrite: true,
    },
  );

  expect(outcome.decision.decision).toBe(
    IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_UNSAFE_WRITE_WITHOUT_INSPECTION,
  );
  expect(outcome.decision.ok).toBe(false);
  expect(outcome.job.status).toBe(
    IMPLEMENTATION_JOB_STATUS.NEEDS_RECOVERY,
  );
  expect(outcome.job.failedTools).toHaveLength(1);
  expect(outcome.job.failedTools[0]).toMatchObject({
    toolName: "write_file",
    path: "src/App.jsx",
    ok: false,
    error:
      "KForge blocked a write request before any relevant file was inspected for this implementation job.",
  });
});

test("evaluateAndRememberImplementationToolRequest leaves an allowed request unfailed", () => {
  const job = createImplementationJob({
    inspectedPaths: ["src/App.jsx"],
  });

  const outcome = evaluateAndRememberImplementationToolRequest(
    job,
    {
      name: "write_file",
      args: {
        path: "src/App.jsx",
        content: "complete file text",
      },
    },
    {
      requireInspectionBeforeWrite: true,
    },
  );

  expect(outcome.decision.decision).toBe(
    IMPLEMENTATION_JOB_TOOL_DECISION.ALLOW,
  );
  expect(outcome.decision.ok).toBe(true);
  expect(outcome.job.failedTools).toEqual([]);
  expect(outcome.job.allowedNextActions).toEqual([
    IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
    IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
    IMPLEMENTATION_JOB_ACTION.STOP,
  ]);
});

test("rememberImplementationWriteAttempt records a successful write", () => {
  const job = createImplementationJob({
    inspectedPaths: ["src/App.jsx"],
  });

  const nextJob = rememberImplementationWriteAttempt(
    job,
    {
      name: "write_file",
      args: { path: "src/App.jsx" },
    },
    {
      ok: true,
      callId: "controlled-call-1",
      sequence: 1,
    },
  );

  expect(nextJob.status).toBe(IMPLEMENTATION_JOB_STATUS.WRITE_SUCCEEDED);
  expect(nextJob.attemptedWrites).toEqual(["src/App.jsx"]);
  expect(nextJob.successfulWrites).toEqual(["src/App.jsx"]);
  expect(nextJob.successfulMutations).toEqual([
    {
      callId: "controlled-call-1",
      toolName: "write_file",
      path: "src/App.jsx",
      sequence: 1,
    },
  ]);
  expect(nextJob.blockedWrites).toEqual([]);
  expect(nextJob.allowedNextActions).toEqual([
    IMPLEMENTATION_JOB_ACTION.RESTORE_LAST_SNAPSHOT,
    IMPLEMENTATION_JOB_ACTION.STOP,
  ]);
});

test("successful path mutations do not complete planned implementation operations", () => {
  const firstOperation = plannedOperation({
    id: "application-operation-client",
    path: "src/lib/supabase.js",
    responsibilityIds: ["supabase-client-boundary"],
  });
  const appOperation = plannedOperation();
  const job = createImplementationJob({
    allowedWritePaths: ["src/lib/supabase.js", "src/App.jsx"],
    plannedOperations: [firstOperation, appOperation],
    successfulWrites: ["src/lib/supabase.js"],
    successfulMutations: [
      {
        callId: "controlled-call-1",
        toolName: "replace_text",
        path: "src/lib/supabase.js",
        sequence: 1,
      },
    ],
  });

  expect(hasCompletedPlannedImplementationOperations(job)).toBe(false);
  expect(hasCompletedPlannedImplementationWrites(job)).toBe(false);
});

test("the objective completes only when every planned operation ID is completed", () => {
  const firstOperation = plannedOperation({
    id: "application-operation-client",
    path: "src/lib/supabase.js",
    responsibilityIds: ["supabase-client-boundary"],
  });
  const appOperation = plannedOperation();
  const job = createImplementationJob({
    allowedWritePaths: ["src/lib/supabase.js", "src/App.jsx"],
    plannedOperations: [firstOperation, appOperation],
    successfulWrites: ["src\\lib\\supabase.js", "./src/App.jsx"],
    completedOperationIds: [firstOperation.id],
  });

  expect(hasCompletedPlannedImplementationOperations(job)).toBe(false);
  expect(
    hasCompletedPlannedImplementationOperations({
      ...job,
      completedOperationIds: [firstOperation.id, appOperation.id],
    }),
  ).toBe(true);
});

test("rememberImplementationWriteAttempt records a blocked write", () => {
  const job = createImplementationJob({
    inspectedPaths: ["src/App.jsx"],
  });

  const nextJob = rememberImplementationWriteAttempt(
    job,
    {
      name: "write_file",
      args: { path: "src/App.jsx" },
    },
    {
      ok: false,
      error: "Destructive rewrite blocked.",
    },
  );

  expect(nextJob.status).toBe(IMPLEMENTATION_JOB_STATUS.WRITE_BLOCKED);
  expect(nextJob.attemptedWrites).toEqual(["src/App.jsx"]);
  expect(nextJob.blockedWrites).toEqual(["src/App.jsx"]);
  expect(nextJob.successfulWrites).toEqual([]);
  expect(nextJob.allowedNextActions).toEqual([
    IMPLEMENTATION_JOB_ACTION.RETRY_WITH_EVIDENCE,
    IMPLEMENTATION_JOB_ACTION.SHOW_BLOCKED_REASON,
    IMPLEMENTATION_JOB_ACTION.STOP,
  ]);
});

test("rememberImplementationToolFailure exposes safe recovery actions", () => {
  const job = createImplementationJob({
    inspectedPaths: ["src/App.jsx"],
  });

  const nextJob = rememberImplementationToolFailure(
    job,
    {
      name: "read_file",
      args: { path: "src/App.css" },
    },
    "Unable to read file.",
  );

  expect(nextJob.status).toBe(IMPLEMENTATION_JOB_STATUS.NEEDS_RECOVERY);
  expect(nextJob.failedTools).toHaveLength(1);
  expect(nextJob.failedTools[0]).toMatchObject({
    toolName: "read_file",
    path: "src/App.css",
    ok: false,
    error: "Unable to read file.",
  });
  expect(nextJob.allowedNextActions).toEqual([
    IMPLEMENTATION_JOB_ACTION.RETRY_WITH_EVIDENCE,
    IMPLEMENTATION_JOB_ACTION.SWITCH_MODEL,
    IMPLEMENTATION_JOB_ACTION.STOP,
  ]);
});

test("rememberImplementationToolResult records a successful inspection", () => {
  const job = createImplementationJob({
    originalGoal: "Update the app",
  });

  const nextJob = rememberImplementationToolResult(
    job,
    {
      name: "read_file",
      args: { path: "./src/App.jsx" },
    },
    {
      ok: true,
      result: "file contents",
    },
  );

  expect(nextJob.status).toBe(
    IMPLEMENTATION_JOB_STATUS.INSPECTION_COMPLETE,
  );
  expect(nextJob.inspectedPaths).toEqual(["src/App.jsx"]);
  expect(nextJob.allowedNextActions).toEqual([
    IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
    IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
    IMPLEMENTATION_JOB_ACTION.STOP,
  ]);
});

test("successful reusable-boundary inspection records bounded static export names only", () => {
  const source = `
    export async function signInWithEmail(email, password) {}
    export function signOut() {}
    export const loadUserProgress = async (userId) => ({ userId });
    const save = async () => true;
    export { save as saveUserProgress };
    export const API_SECRET = "service-role-secret-value";
    const privateRows = [{ private: true }];
  `;
  const job = createImplementationJob({
    reusableCapabilities: [
      {
        path: "src/lib/supabase.js",
        capabilities: ["auth-session", "data-access"],
      },
    ],
  });
  const nextJob = rememberImplementationToolResult(
    job,
    { name: "read_file", args: { path: "src/lib/supabase.js" } },
    {
      ok: true,
      result:
        `Read file\nFile fingerprint: ${appFingerprint}\n\n` +
        `--- File contents ---\n${source}`,
    },
  );

  expect(nextJob.reusableCapabilities).toEqual([
    {
      path: "src/lib/supabase.js",
      capabilities: ["auth-session", "data-access"],
      exportedSymbols: [
        "loadUserProgress",
        "saveUserProgress",
        "signInWithEmail",
        "signOut",
      ],
    },
  ]);
  const durableEvidence = JSON.stringify(nextJob.reusableCapabilities);
  expect(durableEvidence).not.toContain("service-role-secret-value");
  expect(durableEvidence).not.toContain("privateRows");
  expect(durableEvidence).not.toContain("function signInWithEmail");
});

test("reusable exported-symbol evidence is identifier-only and bounded", () => {
  const exportedSymbols = Array.from(
    { length: 50 },
    (_, index) => `helper${String(index).padStart(2, "0")}`,
  );
  const job = createImplementationJob({
    reusableCapabilities: [
      {
        path: "src/lib/helpers.js",
        capabilities: ["data-access"],
        exportedSymbols: [
          ...exportedSymbols,
          "not-valid()",
          "x".repeat(81),
        ],
      },
    ],
  });

  expect(job.reusableCapabilities[0].exportedSymbols).toHaveLength(40);
  expect(job.reusableCapabilities[0].exportedSymbols).not.toContain(
    "not-valid()",
  );
  expect(job.reusableCapabilities[0].exportedSymbols).not.toContain(
    "x".repeat(81),
  );
});

test("rememberImplementationToolResult records a successful directory inspection", () => {
  const job = createImplementationJob();

  const nextJob = rememberImplementationToolResult(
    job,
    {
      name: "list_dir",
      args: { dirPath: "./src/components" },
    },
    {
      ok: true,
      result: "AppCard.jsx",
    },
  );

  expect(nextJob.inspectedPaths).toEqual(["src/components"]);
  expect(nextJob.status).toBe(
    IMPLEMENTATION_JOB_STATUS.INSPECTION_COMPLETE,
  );
});

test("rememberImplementationToolResult records successful and blocked writes", () => {
  const job = createImplementationJob({
    inspectedPaths: ["src/App.jsx"],
  });

  const successfulJob = rememberImplementationToolResult(
    job,
    {
      name: "write_file",
      args: { path: "src/App.jsx" },
    },
    {
      ok: true,
    },
  );

  const blockedJob = rememberImplementationToolResult(
    job,
    {
      name: "write_file",
      args: { path: "src/App.jsx" },
    },
    {
      ok: false,
      error: "Write blocked.",
    },
  );

  expect(successfulJob.status).toBe(
    IMPLEMENTATION_JOB_STATUS.WRITE_SUCCEEDED,
  );
  expect(successfulJob.successfulWrites).toEqual(["src/App.jsx"]);

  expect(blockedJob.status).toBe(
    IMPLEMENTATION_JOB_STATUS.WRITE_BLOCKED,
  );
  expect(blockedJob.blockedWrites).toEqual(["src/App.jsx"]);
});

test("rememberImplementationToolResult records a failed non-write tool", () => {
  const job = createImplementationJob({
    inspectedPaths: ["src/App.jsx"],
  });

  const nextJob = rememberImplementationToolResult(
    job,
    {
      name: "search_in_file",
      args: {
        path: "src/App.jsx",
        query: "missing text",
      },
    },
    {
      ok: false,
      error: "Search failed.",
    },
  );

  expect(nextJob.status).toBe(
    IMPLEMENTATION_JOB_STATUS.NEEDS_RECOVERY,
  );
  expect(nextJob.failedTools).toHaveLength(1);
  expect(nextJob.failedTools[0]).toMatchObject({
    toolName: "search_in_file",
    path: "src/App.jsx",
    ok: false,
    error: "Search failed.",
  });
});

test("buildImplementationJobInspectionPrompt preserves edit and fix guidance", () => {
  const editPrompt = buildImplementationJobInspectionPrompt({
    originalGoal: "Update the introduction",
  });

  const fixPrompt = buildImplementationJobInspectionPrompt(
    {
      originalGoal: "Repair the form",
    },
    "",
    {
      isFix: true,
    },
  );

  expect(editPrompt).toContain("Inspect before editing.");
  expect(editPrompt).toContain("Original request: Update the introduction");
  expect(editPrompt).toContain(
    "Request exactly one inspection tool call next",
  );
  expect(editPrompt).toContain("smallest safe edit");

  expect(fixPrompt).toContain("Inspect before fixing.");
  expect(fixPrompt).toContain("Original request: Repair the form");
  expect(fixPrompt).toContain("smallest safe fix");
});

test("buildImplementationJobBlockedWriteRecoveryPrompt uses normalized evidence", () => {
  const prompt = buildImplementationJobBlockedWriteRecoveryPrompt(
    {
      originalGoal: "Add a reset button",
      blockedWrites: ["src\\App.jsx"],
    },
    "",
    {
      blockedReason: "The proposed file was incomplete.",
    },
  );

  expect(prompt).toContain("Recover from the blocked file write.");
  expect(prompt).toContain("Original request: Add a reset button");
  expect(prompt).toContain("Blocked write target: src/App.jsx");
  expect(prompt).toContain(
    "Blocked write reason:\nThe proposed file was incomplete.",
  );
  expect(prompt).toContain("complete full current file text");
  expect(prompt).toContain("Preserve the existing app structure");
  expect(prompt).toContain(
    "Correct the specific blocked reason rather than retrying the same unsafe implementation shape.",
  );
  expect(prompt).not.toContain("For a reset-button request");
});

test("buildImplementationJobFocusedPrompt steers writes to still-pending approved paths", () => {
  const completedOperation = plannedOperation({
    id: "application-operation-other",
    path: "src/Other.jsx",
    responsibilityIds: ["feature-data-access"],
  });
  const prompt = buildImplementationJobFocusedPrompt({
    originalGoal: "Add sign-in and save progress",
    inspectedPaths: [
      "src/App.jsx",
      "src/lib/supabase.js",
      "src/Other.jsx",
    ],
    allowedWritePaths: [
      "src/App.jsx",
      "src/Other.jsx",
    ],
    plannedOperations: [plannedOperation(), completedOperation],
    completedOperationIds: [completedOperation.id],
    successfulWrites: [
      "src/Other.jsx",
    ],
  });

  expect(prompt).toContain(
    "Approved application write paths: src/App.jsx, src/Other.jsx",
  );
  expect(prompt).toContain(
    "Completed operation IDs: application-operation-other",
  );
  expect(prompt).toContain(
    "Pending operation paths: src/App.jsx",
  );
  expect(prompt).toContain(
    "Supporting inspected files are evidence only and are not write targets unless they are listed as pending approved writes.",
  );
  expect(prompt).toContain(
    "Any write_file request must target an approved path with a pending operation",
  );
  expect(prompt).toContain(
    "include the recorded expectedFileFingerprint when overwriting an existing inspected file",
  );
  expect(prompt).toContain(
    "One bounded read_file refresh of an active pending target is allowed after successful inspections of other files",
  );
  expect(prompt).toContain(
    "Do not simplify, reimagine, or replace the application with a smaller app.",
  );
});

test("buildImplementationJobFocusedPrompt exposes reusable helpers and exact mutation rules", () => {
  const prompt = buildImplementationJobFocusedPrompt({
    originalGoal: "Add sign-in and save progress",
    inspectedPaths: ["src/App.jsx", "src/lib/supabase.js"],
    allowedWritePaths: ["src/App.jsx"],
    reusableCapabilities: [
      {
        path: "src/lib/supabase.js",
        capabilities: ["supabase-client", "auth-session", "data-access"],
        exportedSymbols: [
          "getCurrentUser",
          "loadUserProgress",
          "saveUserProgress",
          "signInWithEmail",
          "signOut",
          "signUpWithEmail",
        ],
      },
    ],
    supabaseAppWiringContract: [
      {
        table: "public.user_progress",
        ownerColumn: "user_id",
        primaryKeys: ["id"],
        columns: [
          { name: "id", dataType: "uuid", nullable: false, unique: true },
          {
            name: "user_id",
            dataType: "uuid",
            nullable: false,
            unique: false,
          },
          {
            name: "data",
            dataType: "jsonb",
            nullable: false,
            unique: false,
          },
        ],
      },
    ],
  });

  expect(prompt).toContain("Existing reusable Supabase capability evidence:");
  expect(prompt).toContain(
    "src/lib/supabase.js: auth-session, data-access, supabase-client",
  );
  expect(prompt).toContain(
    "Available inspected helper exports: getCurrentUser, loadUserProgress, saveUserProgress, signInWithEmail, signOut, signUpWithEmail",
  );
  expect(prompt).toContain(
    "Reuse its existing exported helpers and boundaries; do not duplicate them with direct Supabase calls",
  );
  expect(prompt).toContain("Table public.user_progress:");
  expect(prompt).toContain(
    "Every insert/upsert object must explicitly supply these NOT NULL fields: id, user_id, data.",
  );
  expect(prompt).toContain("User ownership field: user_id.");
  expect(prompt).toContain("Structured JSON payload field(s): data.");
});

test("buildImplementationJobReadProgressionPrompt keeps pending controlled work active after a safe read", () => {
  const prompt = buildImplementationJobReadProgressionPrompt({
    originalGoal: "Add sign-in and save progress",
    inspectedPaths: ["src/App.jsx"],
    allowedWritePaths: ["src/App.jsx"],
    successfulWrites: [],
  });

  expect(prompt).toContain("the last read-only evidence request succeeded");
  expect(prompt).toContain(
    "do not ask the user to continue harmless inspection manually",
  );
  expect(prompt).toContain("Pending operation paths: src/App.jsx");
});
test("buildImplementationJobFocusedPrompt includes existing inspection evidence", () => {
  const prompt = buildImplementationJobFocusedPrompt({
    originalGoal: "Change the main heading",
    continuationContext:
      "Use only public.user_progress with columns id, user_id, and data.",
    inspectedPaths: ["src/App.jsx", "src/App.css"],
  });

  expect(prompt).toContain(
    "Continue the active KForge implementation job.",
  );
  expect(prompt).toContain("Original request: Change the main heading");
  expect(prompt).toContain("Implementation constraints that remain authoritative:");
  expect(prompt).toContain(
    "Use only public.user_progress with columns id, user_id, and data.",
  );
  expect(prompt).toContain(
    "Already inspected paths: src/App.jsx, src/App.css",
  );
  expect(prompt).toContain("Do not repeat broad inspection.");
  expect(prompt).toContain("one write_file tool");
  expect(prompt).toContain("one different clearly relevant text file");
});

test("successful file inspection records a durable targeted-edit fingerprint", () => {
  const job = rememberImplementationToolResult(
    createImplementationJob({ allowedWritePaths: ["src/App.jsx"] }),
    { name: "read_file", args: { path: "src/App.jsx" } },
    {
      ok: true,
      result:
        `Read 123 bytes (Path: D:/project/src/App.jsx)\n` +
        `File fingerprint: ${appFingerprint}\n\n--- File contents ---\nsource`,
    },
  );

  expect(getImplementationFileFingerprint(job, "src/App.jsx")).toBe(
    appFingerprint,
  );
  expect(buildImplementationJobFocusedPrompt(job)).toContain(
    `src/App.jsx: ${appFingerprint}`,
  );
});

test("replace_text requires the exact approved inspected target fingerprint", () => {
  const job = createImplementationJob({
    inspectedPaths: ["src/App.jsx"],
    inspectedFileFingerprints: [
      { path: "src/App.jsx", fingerprint: appFingerprint },
    ],
    allowedWritePaths: ["src/App.jsx"],
  });
  const baseCall = {
    name: "replace_text",
    args: {
      path: "src/App.jsx",
      expectedFileFingerprint: appFingerprint,
      oldText: "old",
      newText: "new",
    },
  };

  expect(
    evaluateImplementationToolRequest(job, baseCall, {
      requireInspectionBeforeWrite: true,
    }).ok,
  ).toBe(true);
  expect(
    evaluateImplementationToolRequest(
      job,
      {
        ...baseCall,
        args: { ...baseCall.args, path: "src/Other.jsx" },
      },
      { requireInspectionBeforeWrite: true },
    ).ok,
  ).toBe(false);
  expect(
    evaluateImplementationToolRequest(
      job,
      {
        ...baseCall,
        args: {
          ...baseCall.args,
          expectedFileFingerprint: "fnv1a64-fedcba9876543210",
        },
      },
      { requireInspectionBeforeWrite: true },
    ).ok,
  ).toBe(false);
});

test("write_file cannot overwrite an inspected target with missing or stale fingerprint evidence", () => {
  const job = createImplementationJob({
    inspectedPaths: ["src/App.jsx", "src/lib/helper.js"],
    inspectedFileFingerprints: [
      { path: "src/App.jsx", fingerprint: appFingerprint },
      {
        path: "src/lib/helper.js",
        fingerprint: "fnv1a64-fedcba9876543210",
      },
    ],
    allowedWritePaths: ["src/App.jsx"],
  });

  for (const expectedFileFingerprint of [
    "",
    "fnv1a64-fedcba9876543210",
  ]) {
    const decision = evaluateImplementationToolRequest(
      job,
      {
        name: "write_file",
        args: {
          path: "src/App.jsx",
          content: "complete source",
          expectedFileFingerprint,
        },
      },
      { requireInspectionBeforeWrite: true },
    );
    expect(decision.ok).toBe(false);
    expect(decision.error).toMatch(/exact recorded fingerprint/i);
  }

  expect(
    evaluateImplementationToolRequest(
      job,
      {
        name: "write_file",
        args: {
          path: "src/App.jsx",
          content: "complete source",
          expectedFileFingerprint: appFingerprint,
        },
      },
      { requireInspectionBeforeWrite: true },
    ).ok,
  ).toBe(true);
});

test("replace_text cannot target an uninspected approved path", () => {
  const decision = evaluateImplementationToolRequest(
    createImplementationJob({
      inspectedPaths: ["src/lib/helper.js"],
      inspectedFileFingerprints: [
        { path: "src/lib/helper.js", fingerprint: appFingerprint },
      ],
      allowedWritePaths: ["src/App.jsx"],
    }),
    {
      name: "replace_text",
      args: {
        path: "src/App.jsx",
        expectedFileFingerprint: appFingerprint,
        oldText: "old",
        newText: "new",
      },
    },
    { requireInspectionBeforeWrite: true },
  );

  expect(decision.ok).toBe(false);
  expect(decision.error).toMatch(/target file.*inspected/i);
});

test("one successful replace_text records a correlated mutation but remains pending", () => {
  const operation = plannedOperation();
  const next = rememberImplementationToolResult(
    createImplementationJob({
      inspectedPaths: ["src/App.jsx"],
      allowedWritePaths: ["src/App.jsx"],
      plannedOperations: [operation],
    }),
    {
      name: "replace_text",
      args: { path: "src/App.jsx" },
    },
    { ok: true, callId: "controlled-call-1", sequence: 1 },
  );

  expect(next.successfulWrites).toEqual(["src/App.jsx"]);
  expect(next.successfulMutations).toEqual([
    {
      callId: "controlled-call-1",
      toolName: "replace_text",
      path: "src/App.jsx",
      sequence: 1,
    },
  ]);
  expect(next.completedOperationIds).toEqual([]);
  expect(hasCompletedPlannedImplementationOperations(next)).toBe(false);
});

test("replace_text cannot edit a completed approved path", () => {
  const operation = plannedOperation();
  const decision = evaluateImplementationToolRequest(
    createImplementationJob({
      inspectedPaths: ["src/App.jsx"],
      inspectedFileFingerprints: [
        { path: "src/App.jsx", fingerprint: appFingerprint },
      ],
      allowedWritePaths: ["src/App.jsx"],
      plannedOperations: [operation],
      completedOperationIds: [operation.id],
    }),
    {
      name: "replace_text",
      args: {
        path: "src/App.jsx",
        expectedFileFingerprint: appFingerprint,
        oldText: "old",
        newText: "new",
      },
    },
  );

  expect(decision.ok).toBe(false);
  expect(decision.decision).toBe(
    IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_COMPLETED_WRITE_PATH,
  );
});

test("another targeted edit requires a fresh post-mutation inspection and fingerprint", () => {
  const operation = plannedOperation();
  const mutated = createImplementationJob({
    inspectedPaths: ["src/App.jsx"],
    inspectedFileFingerprints: [
      { path: "src/App.jsx", fingerprint: appFingerprint },
    ],
    inspectionHistory: [
      {
        callId: "controlled-call-1",
        path: "src/App.jsx",
        fingerprint: appFingerprint,
        sequence: 1,
      },
    ],
    allowedWritePaths: ["src/App.jsx"],
    plannedOperations: [operation],
    successfulMutations: [
      {
        callId: "controlled-call-2",
        toolName: "replace_text",
        path: "src/App.jsx",
        sequence: 2,
      },
    ],
  });
  const targetedEdit = (fingerprint) => ({
    name: "replace_text",
    args: {
      path: "src/App.jsx",
      expectedFileFingerprint: fingerprint,
      oldText: "old",
      newText: "new",
    },
  });

  expect(evaluateImplementationToolRequest(mutated, targetedEdit(appFingerprint)).ok)
    .toBe(false);
  expect(
    evaluateImplementationToolRequest(mutated, {
      name: "read_file",
      args: { path: "src/App.jsx" },
    }).ok,
  ).toBe(true);

  const reinspected = rememberImplementationInspection(
    mutated,
    "src/App.jsx",
    nextAppFingerprint,
    { callId: "controlled-call-3", sequence: 3 },
  );
  expect(
    evaluateImplementationToolRequest(reinspected, targetedEdit(appFingerprint))
      .decision,
  ).toBe(
    IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_INSPECTION_FINGERPRINT_MISMATCH,
  );
  expect(
    evaluateImplementationToolRequest(
      reinspected,
      targetedEdit(nextAppFingerprint),
    ).ok,
  ).toBe(true);
});

test("an authorized path missing structured operation metadata stays fail-closed", () => {
  const appOperation = plannedOperation();
  const job = createImplementationJob({
    allowedWritePaths: ["src/App.jsx", "src/Other.jsx"],
    plannedOperations: [appOperation],
    completedOperationIds: [appOperation.id],
  });

  expect(job.plannedOperations).toHaveLength(2);
  expect(job.plannedOperations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path: "src/Other.jsx",
        status: "pending",
      }),
    ]),
  );
  expect(hasCompletedPlannedImplementationOperations(job)).toBe(false);
});

test("operation completion fails closed without every responsibility or post-mutation inspection", () => {
  const operation = plannedOperation();
  const base = createImplementationJob({
    allowedWritePaths: ["src/App.jsx"],
    plannedOperations: [operation],
    successfulMutations: [
      {
        callId: "controlled-call-2",
        toolName: "replace_text",
        path: "src/App.jsx",
        sequence: 2,
      },
    ],
  });

  expect(
    evaluateImplementationOperationCompletion(base, {
      operationId: operation.id,
      satisfiedResponsibilityIds: ["auth-ui-session"],
    }).error,
  ).toMatch(/every structured responsibility/i);
  expect(
    evaluateImplementationOperationCompletion(base, {
      operationId: operation.id,
      satisfiedResponsibilityIds: [
        ...operation.responsibilityIds,
        operation.responsibilityIds[0],
      ],
    }).error,
  ).toMatch(/malformed or duplicated/i);
  expect(
    evaluateImplementationOperationCompletion(base, {
      operationId: operation.id,
      satisfiedResponsibilityIds: operation.responsibilityIds,
      note: "done",
    }).error,
  ).toMatch(/malformed or contained unsupported fields/i);
  expect(
    evaluateImplementationOperationCompletion(base, {
      operationId: operation.id,
      satisfiedResponsibilityIds: operation.responsibilityIds,
    }).error,
  ).toMatch(/re-inspected after its latest successful mutation/i);
  expect(rememberImplementationOperationCompletion(base, {
    operationId: operation.id,
    satisfiedResponsibilityIds: operation.responsibilityIds,
  }).completedOperationIds).toEqual([]);
});

test("all responsibilities plus post-mutation inspection complete the exact operation", () => {
  const operation = plannedOperation();
  const ready = createImplementationJob({
    allowedWritePaths: ["src/App.jsx"],
    plannedOperations: [operation],
    successfulMutations: [
      {
        callId: "controlled-call-2",
        toolName: "replace_text",
        path: "src/App.jsx",
        sequence: 2,
      },
    ],
    inspectionHistory: [
      {
        callId: "controlled-call-3",
        path: "src/App.jsx",
        fingerprint: nextAppFingerprint,
        sequence: 3,
      },
    ],
  });
  const completed = rememberImplementationOperationCompletion(ready, {
    operationId: operation.id,
    satisfiedResponsibilityIds: [...operation.responsibilityIds].reverse(),
  });

  expect(completed.completedOperationIds).toEqual([operation.id]);
  expect(completed.plannedOperations[0].status).toBe("completed");
  expect(hasCompletedPlannedImplementationOperations(completed)).toBe(true);
});

test("successful mutation history is bounded and rejects uncorrelated records", () => {
  const successfulMutations = Array.from({ length: 90 }, (_, index) => ({
    callId: `controlled-call-${index + 1}`,
    toolName: "replace_text",
    path: "src/App.jsx",
    sequence: index + 1,
  }));
  successfulMutations.push({
    callId: "",
    toolName: "replace_text",
    path: "src/App.jsx",
    sequence: 91,
  });

  const job = createImplementationJob({
    allowedWritePaths: ["src/App.jsx"],
    plannedOperations: [plannedOperation()],
    successfulMutations,
  });

  expect(job.successfulMutations).toHaveLength(80);
  expect(job.successfulMutations[0].sequence).toBe(11);
  expect(job.successfulMutations[79].sequence).toBe(90);
});
