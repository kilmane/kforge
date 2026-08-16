import {
  CONTROLLED_IMPLEMENTATION_EVENT,
  CONTROLLED_RECOVERY_DIRECTIVE,
  CONTROLLED_IMPLEMENTATION_STATUS,
  beginControlledToolRequest,
  completeControlledToolRequest,
  continueControlledImplementationAfterProse,
  createControlledImplementationLifecycle,
  executeControlledImplementationTurn,
  getControlledImplementationAgentStepBudget,
  getControlledImplementationRequiredTransitionReserve,
  getControlledImplementationTransitionLimit,
  getPendingControlledWritePaths,
  isPendingControlledImplementation,
  isCanonicalControlledImplementationLifecycle,
  processControlledToolQueue,
} from "./controlledImplementationLifecycle.js";
import { buildImplementationJobBlockedWriteRecoveryPrompt } from "./implementationJobController.js";
import {
  fingerprintFileContent,
  materializeExactTextReplacement,
} from "../tools/handlers/replace_text.js";
import { TOOL_FAILURE_STAGE } from "../tools/toolRuntime.js";
import { runAgent } from "../agent/agentRunner.js";

const supabaseContract = [
  {
    table: "hajj_progress",
    ownership: "user-owned",
    ownerColumn: "user_id",
    primaryKeys: ["user_id"],
    columns: [
      { name: "user_id", dataType: "uuid", nullable: false },
      { name: "payload", dataType: "jsonb", nullable: false },
    ],
  },
];

const appOperation = {
  id: "application-operation-app",
  path: "src/App.jsx",
  role: "react-integration",
  purpose: "Complete auth and progress integration in the existing app.",
  responsibilityIds: [
    "auth-ui-session",
    "reusable-helper-integration",
    "progress-load-hydration",
    "progress-save-persistence",
  ],
  responsibilities: [
    "auth-ui-session",
    "reusable-helper-integration",
    "progress-load-hydration",
    "progress-save-persistence",
  ].map((id) => ({ id, purpose: `Implement ${id}.` })),
  status: "proposed",
};

function createLifecycle(overrides = {}) {
  return createControlledImplementationLifecycle({
    maxTransitions: 12,
    job: {
      jobId: "hajj-supabase-wiring",
      originalGoal: "Add sign-in and save each user's Hajj progress.",
      allowedWritePaths: ["src/App.jsx"],
      plannedOperations: [appOperation],
      successfulWrites: [],
      inspectedPaths: [],
      blockedWrites: [],
      reusableCapabilities: [
        {
          path: "src/lib/supabase.js",
          capabilities: ["auth-client"],
        },
      ],
      supabaseAppWiringContract: supabaseContract,
      ...overrides,
    },
  });
}

test("controlled lifecycle allows one target refresh after intervening evidence and blocks its immediate repeat", async () => {
  let lifecycle = createLifecycle();
  const executorInvocations = [];
  const physicalExecutions = [];
  const executeTool = async ({ callId, toolName, args }) => {
    executorInvocations.push({ callId, toolName, path: args.path });

    if (toolName === "write_file") {
      return {
        ok: false,
        toolName,
        args,
        error:
          "KForge blocked this write because the full-file replacement removed existing app capabilities.",
        failureStage: TOOL_FAILURE_STAGE.PRE_APPROVAL,
      };
    }

    physicalExecutions.push({ callId, toolName, path: args.path });
    const content = `current source for ${args.path}`;
    return {
      ok: true,
      toolName,
      args,
      result:
        `Read file (Path: ${args.path})\n` +
        `File fingerprint: ${fingerprintFileContent(content)}\n\n` +
        `--- File contents ---\n${content}`,
    };
  };

  const initial = await processControlledToolQueue(
    lifecycle,
    [
      { name: "read_file", args: { path: "src/App.jsx" } },
      { name: "read_file", args: { path: "src/lib/supabase.js" } },
      {
        name: "write_file",
        args: {
          path: "src/App.jsx",
          content: "destructive replacement",
          expectedFileFingerprint: fingerprintFileContent(
            "current source for src/App.jsx",
          ),
        },
      },
    ],
    { executeTool },
  );
  lifecycle = initial.lifecycle;

  const prose = continueControlledImplementationAfterProse(lifecycle);
  expect(prose.shouldContinue).toBe(true);
  lifecycle = prose.lifecycle;

  const followup = await processControlledToolQueue(
    lifecycle,
    [
      { name: "read_file", args: { path: "src/App.jsx" } },
      { name: "read_file", args: { path: "src/App.jsx" } },
      { name: "read_file", args: { path: "src/main.jsx" } },
    ],
    { executeTool },
  );
  lifecycle = followup.lifecycle;

  const appReads = physicalExecutions.filter(
    (item) => item.toolName === "read_file" && item.path === "src/App.jsx",
  );
  expect(appReads).toHaveLength(2);
  expect(
    executorInvocations.filter((item) => item.toolName === "write_file"),
  ).toHaveLength(1);
  expect(
    physicalExecutions.filter((item) => item.toolName === "write_file"),
  ).toHaveLength(0);

  const requestEvents = lifecycle.events.filter(
    (event) => event.type === CONTROLLED_IMPLEMENTATION_EVENT.REQUEST,
  );
  const resultEvents = lifecycle.events.filter(
    (event) => event.type === CONTROLLED_IMPLEMENTATION_EVENT.RESULT,
  );
  expect(new Set(requestEvents.map((event) => event.callId)).size).toBe(
    requestEvents.length,
  );

  for (const result of resultEvents) {
    const request = requestEvents.find(
      (candidate) => candidate.callId === result.callId,
    );
    expect(request).toBeDefined();
    expect(result.toolName).toBe(request.toolName);
    const stoppedBeforePhysicalExecution =
      result.skipped ||
      result.cancelled ||
      result.failureStage === TOOL_FAILURE_STAGE.PRE_APPROVAL ||
      result.failureStage === TOOL_FAILURE_STAGE.APPROVAL;
    if (stoppedBeforePhysicalExecution) {
      expect(result.executedPath).toBe("");
    } else {
      expect(result.executedPath).toBe(request.requestedPath);
      expect(physicalExecutions).toContainEqual({
        callId: result.callId,
        toolName: result.toolName,
        path: result.executedPath,
      });
    }
  }

  const repeatedReadResult = resultEvents.find(
    (event) =>
      event.requestedPath === "src/App.jsx" &&
      event.skipped === true,
  );
  expect(repeatedReadResult).toEqual(
    expect.objectContaining({
      ok: false,
      skipped: true,
      reason: expect.stringContaining("blocked a repeated read"),
    }),
  );

  const mainResult = resultEvents.find(
    (event) => event.requestedPath === "src/main.jsx",
  );
  expect(mainResult).toEqual(
    expect.objectContaining({
      executedPath: "src/main.jsx",
      ok: true,
    }),
  );

  expect(lifecycle.job.originalGoal).toBe(
    "Add sign-in and save each user's Hajj progress.",
  );
  expect(lifecycle.job.allowedWritePaths).toEqual(["src/App.jsx"]);
  expect(lifecycle.job.successfulWrites).toEqual([]);
  expect(lifecycle.job.blockedWrites).toEqual(["src/App.jsx"]);
  expect(lifecycle.job.inspectedPaths).toEqual([
    "src/App.jsx",
    "src/lib/supabase.js",
    "src/main.jsx",
  ]);
  expect(lifecycle.job.reusableCapabilities).toEqual([
    {
      path: "src/lib/supabase.js",
      capabilities: ["auth-client"],
    },
  ]);
  expect(lifecycle.job.supabaseAppWiringContract).toEqual(supabaseContract);
  expect(getPendingControlledWritePaths(lifecycle)).toEqual(["src/App.jsx"]);
  expect(lifecycle.status).toBe(CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE);
  expect(lifecycle.status).not.toBe("generic_inspection_only");
});

