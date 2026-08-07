import React, { useEffect, useReducer, useRef, useState } from "react";
import {
  createSupabaseAutopilotReconciliation,
  validateSupabaseAutopilotReconciliation,
} from "../../ai/supabaseAutopilot/reconciliationSchema";
import {
  createSupabaseAutopilotPlan,
  validateSupabaseAutopilotPlan,
} from "../../ai/supabaseAutopilot/planSchema";
import { presentSupabaseAutopilotPlan } from "../../ai/supabaseAutopilot/planPresentation";
import { supabaseAutopilotPlanInspection } from "../serviceRunner";
import {
  canStartSupabasePlanning,
  initialSupabasePlanningState,
  supabasePlanningReducer,
} from "./planningState";

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
}) {
  const [objective, setObjective] = useState("");
  const requestGenerationRef = useRef(0);
  const [state, dispatch] = useReducer(
    supabasePlanningReducer,
    initialSupabasePlanningState,
  );
  const canStart = canStartSupabasePlanning({
    verifiedProject,
    projectPath,
    objective,
  });
  const verifiedProjectReference = String(
    verifiedProject?.reference || "",
  ).trim();
  const boundedProjectPath = String(projectPath || "").trim();

  useEffect(() => {
    requestGenerationRef.current += 1;
    dispatch({ type: "reset" });
  }, [verifiedProjectReference, boundedProjectPath]);

  useEffect(
    () => () => {
      requestGenerationRef.current += 1;
    },
    [],
  );

  async function createPlan(event) {
    event.preventDefault();
    if (!canStart || state.phase === "loading") return;

    const requestGeneration = requestGenerationRef.current + 1;
    requestGenerationRef.current = requestGeneration;
    const requestedObjective = objective;
    const requestedProjectReference = verifiedProjectReference;
    const requestedProjectPath = boundedProjectPath;
    dispatch({ type: "begin" });
    try {
      const inspection = await inspectPlanning(
        requestedProjectReference,
        requestedProjectPath,
      );
      if (requestGeneration !== requestGenerationRef.current) return;
      const plan = createSupabaseAutopilotPlan({
        objective: requestedObjective,
        selectedProjectReference: requestedProjectReference,
        inspection,
      });
      const validation = validateSupabaseAutopilotPlan(plan);
      if (!validation.valid) {
        throw new Error(`Plan validation failed: ${validation.errors[0]}`);
      }
      const reconciliation = reconcilePlan(plan);
      const reconciliationValidation =
        validateSupabaseAutopilotReconciliation(reconciliation);
      if (!reconciliationValidation.valid) {
        throw new Error(
          `Reconciliation validation failed: ${reconciliationValidation.errors[0]}`,
        );
      }
      if (requestGeneration !== requestGenerationRef.current) return;
      dispatch({
        type: "success",
        plan,
        reconciliation,
        presentation: presentSupabaseAutopilotPlan(plan),
      });
    } catch (error) {
      if (requestGeneration === requestGenerationRef.current) {
        dispatch({ type: "error", error });
      }
    }
  }

  const presentation = state.presentation;
  const reconciliation = state.reconciliation;

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
            }}
            disabled={state.phase === "loading"}
            placeholder="For example: Add sign-in and save each user’s Hajj progress."
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
        <button
          type="submit"
          style={{
            ...actionStyle,
            cursor: canStart ? "pointer" : "not-allowed",
            opacity: canStart ? 1 : 0.55,
          }}
          disabled={!canStart || state.phase === "loading"}
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
          <button type="button" style={{ ...actionStyle, opacity: 0.55 }} disabled>
            Implementation is not available in this milestone
          </button>
        </article>
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
        made. Migration application is unavailable until a later milestone.
      </div>
      <div>
        Status: {displayStatus(reconciliation.status)} · Migration ID:{" "}
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
