import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  createSupabaseAutopilotReconciliation,
  validateSupabaseAutopilotReconciliation,
} from "../../ai/supabaseAutopilot/reconciliationSchema";
import {
  createSupabaseAutopilotPlan,
  validateSupabaseAutopilotPlan,
} from "../../ai/supabaseAutopilot/planSchema";
import { presentSupabaseAutopilotPlan } from "../../ai/supabaseAutopilot/planPresentation";
import {
  supabaseAutopilotApplyApprovedMigration,
  supabaseAutopilotPlanInspection,
  supabaseAutopilotPrepareMigrationApproval,
} from "../serviceRunner";
import {
  canStartSupabasePlanning,
  initialSupabasePlanningState,
  supabasePlanningReducer,
} from "./planningState";
import {
  canApplyPreparedSupabaseApproval,
  createSupabaseMutationApprovalRequest,
  getSupabaseMutationEligibility,
  initialSupabaseMutationState,
  supabaseMutationReducer,
  validatePreparedSupabaseApproval,
  verifySupabaseMutationResult,
} from "./mutationState";

const actionStyle = {
  border: "1px solid rgba(244, 185, 66, 0.45)",
  background: "rgba(244, 185, 66, 0.12)",
  color: "#fde68a",
  borderRadius: "7px",
  padding: "7px 11px",
  fontSize: "12px",
  fontWeight: 700,
};