test("queued calls are serially re-preflighted against the latest job", async () => {
  const physicalExecutions = [];
  const result = await processControlledToolQueue(
    createLifecycle(),
    [
      { name: "read_file", args: { path: "src/App.jsx" } },
      { name: "read_file", args: { path: "src/App.jsx" } },
    ],
    {
      executeTool: async ({ callId, toolName, args }) => {
        physicalExecutions.push({ callId, toolName, path: args.path });
        return { ok: true, toolName, args, result: "current source" };
      },
    },
  );

  expect(physicalExecutions).toHaveLength(1);
  expect(result.results).toEqual([
    expect.objectContaining({ ok: true, skipped: false }),
    expect.objectContaining({ ok: false, skipped: true }),
  ]);
});

test("a blocked write preserves completed planned writes and the pending boundary", async () => {
  const authOperation = {
    ...appOperation,
    id: "application-operation-auth",
    path: "src/lib/auth.js",
    responsibilityIds: ["auth-ui-session"],
    responsibilities: [
      { id: "auth-ui-session", purpose: "Provide auth helpers." },
    ],
  };
  const lifecycle = createControlledImplementationLifecycle({
    job: {
      jobId: "partial-controlled-wiring",
      originalGoal: "Finish approved Supabase wiring.",
      allowedWritePaths: ["src/lib/auth.js", "src/App.jsx"],
      plannedOperations: [authOperation, appOperation],
      completedOperationIds: [authOperation.id],
      successfulWrites: ["src/lib/auth.js"],
      inspectedPaths: ["src/lib/auth.js", "src/App.jsx"],
      blockedWrites: [],
      reusableCapabilities: [
        { path: "src/lib/auth.js", capabilities: ["auth-client"] },
      ],
      supabaseAppWiringContract: supabaseContract,
    },
  });
  const result = await processControlledToolQueue(
    lifecycle,
    [
      {
        name: "write_file",
        args: { path: "src/App.jsx", content: "unsafe replacement" },
      },
    ],
    {
      executeTool: async ({ toolName, args }) => ({
        ok: false,
        toolName,
        args,
        error: "Destructive full-file replacement blocked.",
      }),
    },
  );

  expect(result.lifecycle.job.successfulWrites).toEqual(["src/lib/auth.js"]);
  expect(result.lifecycle.job.blockedWrites).toEqual(["src/App.jsx"]);
  expect(result.lifecycle.job.inspectedPaths).toEqual([
    "src/lib/auth.js",
    "src/App.jsx",
  ]);
  expect(getPendingControlledWritePaths(result.lifecycle)).toEqual([
    "src/App.jsx",
  ]);
  expect(result.lifecycle.job.supabaseAppWiringContract).toEqual(
    supabaseContract,
  );
});

test("plain prose consumes only discretionary capacity before bounded failure", () => {
  let lifecycle = createControlledImplementationLifecycle({
    ...createLifecycle(),
    maxTransitions: 4,
  });
  const requiredReserve =
    getControlledImplementationRequiredTransitionReserve(lifecycle.job);

  expect(lifecycle.transitionCount).toBe(0);
  expect(requiredReserve).toBe(3);
  expect(
    lifecycle.maxTransitions - lifecycle.transitionCount - requiredReserve,
  ).toBe(1);

  const first = continueControlledImplementationAfterProse(lifecycle);
  expect(first.shouldContinue).toBe(true);
  lifecycle = first.lifecycle;
  expect(lifecycle.transitionCount).toBe(1);
  expect(lifecycle.maxTransitions - lifecycle.transitionCount).toBe(
    requiredReserve,
  );

  const exhausted = continueControlledImplementationAfterProse(lifecycle);
  expect(exhausted.shouldContinue).toBe(false);
  expect(exhausted.lifecycle.status).toBe(
    CONTROLLED_IMPLEMENTATION_STATUS.BOUNDED_FAILURE,
  );
  expect(exhausted.lifecycle.transitionCount).toBe(1);
  expect(exhausted.lifecycle.status).not.toBe("generic_inspection_only");
  expect(exhausted.lifecycle.terminalReason).toContain(
    "safe transition boundary",
  );
});

test("a mismatched result path fails closed with its original call identity", () => {
  const begun = beginControlledToolRequest(createLifecycle(), {
    name: "read_file",
    args: { path: "src/App.jsx" },
  });
  const completed = completeControlledToolRequest(
    begun.lifecycle,
    begun.request,
    {
      ok: true,
      toolName: "read_file",
      args: { path: "src/main.jsx" },
      result: "wrong result",
    },
  );

  expect(completed.lifecycle.status).toBe(
    CONTROLLED_IMPLEMENTATION_STATUS.CORRELATION_FAILURE,
  );
  expect(completed.result.callId).toBe(begun.request.callId);
  expect(completed.result.requestedPath).toBe("src/App.jsx");
  expect(completed.result.executedPath).toBe("src/main.jsx");
  expect(completed.result.ok).toBe(false);
});

test("controlled replace_text remains correlated and executes at most once", async () => {
  const fingerprint = "fnv1a64-0123456789abcdef";
  const executeTool = jest.fn(async ({ callId, toolName, args }) => ({
    ok: true,
    callId,
    toolName,
    args,
    result: "Replaced text in src/App.jsx",
  }));
  const result = await processControlledToolQueue(
    createLifecycle({
      inspectedPaths: ["src/App.jsx"],
      inspectedFileFingerprints: [
        { path: "src/App.jsx", fingerprint },
      ],
    }),
    [
      {
        name: "replace_text",
        args: {
          path: "src/App.jsx",
          expectedFileFingerprint: fingerprint,
          oldText: "const storage = localStorage;",
          newText: "const storage = supabaseStorage;",
        },
      },
    ],
    { executeTool },
  );

  expect(executeTool).toHaveBeenCalledTimes(1);
  expect(result.lifecycle.job.successfulWrites).toEqual(["src/App.jsx"]);
  expect(result.lifecycle.job.successfulMutations).toEqual([
    expect.objectContaining({
      callId: expect.stringContaining(":call-"),
      toolName: "replace_text",
      path: "src/App.jsx",
      sequence: 1,
    }),
  ]);
  expect(result.lifecycle.job.completedOperationIds).toEqual([]);
  expect(result.lifecycle.status).toBe(
    CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE,
  );
  expect(getPendingControlledWritePaths(result.lifecycle)).toEqual([
    "src/App.jsx",
  ]);
  expect(result.results[0]).toEqual(
    expect.objectContaining({
      toolName: "replace_text",
      requestedPath: "src/App.jsx",
      executedPath: "src/App.jsx",
      ok: true,
    }),
  );
});

