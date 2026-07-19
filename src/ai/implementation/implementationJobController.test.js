import {
  IMPLEMENTATION_JOB_ACTION,
  IMPLEMENTATION_JOB_STATUS,
  IMPLEMENTATION_JOB_TOOL_DECISION,
  buildImplementationJobBlockedWriteRecoveryPrompt,
  buildImplementationJobFocusedPrompt,
  buildImplementationJobInspectionPrompt,
  createImplementationJob,
  evaluateImplementationToolRequest,
  getImplementationJobAllowedNextActions,
  rememberImplementationInspection,
  rememberImplementationToolFailure,
  rememberImplementationToolResult,
  rememberImplementationWriteAttempt,
} from "./implementationJobController";

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
    },
  );

  expect(nextJob.status).toBe(IMPLEMENTATION_JOB_STATUS.WRITE_SUCCEEDED);
  expect(nextJob.attemptedWrites).toEqual(["src/App.jsx"]);
  expect(nextJob.successfulWrites).toEqual(["src/App.jsx"]);
  expect(nextJob.blockedWrites).toEqual([]);
  expect(nextJob.allowedNextActions).toEqual([
    IMPLEMENTATION_JOB_ACTION.RESTORE_LAST_SNAPSHOT,
    IMPLEMENTATION_JOB_ACTION.STOP,
  ]);
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
});

test("buildImplementationJobFocusedPrompt includes existing inspection evidence", () => {
  const prompt = buildImplementationJobFocusedPrompt({
    originalGoal: "Change the main heading",
    inspectedPaths: ["src/App.jsx", "src/App.css"],
  });

  expect(prompt).toContain(
    "Continue the active KForge implementation job.",
  );
  expect(prompt).toContain("Original request: Change the main heading");
  expect(prompt).toContain(
    "Already inspected paths: src/App.jsx, src/App.css",
  );
  expect(prompt).toContain("Do not repeat broad inspection.");
  expect(prompt).toContain("one write_file tool");
  expect(prompt).toContain("one different clearly relevant text file");
});