export default function SupabasePlanningPanel({
  verifiedProject,
  projectPath,
  inspectPlanning = supabaseAutopilotPlanInspection,
  reconcilePlan = createSupabaseAutopilotReconciliation,
  prepareMigrationApproval = supabaseAutopilotPrepareMigrationApproval,
  applyApprovedMigration = supabaseAutopilotApplyApprovedMigration,
  workflowRequest = null,
  onWorkflowRequestHandled = null,
  onStartAppWiring = null,
}) {
  const [objective, setObjective] = useState("");
  const [developmentConfirmed, setDevelopmentConfirmed] = useState(false);
  const requestGenerationRef = useRef(0);
  const handledWorkflowRequestIdRef = useRef("");
  const approvalInFlightRef = useRef(false);
  const applyInFlightRef = useRef(false);
  const planningIdentityRef = useRef(null);
  const [state, dispatch] = useReducer(
    supabasePlanningReducer,
    initialSupabasePlanningState,
  );
  const [mutationState, mutationDispatch] = useReducer(
    supabaseMutationReducer,
    initialSupabaseMutationState,
  );
  const mutationLocked = [
    "applying",
    "applied-awaiting-verification",
  ].includes(mutationState.phase);
  const canStart = canStartSupabasePlanning({
    verifiedProject,
    projectPath,
    objective,
  });
  const canCreatePlan =
    canStart && state.phase !== "loading" && !mutationLocked;
  const verifiedProjectReference = String(
    verifiedProject?.reference || "",
  ).trim();
  const boundedProjectPath = String(projectPath || "").trim();

  useEffect(() => {
    const nextPlanningIdentity =
      `${verifiedProjectReference}\n${boundedProjectPath}`;

    if (planningIdentityRef.current === null) {
      planningIdentityRef.current = nextPlanningIdentity;
      return;
    }

    if (planningIdentityRef.current === nextPlanningIdentity) return;

    planningIdentityRef.current = nextPlanningIdentity;
    requestGenerationRef.current += 1;
    dispatch({ type: "reset" });
    mutationDispatch({ type: "reset" });
    setDevelopmentConfirmed(false);
    approvalInFlightRef.current = false;
    applyInFlightRef.current = false;
  }, [verifiedProjectReference, boundedProjectPath]);

  // Project/path changes and new plan runs already advance requestGenerationRef.
  // Do not advance it from effect cleanup: React StrictMode intentionally
  // performs a development cleanup/setup cycle that must not invalidate a
  // legitimate in-flight read-only inspection.

  const runReadOnlyPlan = useCallback(async (requestedObjectiveInput) => {
    const requestedObjective = String(requestedObjectiveInput || "").trim().slice(0, 1200);
    const canStartRequestedPlan = canStartSupabasePlanning({
      verifiedProject,
      projectPath: boundedProjectPath,
      objective: requestedObjective,
    });
    if (!canStartRequestedPlan || state.phase === "loading" || mutationLocked) return false;

    const requestGeneration = requestGenerationRef.current + 1;
    requestGenerationRef.current = requestGeneration;
    const requestedProjectReference = verifiedProjectReference;
    const requestedProjectPath = boundedProjectPath;
    dispatch({ type: "begin" });
    mutationDispatch({ type: "reset" });
    setDevelopmentConfirmed(false);
    approvalInFlightRef.current = false;
    applyInFlightRef.current = false;
    try {
      const inspection = await inspectPlanning(requestedProjectReference, requestedProjectPath);
      if (requestGeneration !== requestGenerationRef.current) return false;
      const plan = createSupabaseAutopilotPlan({
        objective: requestedObjective,
        selectedProjectReference: requestedProjectReference,
        inspection,
      });
      const validation = validateSupabaseAutopilotPlan(plan);
      if (!validation.valid) throw new Error(`Plan validation failed: ${validation.errors[0]}`);
      const reconciliation = reconcilePlan(plan);
      const reconciliationValidation = validateSupabaseAutopilotReconciliation(reconciliation);
      if (!reconciliationValidation.valid) {
        throw new Error(`Reconciliation validation failed: ${reconciliationValidation.errors[0]}`);
      }
      if (requestGeneration !== requestGenerationRef.current) return false;
      dispatch({ type: "success", plan, reconciliation, presentation: presentSupabaseAutopilotPlan(plan) });
      const mutationEligibility = getSupabaseMutationEligibility({ reconciliation, verifiedProject });
      mutationDispatch({
        type: mutationEligibility.eligible ? "reconciliation_available" : "blocked",
        error: mutationEligibility.reason,
      });
      return true;
    } catch (error) {
      if (requestGeneration === requestGenerationRef.current) dispatch({ type: "error", error });
      return false;
    }
  }, [
    verifiedProject,
    boundedProjectPath,
    state.phase,
    mutationLocked,
    verifiedProjectReference,
    inspectPlanning,
    reconcilePlan,
  ]);

  async function createPlan(event) {
    event.preventDefault();
    if (!canCreatePlan) return;
    await runReadOnlyPlan(objective);
  }

  useEffect(() => {
    const requestId = String(workflowRequest?.id || "").trim();
    if (!requestId || handledWorkflowRequestIdRef.current === requestId ||
        workflowRequest?.workflow !== "supabase_autopilot" ||
        workflowRequest?.mode !== "planning_read_only") return;

    const requestedObjective = String(workflowRequest?.objective || "")
      .trim()
      .slice(0, 1200);
    if (!requestedObjective) return;
    setObjective(requestedObjective);

    if (
      !verifiedProjectReference ||
      !boundedProjectPath ||
      state.phase === "loading" ||
      mutationLocked
    ) {
      return;
    }

    handledWorkflowRequestIdRef.current = requestId;
    const planRun = runReadOnlyPlan(requestedObjective);
    if (typeof onWorkflowRequestHandled === "function") {
      onWorkflowRequestHandled(requestId);
    }
    void planRun;
  }, [
    workflowRequest,
    verifiedProjectReference,
    boundedProjectPath,
    state.phase,
    mutationLocked,
    onWorkflowRequestHandled,
    runReadOnlyPlan,
  ]);

  const presentation = state.presentation;
  const reconciliation = state.reconciliation;
  const mutationEligibility = getSupabaseMutationEligibility({
    reconciliation,
    verifiedProject,
  });
  const canStartAppWiring =
    typeof onStartAppWiring === "function" &&
    !!state.plan &&
    !!reconciliation &&
    (mutationState.phase === "verified" ||
      reconciliation.status === "already-satisfied");

  function startAppWiring() {
    if (!canStartAppWiring) return;
    onStartAppWiring({
      plan: state.plan,
      reconciliation,
      verifiedProject,
      projectPath: boundedProjectPath,
    });
  }

  async function approveMigration() {
    if (
      approvalInFlightRef.current ||
      mutationState.phase !== "awaiting-approval"
    ) {
      return;
    }
    approvalInFlightRef.current = true;
    const approvalGeneration = requestGenerationRef.current;
    try {
      const request = createSupabaseMutationApprovalRequest({
        reconciliation,
        verifiedProject,
        confirmedDevelopmentProjectReference: developmentConfirmed
          ? verifiedProjectReference
          : "",
      });
      mutationDispatch({ type: "approval_begin" });
      const approval = await prepareMigrationApproval(request);
      if (approvalGeneration !== requestGenerationRef.current) return;
      if (
        !validatePreparedSupabaseApproval(
          approval,
          reconciliation,
          verifiedProject,
        )
      ) {
        throw new Error(
          "Prepared approval did not match the current reconciliation.",
        );
      }
      mutationDispatch({ type: "approved", approval });
    } catch (error) {
      if (approvalGeneration === requestGenerationRef.current) {
        mutationDispatch({ type: "approval_error", error });
      }
    } finally {
      approvalInFlightRef.current = false;
    }
  }

  async function applyMigration() {
    if (
      applyInFlightRef.current ||
      !canApplyPreparedSupabaseApproval(
        mutationState,
        reconciliation,
        verifiedProject,
      )
    ) {
      return;
    }
    applyInFlightRef.current = true;
    const approval = mutationState.approval;
    const approvedObjective = state.plan.requestedObjective;
    const approvedProjectReference = verifiedProjectReference;
    const approvedProjectPath = boundedProjectPath;
    const expectedMigrationName = reconciliation.proposedMigration.name;
    const approvalGeneration = requestGenerationRef.current;
    mutationDispatch({ type: "applying" });
    try {
      const result = await applyApprovedMigration(approval.approvalToken);
      if (approvalGeneration !== requestGenerationRef.current) return;
      if (result?.status !== "applied-awaiting-verification") {
        throw new Error("Supabase did not confirm the mutation attempt.");
      }
      mutationDispatch({ type: "applied" });
    } catch (error) {
      if (approvalGeneration === requestGenerationRef.current) {
        mutationDispatch({ type: "failed", error });
      }
      return;
    } finally {
      applyInFlightRef.current = false;
    }

    try {
      const inspection = await inspectPlanning(
        approvedProjectReference,
        approvedProjectPath,
      );
      if (approvalGeneration !== requestGenerationRef.current) return;
      const freshPlan = createSupabaseAutopilotPlan({
        objective: approvedObjective,
        selectedProjectReference: approvedProjectReference,
        inspection,
      });
      const planValidation = validateSupabaseAutopilotPlan(freshPlan);
      if (!planValidation.valid) {
        throw new Error(
          `Fresh plan validation failed: ${planValidation.errors[0]}`,
        );
      }
      const freshReconciliation = reconcilePlan(freshPlan);
      if (approvalGeneration !== requestGenerationRef.current) return;
      const verification = verifySupabaseMutationResult({
        plan: freshPlan,
        reconciliation: freshReconciliation,
        expectedProjectReference: approvedProjectReference,
        expectedMigrationName,
      });
      if (!verification.eligible) throw new Error(verification.reason);
      dispatch({
        type: "success",
        plan: freshPlan,
        reconciliation: freshReconciliation,
        presentation: presentSupabaseAutopilotPlan(freshPlan),
      });
      mutationDispatch({ type: "verified", providerVersion: verification.providerVersion });
    } catch (error) {
      if (approvalGeneration === requestGenerationRef.current) {
        mutationDispatch({ type: "verification_failed", error });
      }
    }
  }

  return (
    <section
      aria-label="Supabase planning only"
      style={{
        display: "grid",
        gap: "10px",
        padding: "12px",
        border: "1px solid #3f3f46",
        borderRadius: "9px",
        background: "rgba(9, 9, 11, 0.45)",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 800 }}>
        Plan a Supabase feature
      </div>
      <div style={{ color: "#a7f3d0", fontSize: "12px", lineHeight: 1.45 }}>
        Inspection is read-only. KForge will inspect metadata and application
        structure, then create a plan. It will not change either project.
      </div>

      {!verifiedProject ? (
        <div style={{ color: "#a1a1aa", fontSize: "12px" }}>
          Connect and verify a development project to start planning.
        </div>
      ) : !projectPath || !String(projectPath).trim() ? (
        <div style={{ color: "#fca5a5", fontSize: "12px" }}>
          Open the application you want to inspect before planning.
        </div>
      ) : null}

      <form onSubmit={createPlan} style={{ display: "grid", gap: "8px" }}>
        <label style={{ display: "grid", gap: "5px", fontSize: "12px" }}>
          <span>What should a future implementation add?</span>
          <textarea
            aria-label="Supabase feature objective"
            value={objective}
            onChange={(event) => {
              requestGenerationRef.current += 1;
              setObjective(event.target.value.slice(0, 1200));
              if (state.phase !== "idle") dispatch({ type: "reset" });
              mutationDispatch({ type: "reset" });
              setDevelopmentConfirmed(false);
              approvalInFlightRef.current = false;
              applyInFlightRef.current = false;
            }}
            disabled={state.phase === "loading" || mutationLocked}
            placeholder="For example: Add sign-in and save each user’s progress."
            rows={3}
            style={{
              resize: "vertical",
              minHeight: "66px",
              border: "1px solid #52525b",
              borderRadius: "7px",
              background: "#18181b",
              color: "#f4f4f5",
              padding: "8px",
              fontSize: "12px",
            }}
          />
        </label>
        <details style={{ color: "#a1a1aa", fontSize: "12px" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            ? Beginner help
          </summary>
          <div style={{ marginTop: "6px" }}>
            KForge is only checking your app and database and drafting what
            would need to change. Nothing is changed yet.
          </div>
        </details>

        <button
          type="submit"
          style={{
            ...actionStyle,
            cursor: canCreatePlan ? "pointer" : "not-allowed",
            opacity: canCreatePlan ? 1 : 0.55,
          }}
          disabled={!canCreatePlan}
        >
          {state.phase === "loading"
            ? "Inspecting read-only…"
            : "Create read-only plan"}
        </button>
      </form>

      {state.phase === "error" ? (
        <div role="alert" style={{ color: "#fca5a5", fontSize: "12px" }}>
          {state.error}
        </div>
      ) : null}

      {state.phase === "success" && presentation ? (
        <article
          aria-label="Supabase implementation plan"
          style={{
            display: "grid",
            gap: "9px",
            padding: "10px",
            border: "1px solid rgba(134, 239, 172, 0.32)",
            borderRadius: "8px",
            background: "rgba(20, 83, 45, 0.12)",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: "#86efac", fontWeight: 800 }}>
            {presentation.title}
          </div>
          {presentation.summary.map((line) => (
            <div key={line}>{line}</div>
          ))}
          <div>
            <strong>Proposed plan</strong>
            <ol style={{ margin: "6px 0 0", paddingLeft: "20px" }}>
              {presentation.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          {presentation.unsupportedConditions.length ? (
            <div style={{ color: "#fca5a5" }}>
              <strong>Unsupported conditions</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: "20px" }}>
                {presentation.unsupportedConditions.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {presentation.warnings.length ? (
            <div style={{ color: "#fde68a" }}>
              <strong>Warnings</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: "20px" }}>
                {presentation.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            Risk: {presentation.risk} · Plan ID:{" "}
            <code>{presentation.shortFingerprint}</code>
          </div>
          <div
            role="status"
            style={{ color: "#a7f3d0", fontWeight: 800 }}
          >
            No database or application changes were made.
          </div>
          {reconciliation ? (
            <ReconciliationReview reconciliation={reconciliation} />
          ) : null}
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Technical details
            </summary>
            <pre
              style={{
                maxHeight: "320px",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: "8px 0 0",
                padding: "8px",
                borderRadius: "6px",
                background: "#09090b",
                color: "#d4d4d8",
                fontSize: "11px",
              }}
            >
              {JSON.stringify(
                {
                  plan: state.plan,
                  reconciliation,
                },
                null,
                2,
              )}
            </pre>
          </details>
          <MigrationMutationReview
            reconciliation={reconciliation}
            verifiedProject={verifiedProject}
            eligibility={mutationEligibility}
            mutationState={mutationState}
            developmentConfirmed={developmentConfirmed}
            onDevelopmentConfirmation={setDevelopmentConfirmed}
            onApprove={approveMigration}
            onApply={applyMigration}
          />
          {canStartAppWiring ? (
            <button
              type="button"
              style={actionStyle}
              onClick={startAppWiring}
            >
              Start controlled app wiring
            </button>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}

function MigrationMutationReview({
  reconciliation,
  verifiedProject,
  eligibility,
  mutationState,
  developmentConfirmed,
  onDevelopmentConfirmation,
  onApprove,
  onApply,
}) {
  const canApprove =
    eligibility.eligible &&
    developmentConfirmed &&
    mutationState.phase === "awaiting-approval";
  const canApply =
    eligibility.eligible && mutationState.phase === "approved";

  return (
    <section
      aria-label="Approved development migration"
      style={{
        display: "grid",
        gap: "8px",
        padding: "10px",
        border: "1px solid rgba(248, 113, 113, 0.5)",
        borderRadius: "8px",
        background: "rgba(127, 29, 29, 0.12)",
      }}
    >
      <div style={{ color: "#fca5a5", fontWeight: 800 }}>
        Development database mutation
      </div>
      <details style={{ color: "#d4d4d8", fontSize: "12px" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          ? Beginner help
        </summary>
        <div style={{ marginTop: "6px" }}>
          This section is where KForge can actually change Supabase, but only
          when its safety checks say the proposal is eligible. A migration is
          simply a saved set of database changes. KForge checks the database
          again afterwards to confirm an applied change worked.
        </div>
      </details>
      {!eligibility.eligible ? (
        mutationState.phase === "verified" ? null : (
          <div style={{ color: "#fca5a5" }}>
            Mutation unavailable: {eligibility.reason}
          </div>
        )
      ) : (
        <>
          <div>
            Project: <strong>{verifiedProject.name}</strong>
          </div>
          <div>
            Reference: <code>{verifiedProject.reference}</code>
          </div>
          <div>
            Managed migration name:{" "}
            <code>{reconciliation.proposedMigration.name}</code>
          </div>
          <div>
            Reconciliation status: {displayStatus(reconciliation.status)}
          </div>
          <div>
            <strong>Proposed additive changes</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: "20px" }}>
              {reconciliation.proposedAdditiveChanges.map((change, index) => (
                <li key={`${change.operation}:${change.table}:${index}`}>
                  <code>{change.operation}</code> on{" "}
                  <code>{change.table}</code>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Exact approved SQL</strong>
            <pre
              aria-label="Exact approved migration SQL"
              style={{
                maxHeight: "320px",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: "6px 0 0",
                padding: "8px",
                borderRadius: "6px",
                background: "#09090b",
                color: "#d4d4d8",
                fontSize: "11px",
              }}
            >
              {reconciliation.sqlDraft}
            </pre>
          </div>

          <div role="alert" style={{ color: "#fecaca", fontWeight: 800 }}>
            Warning: approval and Apply WILL modify the selected Supabase
            database. No automatic retry or rollback will occur.
          </div>
          {mutationState.phase === "awaiting-approval" ? (
            <>
              <label style={{ display: "flex", gap: "8px", alignItems: "start" }}>
                <input
                  aria-label="Confirm development-only Supabase project"
                  type="checkbox"
                  checked={developmentConfirmed}
                  onChange={(event) =>
                    onDevelopmentConfirmation(event.target.checked)
                  }
                />
                <span>
                  I explicitly confirm that project{" "}
                  <code>{verifiedProject.reference}</code> is development-only
                  and safe to modify.
                </span>
              </label>
              <button
                type="button"
                style={{
                  ...actionStyle,
                  cursor: canApprove ? "pointer" : "not-allowed",
                  opacity: canApprove ? 1 : 0.55,
                }}
                disabled={!canApprove}
                onClick={onApprove}
              >
                Approve this exact migration
              </button>
            </>
          ) : null}
          {mutationState.phase === "approved" ? (
            <button
              type="button"
              style={{
                ...actionStyle,
                borderColor: "rgba(248, 113, 113, 0.75)",
                color: "#fecaca",
                cursor: canApply ? "pointer" : "not-allowed",
              }}
              disabled={!canApply}
              onClick={onApply}
            >
              Apply approved migration
            </button>
          ) : null}
        </>
      )}
      {mutationState.message ? (
        <div role="status" style={{ color: "#fde68a", fontWeight: 700 }}>
          {mutationState.message}
        </div>
      ) : null}
      {mutationState.error ? (
        <div role="alert" style={{ color: "#fca5a5" }}>
          {mutationState.error}
        </div>
      ) : null}
    </section>
  );
}

function ReconciliationReview({ reconciliation }) {
  const alreadySatisfied = reconciliation.findings.filter(
    (item) => item.classification === "already-satisfied",
  );
  const additive = reconciliation.findings.filter(
    (item) => item.classification === "additive-proposal",
  );
  const review = reconciliation.findings.filter((item) =>
    [
      "manual-verification-required",
      "conflict",
      "blocked",
    ].includes(item.classification),
  );

  return (
    <section
      aria-label="Migration reconciliation planning only"
      style={{
        display: "grid",
        gap: "8px",
        padding: "10px",
        border: "1px solid rgba(96, 165, 250, 0.38)",
        borderRadius: "8px",
        background: "rgba(30, 64, 175, 0.1)",
      }}
    >
      <div style={{ color: "#93c5fd", fontWeight: 800 }}>
        Migration reconciliation — planning only
      </div>
      <div style={{ color: "#bfdbfe", fontWeight: 700 }}>
        SQL has not been executed. No database or application changes were
        made by reconciliation. Any eligible development mutation requires a
        separate exact approval below.
      </div>
      <details style={{ color: "#bfdbfe", fontSize: "12px" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          ? Beginner help
        </summary>
        <div style={{ marginTop: "6px" }}>
          KForge is comparing the draft with your real Supabase structure so
          it can avoid creating something that already exists or conflicts
          with it. A migration is simply a saved set of database changes.
        </div>
      </details>
      <div>
        Status: {displayStatus(reconciliation.status)} · Managed migration name:{" "}
        <code>{reconciliation.proposedMigration.identity}</code>
      </div>
      <FindingList title="Already satisfied or retained" items={alreadySatisfied} />
      <FindingList title="Proposed additive changes" items={additive} />
      <FindingList title="Manual review, conflicts, or blocks" items={review} />
      {reconciliation.warnings.length ? (
        <FindingTextList
          title="Reconciliation warnings"
          items={reconciliation.warnings}
        />
      ) : null}
      {reconciliation.limitations.length ? (
        <FindingTextList
          title="Inspection limitations"
          items={reconciliation.limitations}
        />
      ) : null}
      {reconciliation.sqlDraft ? (
        <div>
          <strong>Review-only SQL draft</strong>
          <pre
            aria-label="Review-only SQL draft"
            style={{
              maxHeight: "320px",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: "6px 0 0",
              padding: "8px",
              borderRadius: "6px",
              background: "#09090b",
              color: "#d4d4d8",
              fontSize: "11px",
            }}
          >
            {reconciliation.sqlDraft}
          </pre>
        </div>
      ) : null}
      <div style={{ color: "#a7f3d0", fontWeight: 800 }}>
        {reconciliation.nothingAppliedStatement}
      </div>
    </section>
  );
}

function FindingList({ title, items }) {
  if (!items.length) return null;
  return (
    <div>
      <strong>{title}</strong>
      <ul style={{ margin: "6px 0 0", paddingLeft: "20px" }}>
        {items.map((item) => (
          <li
            key={`${item.classification}:${item.objectType}:${item.objectName}:${item.summary}`}
          >
            <code>{item.objectName}</code>: {item.summary}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FindingTextList({ title, items }) {
  return (
    <div>
      <strong>{title}</strong>
      <ul style={{ margin: "6px 0 0", paddingLeft: "20px" }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function displayStatus(value) {
  return String(value || "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