test("failed controlled replace_text is not automatically retried", async () => {
  const fingerprint = "fnv1a64-0123456789abcdef";
  const executeTool = jest.fn(async ({ toolName, args }) => ({
    ok: false,
    toolName,
    args,
    error: "The inspected file became stale.",
    failureStage: TOOL_FAILURE_STAGE.EXECUTION,
  }));
  const result = await processControlledToolQueue(
    createLifecycle({
      inspectedPaths: ["src/App.jsx"],
      inspectedFileFingerprints: [
        { path: "src/App.jsx", fingerprint },
      ],
    }),
    [
      {
        name: "replace_text",
        args: {
          path: "src/App.jsx",
          expectedFileFingerprint: fingerprint,
          oldText: "old",
          newText: "new",
        },
      },
    ],
    { executeTool },
  );

  expect(executeTool).toHaveBeenCalledTimes(1);
  expect(result.lifecycle.job.successfulWrites).toEqual([]);
  expect(result.lifecycle.job.blockedWrites).toEqual(["src/App.jsx"]);
  expect(result.lifecycle.status).toBe(
    CONTROLLED_IMPLEMENTATION_STATUS.TERMINAL_UNCERTAIN,
  );
  expect(result.lifecycle.terminalReason).toMatch(/fresh inspection/i);
  expect(result.lifecycle.terminalReason).toMatch(/approved.*execution/i);
  expect(getPendingControlledWritePaths(result.lifecycle)).toEqual([
    "src/App.jsx",
  ]);
});

test("a prepared-write policy block remains active for one corrected correlated proposal", () => {
  const fingerprint = "fnv1a64-0123456789abcdef";
  const blockedReason =
    "The prepared edit imported a raw client instead of the reusable helper boundary.";
  let lifecycle = createLifecycle({
    inspectedPaths: ["src/App.jsx", "src/lib/supabase.js"],
    inspectedFileFingerprints: [
      { path: "src/App.jsx", fingerprint },
    ],
  });
  const first = beginControlledToolRequest(lifecycle, {
    name: "replace_text",
    args: {
      path: "src/App.jsx",
      expectedFileFingerprint: fingerprint,
      oldText: "old import",
      newText: "raw client import",
    },
  });
  expect(first.shouldExecute).toBe(true);

  const blocked = completeControlledToolRequest(
    first.lifecycle,
    first.request,
    {
      ok: false,
      toolName: "replace_text",
      args: first.request.args,
      error: blockedReason,
      cancelled: false,
      failureStage: TOOL_FAILURE_STAGE.PRE_APPROVAL,
    },
  );
  lifecycle = blocked.lifecycle;

  expect(lifecycle.status).toBe(CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE);
  expect(lifecycle.terminalReason).toBe("");
  expect(isPendingControlledImplementation(lifecycle)).toBe(true);
  expect(getPendingControlledWritePaths(lifecycle)).toEqual(["src/App.jsx"]);
  expect(lifecycle.job.completedOperationIds).toEqual([]);
  expect(lifecycle.job.successfulMutations).toEqual([]);
  expect(lifecycle.job.blockedWrites).toEqual(["src/App.jsx"]);
  expect(lifecycle.job.inspectedFileFingerprints).toEqual([
    { path: "src/App.jsx", fingerprint },
  ]);
  expect(lifecycle.job.reusableCapabilities).toEqual([
    { path: "src/lib/supabase.js", capabilities: ["auth-client"] },
  ]);
  expect(lifecycle.job.supabaseAppWiringContract).toEqual(supabaseContract);
  expect(blocked.result).toEqual(
    expect.objectContaining({
      callId: first.request.callId,
      ok: false,
      executedPath: "",
      failureStage: TOOL_FAILURE_STAGE.PRE_APPROVAL,
      reason: blockedReason,
    }),
  );

  const corrected = beginControlledToolRequest(lifecycle, {
    name: "replace_text",
    args: {
      path: "src/App.jsx",
      expectedFileFingerprint: fingerprint,
      oldText: "old import",
      newText: "reusable helper import",
    },
  });
  expect(corrected.shouldExecute).toBe(true);
  expect(corrected.request.callId).not.toBe(first.request.callId);

  const succeeded = completeControlledToolRequest(
    corrected.lifecycle,
    corrected.request,
    {
      ok: true,
      toolName: "replace_text",
      args: corrected.request.args,
      result: "Corrected targeted edit saved.",
    },
  );

  expect(succeeded.lifecycle.status).toBe(
    CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE,
  );
  expect(succeeded.lifecycle.job.successfulMutations).toEqual([
    expect.objectContaining({
      callId: corrected.request.callId,
      toolName: "replace_text",
      path: "src/App.jsx",
    }),
  ]);
});

test("semantic recovery retains helper exports and permits a corrected proposal without rereading", () => {
  const fingerprint = "fnv1a64-0123456789abcdef";
  const blockedReason =
    "The prepared edit imported a raw client instead of the reusable helper boundary.";
  const helperSource = `
    export async function signInWithEmail(email, password) {
      return supabase.auth.signInWithPassword({ email, password });
    }

    export async function signUpWithEmail(email, password) {
      return supabase.auth.signUp({ email, password });
    }

    export async function signOut() {}

    export async function getCurrentUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        throw error;
      }
      return data.user;
    }

    export async function loadUserProgress(userId) {
      const { data, error } = await supabase
        .from("user_progress")
        .select("id, user_id, data")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    }

    export async function saveUserProgress() {}

    export const API_SECRET = "service-role-secret-value";
  `;
  let lifecycle = createLifecycle();

  const helperRead = beginControlledToolRequest(lifecycle, {
    name: "read_file",
    args: { path: "src/lib/supabase.js" },
  });
  expect(helperRead.shouldExecute).toBe(true);
  lifecycle = completeControlledToolRequest(
    helperRead.lifecycle,
    helperRead.request,
    {
      ok: true,
      toolName: "read_file",
      args: helperRead.request.args,
      result: `Read file\n\n--- File contents ---\n${helperSource}`,
    },
  ).lifecycle;

  const targetRead = beginControlledToolRequest(lifecycle, {
    name: "read_file",
    args: { path: "src/App.jsx" },
  });
  expect(targetRead.shouldExecute).toBe(true);
  lifecycle = completeControlledToolRequest(
    targetRead.lifecycle,
    targetRead.request,
    {
      ok: true,
      toolName: "read_file",
      args: targetRead.request.args,
      result:
        `Read file\nFile fingerprint: ${fingerprint}\n\n` +
        "--- File contents ---\nexport default function App() {}",
    },
  ).lifecycle;

  const first = beginControlledToolRequest(lifecycle, {
    name: "replace_text",
    args: {
      path: "src/App.jsx",
      expectedFileFingerprint: fingerprint,
      oldText: "old import",
      newText: "raw client import",
    },
  });
  expect(first.shouldExecute).toBe(true);
  const blocked = completeControlledToolRequest(
    first.lifecycle,
    first.request,
    {
      ok: false,
      toolName: "replace_text",
      args: first.request.args,
      error: blockedReason,
      failureStage: TOOL_FAILURE_STAGE.PRE_APPROVAL,
      requiresFreshInspection: false,
    },
  );
  lifecycle = blocked.lifecycle;

  expect(lifecycle.status).toBe(CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE);
  expect(lifecycle.requiredFreshInspectionPath).toBe("");
  expect(lifecycle.job.reusableCapabilities).toEqual([
    {
      path: "src/lib/supabase.js",
      capabilities: ["auth-client"],
      exportedSymbols: [
        "getCurrentUser",
        "loadUserProgress",
        "saveUserProgress",
        "signInWithEmail",
        "signOut",
        "signUpWithEmail",
      ],
      helperContracts: [
        {
          exportName: "getCurrentUser",
          role: "current-user",
          resultKind: "user",
          errorMode: "throws",
        },
        {
          exportName: "loadUserProgress",
          role: "progress-load",
          resultKind: "database-row",
          errorMode: "throws",
          payloadPath: "data",
          nullable: true,
        },
        {
          exportName: "signInWithEmail",
          role: "sign-in",
          resultKind: "auth-response",
          errorMode: "response-envelope",
          userPath: "data.user",
          sessionPath: "data.session",
          authenticatedStateRequiresSession: false,
        },
        {
          exportName: "signUpWithEmail",
          role: "sign-up",
          resultKind: "auth-response",
          errorMode: "response-envelope",
          userPath: "data.user",
          sessionPath: "data.session",
          authenticatedStateRequiresSession: true,
        },
      ],
    },
  ]);
  expect(JSON.stringify(lifecycle)).not.toContain("service-role-secret-value");

  const recoveryPrompt = buildImplementationJobBlockedWriteRecoveryPrompt(
    lifecycle.job,
    "",
    { targetPath: "src/App.jsx", blockedReason },
  );
  expect(recoveryPrompt).toContain("Blocked write target: src/App.jsx");
  expect(recoveryPrompt).toContain(blockedReason);
  expect(recoveryPrompt).toContain("src/lib/supabase.js");
  expect(recoveryPrompt).toContain(
    "Available inspected helper exports: getCurrentUser, loadUserProgress, saveUserProgress, signInWithEmail, signOut, signUpWithEmail",
  );
  expect(recoveryPrompt).toContain("Authoritative inspected helper contracts:");
  expect(recoveryPrompt).toContain(
    "loadUserProgress returns a nullable database-row; application payload path: data; errors: throws",
  );
  expect(recoveryPrompt).toContain(
    "signUpWithEmail returns an auth-response; user path: data.user; session path: data.session; authenticated state requires an active session",
  );
  expect(recoveryPrompt).toMatch(/correct.*blocked reason/i);
  expect(recoveryPrompt).toMatch(/replace_text tool call/i);

  const corrected = beginControlledToolRequest(lifecycle, {
    name: "replace_text",
    args: {
      path: "src/App.jsx",
      expectedFileFingerprint: fingerprint,
      oldText: "old import",
      newText: "reusable helper import",
    },
  });
  expect(corrected.shouldExecute).toBe(true);
  expect(corrected.request.callId).not.toBe(first.request.callId);
});

test("structured stale-evidence recovery allows one required target refresh only", () => {
  const fingerprint = "fnv1a64-0123456789abcdef";
  let lifecycle = createLifecycle({
    inspectedPaths: ["src/App.jsx"],
    inspectedFileFingerprints: [{ path: "src/App.jsx", fingerprint }],
  });
  const proposal = beginControlledToolRequest(lifecycle, {
    name: "replace_text",
    args: {
      path: "src/App.jsx",
      expectedFileFingerprint: fingerprint,
      oldText: "old",
      newText: "new",
    },
  });
  const stale = completeControlledToolRequest(
    proposal.lifecycle,
    proposal.request,
    {
      ok: false,
      toolName: "replace_text",
      args: proposal.request.args,
      error: "The inspected fingerprint is stale.",
      failureStage: TOOL_FAILURE_STAGE.PRE_APPROVAL,
      requiresFreshInspection: true,
    },
  );
  lifecycle = stale.lifecycle;
  expect(lifecycle.requiredFreshInspectionPath).toBe("src/App.jsx");

  const refresh = beginControlledToolRequest(lifecycle, {
    name: "read_file",
    args: { path: "src/App.jsx" },
  });
  expect(refresh.shouldExecute).toBe(true);
  lifecycle = completeControlledToolRequest(
    refresh.lifecycle,
    refresh.request,
    {
      ok: true,
      toolName: "read_file",
      args: refresh.request.args,
      result:
        "Read file\nFile fingerprint: fnv1a64-fedcba9876543210\n\n" +
        "--- File contents ---\nupdated source",
    },
  ).lifecycle;
  expect(lifecycle.requiredFreshInspectionPath).toBe("");

  const immediateRepeat = beginControlledToolRequest(lifecycle, {
    name: "read_file",
    args: { path: "src/App.jsx" },
  });
  expect(immediateRepeat.shouldExecute).toBe(false);
  expect(immediateRepeat.result.reason).toMatch(/repeated read/i);
});

test("controlled agent allowance is remaining lifecycle transitions plus one final response", () => {
  const lifecycle = createControlledImplementationLifecycle({
    ...createLifecycle(),
    transitionCount: 4,
    maxTransitions: 12,
  });

  expect(getControlledImplementationAgentStepBudget(lifecycle)).toBe(9);
});

test("derived controlled agent allowance remains capped for oversized approved workload", () => {
  const responsibilities = Array.from({ length: 40 }, (_, index) => ({
    id: `responsibility-${index + 1}`,
    purpose: `Complete responsibility ${index + 1}.`,
  }));
  const lifecycle = createControlledImplementationLifecycle({
    job: {
      jobId: "generic-capped-workload",
      originalGoal: "Complete the approved bounded workload.",
      allowedWritePaths: ["src/LargeIntegration.jsx"],
      plannedOperations: [
        {
          id: "application-operation-large-integration",
          path: "src/LargeIntegration.jsx",
          role: "react-integration",
          purpose: "Complete the approved bounded workload.",
          responsibilityIds: responsibilities.map(({ id }) => id),
          responsibilities,
          status: "proposed",
        },
      ],
    },
  });

  expect(getControlledImplementationTransitionLimit(lifecycle.job)).toBe(64);
  expect(lifecycle.maxTransitions).toBe(64);
  expect(getControlledImplementationAgentStepBudget(lifecycle)).toBe(65);
});

test("derived controlled budget completes three targeted edits with mandatory post-mutation inspections", async () => {
  const operation = {
    id: "application-operation-dashboard",
    path: "src/Dashboard.jsx",
    role: "react-integration",
    purpose: "Complete the approved dashboard integration.",
    responsibilityIds: [
      "session-ui",
      "data-hydration",
      "data-persistence",
      "interaction-feedback",
    ],
    responsibilities: [
      { id: "session-ui", purpose: "Integrate the approved session UI." },
      { id: "data-hydration", purpose: "Hydrate approved application data." },
      { id: "data-persistence", purpose: "Persist approved application data." },
      {
        id: "interaction-feedback",
        purpose: "Preserve approved interaction feedback.",
      },
    ],
    status: "proposed",
  };
  let lifecycle = createControlledImplementationLifecycle({
    job: {
      jobId: "generic-dashboard-integration",
      originalGoal: "Complete the approved dashboard integration.",
      allowedWritePaths: [operation.path],
      plannedOperations: [operation],
      reusableCapabilities: [
        { path: "src/lib/client.js", capabilities: ["service-client"] },
        { path: "src/lib/queries.js", capabilities: ["data-queries"] },
        { path: "src/examples/clientExample.js", capabilities: ["usage-example"] },
      ],
      supabaseAppWiringContract: supabaseContract,
    },
  });
  const derivedTransitionLimit =
    getControlledImplementationTransitionLimit(lifecycle.job);
  const startingAgentBudget =
    getControlledImplementationAgentStepBudget(lifecycle);
  const fingerprints = [
    "fnv1a64-1000000000000001",
    "fnv1a64-2000000000000002",
    "fnv1a64-3000000000000003",
    "fnv1a64-4000000000000004",
  ];
  let modelTurns = 0;

  const execute = async (toolCall, result) => {
    modelTurns += 1;
    const turn = await executeControlledImplementationTurn({
      lifecycle,
      toolCall,
      executeTool: async (request) => ({
        toolName: request.toolName,
        args: request.args,
        ...result,
      }),
    });
    lifecycle = turn.lifecycle;
    expect(turn.result?.ok).toBe(true);
  };

  await execute(
    { name: "read_file", args: { path: operation.path } },
    { ok: true, result: `File fingerprint: ${fingerprints[0]}\n\nsource zero` },
  );
  for (const path of [
    "src/lib/client.js",
    "src/lib/queries.js",
    "src/examples/clientExample.js",
  ]) {
    await execute(
      { name: "read_file", args: { path } },
      {
        ok: true,
        result: `File fingerprint: fnv1a64-aaaaaaaaaaaaaaaa\n\nexport const evidence = true`,
      },
    );
  }
  for (let recoveryTurn = 0; recoveryTurn < 2; recoveryTurn += 1) {
    const continuation = continueControlledImplementationAfterProse(lifecycle);
    expect(continuation.shouldContinue).toBe(true);
    lifecycle = continuation.lifecycle;
    modelTurns += 1;
  }
  await execute(
    { name: "read_file", args: { path: operation.path } },
    { ok: true, result: `File fingerprint: ${fingerprints[0]}\n\nsource zero` },
  );

  for (let editIndex = 0; editIndex < 3; editIndex += 1) {
    await execute(
      {
        name: "replace_text",
        args: {
          path: operation.path,
          expectedFileFingerprint: fingerprints[editIndex],
          oldText: `source ${editIndex}`,
          newText: `source ${editIndex + 1}`,
        },
      },
      { ok: true, result: `targeted edit ${editIndex + 1}` },
    );
    await execute(
      { name: "read_file", args: { path: operation.path } },
      {
        ok: true,
        result: `File fingerprint: ${fingerprints[editIndex + 1]}\n\nsource ${editIndex + 1}`,
      },
    );
  }

  await execute({
    name: "complete_operation",
    args: {
      operationId: operation.id,
      satisfiedResponsibilityIds: operation.responsibilityIds,
    },
  });
  modelTurns += 1;

  expect(derivedTransitionLimit).toBe(18);
  expect(startingAgentBudget).toBe(19);
  expect(lifecycle.maxTransitions).toBe(derivedTransitionLimit);
  expect(lifecycle.transitionCount).toBe(14);
  expect(lifecycle.status).toBe(CONTROLLED_IMPLEMENTATION_STATUS.COMPLETED);
  expect(lifecycle.job.successfulMutations).toHaveLength(3);
  expect(lifecycle.job.completedOperationIds).toEqual([operation.id]);
  expect(modelTurns).toBeLessThanOrEqual(startingAgentBudget);
});

test("derived agent budget completes a guarded multi-edit operation after corrective rereads", async () => {
  const targetPath = "src/ApplicationShell.jsx";
  const operation = {
    id: "application-operation-shell",
    path: targetPath,
    role: "react-integration",
    purpose: "Complete the approved application integration.",
    responsibilityIds: [
      "service-imports",
      "session-state",
      "event-handlers",
      "account-interface",
    ],
    responsibilities: [
      "service-imports",
      "session-state",
      "event-handlers",
      "account-interface",
    ].map((id) => ({ id, purpose: `Complete ${id}.` })),
    status: "proposed",
  };
  let lifecycle = createControlledImplementationLifecycle({
    job: {
      jobId: "generic-guarded-multi-edit",
      originalGoal: "Complete the approved account-data integration.",
      allowedWritePaths: [targetPath],
      plannedOperations: [operation],
      reusableCapabilities: [
        { path: "src/services/accountClient.js", capabilities: ["account-client"] },
        { path: "src/services/accountData.js", capabilities: ["account-data"] },
      ],
      supabaseAppWiringContract: [
        {
          table: "account_records",
          ownership: "user-owned",
          ownerColumn: "account_id",
          primaryKeys: ["account_id"],
          columns: [
            { name: "account_id", dataType: "uuid", nullable: false },
            { name: "payload", dataType: "jsonb", nullable: false },
          ],
        },
      ],
    },
  });
  const fingerprints = [
    "fnv1a64-1000000000000001",
    "fnv1a64-2000000000000002",
    "fnv1a64-3000000000000003",
    "fnv1a64-4000000000000004",
    "fnv1a64-5000000000000005",
  ];
  const toolCalls = [
    { name: "read_file", args: { path: targetPath } },
    { name: "read_file", args: { path: "src/services/accountClient.js" } },
    { name: "read_file", args: { path: "src/services/accountData.js" } },
    {
      name: "replace_text",
      args: {
        path: targetPath,
        expectedFileFingerprint: fingerprints[0],
        oldText: "source zero",
        newText: "source one",
      },
    },
    { name: "read_file", args: { path: targetPath } },
    {
      name: "replace_text",
      args: {
        path: targetPath,
        expectedFileFingerprint: fingerprints[1],
        oldText: "unsafe session proposal",
        newText: "blocked session proposal",
      },
    },
    { name: "read_file", args: { path: targetPath } },
    {
      name: "replace_text",
      args: {
        path: targetPath,
        expectedFileFingerprint: fingerprints[1],
        oldText: "source one",
        newText: "source two",
      },
    },
    { name: "read_file", args: { path: targetPath } },
    {
      name: "replace_text",
      args: {
        path: targetPath,
        expectedFileFingerprint: fingerprints[2],
        oldText: "source two",
        newText: "source three",
      },
    },
    { name: "read_file", args: { path: targetPath } },
    {
      name: "replace_text",
      args: {
        path: targetPath,
        expectedFileFingerprint: fingerprints[3],
        oldText: "unsafe interface proposal",
        newText: "blocked interface proposal",
      },
    },
    { name: "read_file", args: { path: targetPath } },
    {
      name: "replace_text",
      args: {
        path: targetPath,
        expectedFileFingerprint: fingerprints[3],
        oldText: "source three",
        newText: "source four",
      },
    },
    { name: "read_file", args: { path: targetPath } },
    {
      name: "complete_operation",
      args: {
        operationId: operation.id,
        satisfiedResponsibilityIds: operation.responsibilityIds,
      },
    },
  ];
  let targetReadCount = 0;
  const agentBudget = getControlledImplementationAgentStepBudget(lifecycle);

  const result = await runAgent({
    prompt: "Complete the approved structured operation.",
    callModel: async ({ step }) =>
      step <= toolCalls.length
        ? { toolCall: toolCalls[step - 1] }
        : { text: "Completed the approved structured operation." },
    executeTool: async (toolCall) => {
      const turn = await executeControlledImplementationTurn({
        lifecycle,
        toolCall,
        executeTool: async ({ toolName, args }) => {
          if (toolName === "read_file") {
            if (args.path === targetPath) {
              const fingerprint = [
                fingerprints[0],
                fingerprints[1],
                fingerprints[1],
                fingerprints[2],
                fingerprints[3],
                fingerprints[3],
                fingerprints[4],
              ][targetReadCount];
              targetReadCount += 1;
              return {
                ok: true,
                toolName,
                args,
                result: `File fingerprint: ${fingerprint}\n\ncurrent source`,
              };
            }
            return {
              ok: true,
              toolName,
              args,
              result:
                "File fingerprint: fnv1a64-aaaaaaaaaaaaaaaa\n\nexport const capability = true;",
            };
          }
          if (String(args.oldText || "").startsWith("unsafe ")) {
            return {
              ok: false,
              toolName,
              args,
              error: "Prepared write policy rejected this proposal.",
              failureStage: TOOL_FAILURE_STAGE.PRE_APPROVAL,
              requiresFreshInspection: true,
            };
          }
          return { ok: true, toolName, args, result: "Applied targeted edit." };
        },
      });
      lifecycle = turn.lifecycle;
      return turn.toolResult;
    },
    continueAfterFinalText: () =>
      isPendingControlledImplementation(lifecycle)
        ? continueControlledImplementationAfterProse(lifecycle).shouldContinue
          ? "Continue the pending structured operation."
          : ""
        : "",
    delegateDuplicateToolCalls: true,
    maxSteps: agentBudget,
  });

  expect(agentBudget).toBeGreaterThan(toolCalls.length);
  expect(result.stopReason).toBe("final_text");
  expect(result.steps).toBe(toolCalls.length + 1);
  expect(lifecycle.status).toBe(CONTROLLED_IMPLEMENTATION_STATUS.COMPLETED);
  expect(lifecycle.job.successfulMutations).toHaveLength(4);
  expect(lifecycle.job.completedOperationIds).toEqual([operation.id]);
});

test("derived controlled budget keeps a finite stop for non-actionable model turns", () => {
  let lifecycle = createControlledImplementationLifecycle({
    job: {
      jobId: "generic-bounded-integration",
      originalGoal: "Complete one approved integration.",
      allowedWritePaths: ["src/View.jsx"],
      plannedOperations: [
        {
          id: "application-operation-view",
          path: "src/View.jsx",
          role: "react-integration",
          purpose: "Complete one approved view integration.",
          responsibilityIds: ["view-integration"],
          responsibilities: [
            {
              id: "view-integration",
              purpose: "Complete the approved view integration.",
            },
          ],
          status: "proposed",
        },
      ],
      supabaseAppWiringContract: supabaseContract,
    },
  });
  const agentBudget = getControlledImplementationAgentStepBudget(lifecycle);
  let modelTurns = 0;

  while (
    lifecycle.status === CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE &&
    modelTurns <= agentBudget
  ) {
    const continuation = continueControlledImplementationAfterProse(lifecycle);
    lifecycle = continuation.lifecycle;
    modelTurns += 1;
  }

  expect(lifecycle.status).toBe(
    CONTROLLED_IMPLEMENTATION_STATUS.BOUNDED_FAILURE,
  );
  expect(modelTurns).toBeLessThanOrEqual(agentBudget);
  expect(lifecycle.transitionCount).toBe(
    lifecycle.maxTransitions -
      getControlledImplementationRequiredTransitionReserve(lifecycle.job),
  );
  expect(agentBudget).toBeLessThanOrEqual(65);
});

test("pathological controlled tool calling still stops at the derived agent bound", async () => {
  let lifecycle = createControlledImplementationLifecycle({
    job: {
      jobId: "generic-endless-tool-calling",
      originalGoal: "Complete one approved bounded integration.",
      allowedWritePaths: ["src/BoundedView.jsx"],
      supabaseAppWiringContract: supabaseContract,
      plannedOperations: [
        {
          id: "application-operation-bounded-view",
          path: "src/BoundedView.jsx",
          role: "react-integration",
          purpose: "Complete the approved bounded integration.",
          responsibilityIds: ["bounded-integration"],
          responsibilities: [
            {
              id: "bounded-integration",
              purpose: "Complete the approved bounded integration.",
            },
          ],
          status: "proposed",
        },
      ],
    },
  });
  const agentBudget = getControlledImplementationAgentStepBudget(lifecycle);

  const result = await runAgent({
    prompt: "Keep requesting evidence forever.",
    callModel: async ({ step }) => ({
      toolCall: {
        name: "read_file",
        args: { path: `src/evidence-${step}.js` },
      },
    }),
    executeTool: async (toolCall) => {
      const turn = await executeControlledImplementationTurn({
        lifecycle,
        toolCall,
        executeTool: async ({ toolName, args }) => ({
          ok: true,
          toolName,
          args,
          result:
            "File fingerprint: fnv1a64-aaaaaaaaaaaaaaaa\n\nexport const evidence = true;",
        }),
      });
      lifecycle = turn.lifecycle;
      return turn.toolResult;
    },
    delegateDuplicateToolCalls: true,
    maxSteps: agentBudget,
  });

  expect(agentBudget).toBeLessThanOrEqual(65);
  expect(result.stopReason).toBe("max_steps_reached");
  expect(result.steps).toBe(agentBudget);
  expect(lifecycle.status).toBe(
    CONTROLLED_IMPLEMENTATION_STATUS.BOUNDED_FAILURE,
  );
  expect(getPendingControlledWritePaths(lifecycle)).toEqual([
    "src/BoundedView.jsx",
  ]);
});

test("repeated pre-approval policy blocks exhaust only non-reserved transition capacity", async () => {
  const fingerprint = "fnv1a64-0123456789abcdef";
  const executeTool = jest.fn(async ({ toolName, args }) => ({
    ok: false,
    toolName,
    args,
    error: "Prepared write policy rejected this proposal.",
    failureStage: TOOL_FAILURE_STAGE.PRE_APPROVAL,
  }));
  const lifecycle = createControlledImplementationLifecycle({
    ...createLifecycle({
      inspectedPaths: ["src/App.jsx"],
      inspectedFileFingerprints: [
        { path: "src/App.jsx", fingerprint },
      ],
    }),
    maxTransitions: 5,
  });
  const proposal = {
    name: "replace_text",
    args: {
      path: "src/App.jsx",
      expectedFileFingerprint: fingerprint,
      oldText: "old",
      newText: "new",
    },
  };
  const result = await processControlledToolQueue(
    lifecycle,
    [proposal, proposal, proposal, proposal],
    { executeTool },
  );

  expect(executeTool).toHaveBeenCalledTimes(3);
  expect(result.lifecycle.status).toBe(
    CONTROLLED_IMPLEMENTATION_STATUS.BOUNDED_FAILURE,
  );
  expect(result.lifecycle.terminalReason).toMatch(/safe transition boundary/i);
  expect(result.lifecycle.job.successfulMutations).toEqual([]);
  expect(result.lifecycle.job.completedOperationIds).toEqual([]);
  const resultCallIds = result.lifecycle.events
    .filter((event) => event.type === CONTROLLED_IMPLEMENTATION_EVENT.RESULT)
    .map((event) => event.callId);
  expect(new Set(resultCallIds).size).toBe(resultCallIds.length);
});

test("approval cancellation is classified without claiming execution failure", () => {
  const fingerprint = "fnv1a64-0123456789abcdef";
  const begun = beginControlledToolRequest(
    createLifecycle({
      inspectedPaths: ["src/App.jsx"],
      inspectedFileFingerprints: [
        { path: "src/App.jsx", fingerprint },
      ],
    }),
    {
      name: "replace_text",
      args: {
        path: "src/App.jsx",
        expectedFileFingerprint: fingerprint,
        oldText: "old",
        newText: "new",
      },
    },
  );
  const cancelled = completeControlledToolRequest(
    begun.lifecycle,
    begun.request,
    {
      ok: false,
      toolName: "replace_text",
      args: begun.request.args,
      cancelled: true,
      failureStage: TOOL_FAILURE_STAGE.APPROVAL,
    },
  );

  expect(cancelled.lifecycle.status).toBe(
    CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE,
  );
  expect(cancelled.lifecycle.terminalReason).toBe("");
  expect(cancelled.lifecycle.job.successfulMutations).toEqual([]);
  expect(cancelled.result).toEqual(
    expect.objectContaining({
      callId: begun.request.callId,
      cancelled: true,
      executedPath: "",
      failureStage: TOOL_FAILURE_STAGE.APPROVAL,
    }),
  );
});

test("large inspected source remains safely target-editable after helper inspections", async () => {
  const anchor = "const persistenceMode = 'local';";
  const largeSource =
    Array.from(
      { length: 900 },
      (_, index) => `const preservedHandler${index} = () => ${index};`,
    ).join("\n") +
    `\n${anchor}\nexport default function App() { return null; }`;
  const fingerprint = fingerprintFileContent(largeSource);
  let materializedContent = "";
  let appReadCount = 0;

  const result = await processControlledToolQueue(
    createLifecycle(),
    [
      { name: "read_file", args: { path: "src/App.jsx" } },
      { name: "read_file", args: { path: "src/lib/supabase.js" } },
      { name: "read_file", args: { path: "src/lib/queries.js" } },
      { name: "read_file", args: { path: "src/App.css" } },
      { name: "read_file", args: { path: "src/App.jsx" } },
      {
        name: "replace_text",
        args: {
          path: "src/App.jsx",
          expectedFileFingerprint: fingerprint,
          oldText: anchor,
          newText: `${anchor}\nconst remoteMode = 'supabase';`,
        },
      },
    ],
    {
      executeTool: async ({ toolName, args }) => {
        if (toolName === "read_file") {
          if (args.path === "src/App.jsx") appReadCount += 1;
          const content =
            args.path === "src/App.jsx" ? largeSource : "export const helper = true;";
          return {
            ok: true,
            toolName,
            args,
            result:
              `Read ${content.length} bytes (Path: ${args.path})\n` +
              `File fingerprint: ${fingerprintFileContent(content)}\n\n` +
              `--- File contents ---\n${content}`,
          };
        }

        const materialized = materializeExactTextReplacement({
          currentContent: largeSource,
          ...args,
        });
        materializedContent = materialized.materializedContent;
        return { ok: materialized.ok, toolName, args, result: "targeted edit" };
      },
    },
  );

  expect(largeSource.length).toBeGreaterThan(20_000);
  expect(appReadCount).toBe(2);
  expect(result.lifecycle.job.inspectedFileFingerprints).toContainEqual({
    path: "src/App.jsx",
    fingerprint,
  });
  expect(result.lifecycle.job.successfulWrites).toEqual(["src/App.jsx"]);
  expect(materializedContent).toContain("preservedHandler899");
  expect(materializedContent).toBe(
    largeSource.replace(anchor, `${anchor}\nconst remoteMode = 'supabase';`),
  );
});

test("multiple targeted edits remain bounded and complete only through the structured operation transition", () => {
  const fingerprint1 = "fnv1a64-1111111111111111";
  const fingerprint2 = "fnv1a64-2222222222222222";
  const fingerprint3 = "fnv1a64-3333333333333333";
  let lifecycle = createLifecycle();

  const finish = (toolCall, result) => {
    const begun = beginControlledToolRequest(lifecycle, toolCall);
    expect(begun.shouldExecute).toBe(true);
    const completed = completeControlledToolRequest(
      begun.lifecycle,
      begun.request,
      {
        toolName: toolCall.name,
        args: toolCall.args,
        ...result,
      },
    );
    lifecycle = completed.lifecycle;
    return completed.result;
  };

  finish(
    { name: "read_file", args: { path: "src/App.jsx" } },
    {
      ok: true,
      result: `File fingerprint: ${fingerprint1}\n\nsource one`,
    },
  );
  finish(
    {
      name: "replace_text",
      args: {
        path: "src/App.jsx",
        expectedFileFingerprint: fingerprint1,
        oldText: "source one",
        newText: "source two",
      },
    },
    { ok: true, result: "first targeted edit" },
  );

  expect(lifecycle.status).toBe(CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE);
  expect(lifecycle.job.successfulMutations).toHaveLength(1);
  expect(lifecycle.job.completedOperationIds).toEqual([]);

  finish(
    { name: "read_file", args: { path: "src/App.jsx" } },
    {
      ok: true,
      result: `File fingerprint: ${fingerprint2}\n\nsource two`,
    },
  );
  finish(
    {
      name: "replace_text",
      args: {
        path: "src/App.jsx",
        expectedFileFingerprint: fingerprint2,
        oldText: "source two",
        newText: "source three",
      },
    },
    { ok: true, result: "second targeted edit" },
  );
  finish(
    { name: "read_file", args: { path: "src/App.jsx" } },
    {
      ok: true,
      result: `File fingerprint: ${fingerprint3}\n\nsource three`,
    },
  );
  const completionEvent = finish(
    {
      name: "complete_operation",
      args: {
        operationId: appOperation.id,
        satisfiedResponsibilityIds: appOperation.responsibilityIds,
      },
    },
    { ok: true, result: "structured completion" },
  );

  expect(lifecycle.job.successfulMutations).toHaveLength(2);
  expect(lifecycle.job.completedOperationIds).toEqual([appOperation.id]);
  expect(lifecycle.status).toBe(CONTROLLED_IMPLEMENTATION_STATUS.COMPLETED);
  expect(completionEvent).toEqual(
    expect.objectContaining({
      type: CONTROLLED_IMPLEMENTATION_EVENT.OPERATION_COMPLETION,
      operationId: appOperation.id,
      satisfiedResponsibilityIds: appOperation.responsibilityIds,
      ok: true,
    }),
  );
  expect(lifecycle.transitionCount).toBe(6);
  expect(lifecycle.maxTransitions).toBe(12);
});

test("operation completion remains pending when a responsibility is omitted", () => {
  const fingerprint = "fnv1a64-4444444444444444";
  const lifecycle = createLifecycle({
    successfulMutations: [
      {
        callId: "controlled-call-1",
        toolName: "replace_text",
        path: "src/App.jsx",
        sequence: 1,
      },
    ],
    inspectionHistory: [
      {
        callId: "controlled-call-2",
        path: "src/App.jsx",
        fingerprint,
        sequence: 2,
      },
    ],
  });
  const begun = beginControlledToolRequest(lifecycle, {
    name: "complete_operation",
    args: {
      operationId: appOperation.id,
      satisfiedResponsibilityIds: appOperation.responsibilityIds.slice(0, -1),
    },
  });

  expect(begun.shouldExecute).toBe(false);
  expect(begun.lifecycle.status).toBe(CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE);
  expect(begun.lifecycle.job.completedOperationIds).toEqual([]);
  expect(begun.result.reason).toMatch(/every structured responsibility/i);
});

const CONTROLLED_PROPOSAL_ENTRY_PATHS = ["initial_batch", "agent_loop"];

async function executeAtControlledEntry(entryPath, lifecycle, toolCall, result) {
  const executeTool = jest.fn(async (request) => ({
    ...result,
    toolName: request.toolName,
    args: request.args,
    entryPath,
  }));
  const turn = await executeControlledImplementationTurn({
    lifecycle,
    toolCall,
    executeTool,
  });
  return { turn, executeTool };
}

test.each(CONTROLLED_PROPOSAL_ENTRY_PATHS)(
  "%s uses the shared structured recovery directives for policy and stale-evidence blocks",
  async (entryPath) => {
    const fingerprint = "fnv1a64-0123456789abcdef";
    const lifecycle = createLifecycle({
      inspectedPaths: ["src/App.jsx"],
      inspectedFileFingerprints: [{ path: "src/App.jsx", fingerprint }],
    });
    const proposal = {
      name: "replace_text",
      args: {
        path: "src/App.jsx",
        expectedFileFingerprint: fingerprint,
        oldText: "old",
        newText: "new",
      },
    };

    const semantic = await executeAtControlledEntry(
      entryPath,
      lifecycle,
      proposal,
      {
        ok: false,
        error: "Prepared Supabase policy rejected the materialized proposal.",
        failureStage: TOOL_FAILURE_STAGE.PRE_APPROVAL,
      },
    );
    expect(semantic.turn.recovery.type).toBe(
      CONTROLLED_RECOVERY_DIRECTIVE.CONTINUE_WITH_DURABLE_EVIDENCE,
    );
    expect(semantic.turn.recovery.reason).toBe(
      "Prepared Supabase policy rejected the materialized proposal.",
    );

    const stale = await executeAtControlledEntry(
      entryPath,
      lifecycle,
      proposal,
      {
        ok: false,
        error: "The inspected fingerprint or exact anchor became stale.",
        failureStage: TOOL_FAILURE_STAGE.PRE_APPROVAL,
        requiresFreshInspection: true,
      },
    );
    expect(stale.turn.recovery).toEqual(
      expect.objectContaining({
        type: CONTROLLED_RECOVERY_DIRECTIVE.REFRESH_EXACT_TARGET,
        targetPath: "src/App.jsx",
      }),
    );
  },
);

test.each(CONTROLLED_PROPOSAL_ENTRY_PATHS)(
  "%s never replays cancellation and makes every approved mutation failure terminal uncertain",
  async (entryPath) => {
    const fingerprint = "fnv1a64-0123456789abcdef";
    const lifecycle = createLifecycle({
      inspectedPaths: ["src/App.jsx"],
      inspectedFileFingerprints: [{ path: "src/App.jsx", fingerprint }],
    });
    const replaceProposal = {
      name: "replace_text",
      args: {
        path: "src/App.jsx",
        expectedFileFingerprint: fingerprint,
        oldText: "old",
        newText: "new",
      },
    };
    const writeProposal = {
      name: "write_file",
      args: {
        path: "src/App.jsx",
        expectedFileFingerprint: fingerprint,
        content: "complete source",
      },
    };

    const cancelled = await executeAtControlledEntry(
      entryPath,
      lifecycle,
      replaceProposal,
      {
        ok: false,
        cancelled: true,
        failureStage: TOOL_FAILURE_STAGE.APPROVAL,
      },
    );
    expect(cancelled.turn.recovery.type).toBe(
      CONTROLLED_RECOVERY_DIRECTIVE.AWAIT_USER,
    );
    expect(cancelled.executeTool).toHaveBeenCalledTimes(1);

    for (const proposal of [replaceProposal, writeProposal]) {
      const failed = await executeAtControlledEntry(
        entryPath,
        lifecycle,
        proposal,
        {
          ok: false,
          error: "Approved handler invocation failed.",
          failureStage: TOOL_FAILURE_STAGE.EXECUTION,
        },
      );
      expect(failed.turn.recovery.type).toBe(
        CONTROLLED_RECOVERY_DIRECTIVE.TERMINAL_UNCERTAIN,
      );
      expect(failed.turn.lifecycle.status).toBe(
        CONTROLLED_IMPLEMENTATION_STATUS.TERMINAL_UNCERTAIN,
      );
      expect(failed.executeTool).toHaveBeenCalledTimes(1);
    }
  },
);

test("shared controlled turn fails closed without canonical state or with conflicting result identity", async () => {
  const missing = await executeControlledImplementationTurn({
    lifecycle: { job: createLifecycle().job },
    toolCall: { name: "read_file", args: { path: "src/App.jsx" } },
    executeTool: jest.fn(),
  });
  expect(missing.lifecycle).toBeNull();
  expect(missing.recovery.type).toBe(
    CONTROLLED_RECOVERY_DIRECTIVE.TERMINAL_UNCERTAIN,
  );
  expect(isCanonicalControlledImplementationLifecycle(createLifecycle())).toBe(
    true,
  );

  const lifecycle = createLifecycle();
  const conflict = await executeControlledImplementationTurn({
    lifecycle,
    toolCall: { name: "read_file", args: { path: "src/App.jsx" } },
    executeTool: async ({ toolName, args }) => ({
      ok: true,
      callId: "conflicting-controlled-call",
      toolName,
      args,
      result: "wrong correlation",
    }),
  });
  expect(conflict.lifecycle.status).toBe(
    CONTROLLED_IMPLEMENTATION_STATUS.CORRELATION_FAILURE,
  );
  expect(conflict.recovery.type).toBe(
    CONTROLLED_RECOVERY_DIRECTIVE.TERMINAL_UNCERTAIN,
  );
  expect(conflict.toolResult.callId).toBe("conflicting-controlled-call");
  expect(conflict.toolResult.controlledCallId).not.toBe(
    conflict.toolResult.callId,
  );
});

test("model completion prose cannot complete a pending structured operation", () => {
  const lifecycle = createLifecycle();
  const prose = continueControlledImplementationAfterProse(lifecycle, {
    reason: "Model said done.",
  });

  expect(prose.shouldContinue).toBe(true);
  expect(prose.lifecycle.status).toBe(
    CONTROLLED_IMPLEMENTATION_STATUS.ACTIVE,
  );
  expect(prose.lifecycle.job.completedOperationIds).toEqual([]);
  expect(isPendingControlledImplementation(prose.lifecycle)).toBe(true);
});
