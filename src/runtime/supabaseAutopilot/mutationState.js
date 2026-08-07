import { validateSupabaseAutopilotReconciliation } from "../../ai/supabaseAutopilot/reconciliationSchema";

const PRODUCTION_PROJECT_PATTERN =
  /(?:^|[\s._-])(?:prod|production|live)(?:$|[\s._-])/i;

export const initialSupabaseMutationState = Object.freeze({
  phase: "unavailable",
  approval: null,
  error: "",
  message: "",
});

export function supabaseMutationReducer(state, action) {
  switch (action.type) {
    case "reset":
      return initialSupabaseMutationState;
    case "reconciliation_available":
      return {
        phase: "awaiting-approval",
        approval: null,
        error: "",
        message: "",
      };
    case "approval_begin":
      if (state.phase !== "awaiting-approval") return state;
      return {
        phase: "preparing-approval",
        approval: null,
        error: "",
        message: "Revalidating the approved reconciliation in read-only mode…",
      };
    case "approved":
      if (state.phase !== "preparing-approval") return state;
      return {
        phase: "approved",
        approval: action.approval,
        error: "",
        message: "Approval is bound to this exact project and reconciliation.",
      };
    case "approval_error":
      if (state.phase !== "preparing-approval") return state;
      return {
        phase: "awaiting-approval",
        approval: null,
        error: safeMutationError(action.error),
        message: "",
      };
    case "applying":
      if (state.phase !== "approved") return state;
      return {
        phase: "applying",
        approval: null,
        error: "",
        message: "Applying the approved migration once…",
      };
    case "applied":
      if (state.phase !== "applying") return state;
      return {
        phase: "applied-awaiting-verification",
        approval: null,
        error: "",
        message:
          "Mutation returned successfully. Running mandatory read-only verification…",
      };
    case "verified":
      if (state.phase !== "applied-awaiting-verification") return state;
      return {
        phase: "verified",
        approval: null,
        error: "",
        message:
          `Verified by fresh read-only migration metadata and independent schema reconciliation. Supabase-assigned version ${action.providerVersion}.`,
      };
    case "failed":
      if (state.phase !== "applying") return state;
      return {
        phase: "failed",
        approval: null,
        error: safeMutationError(action.error),
        message:
          "Database state may be uncertain. Create a fresh read-only plan before any new approval.",
      };
    case "verification_failed":
      if (state.phase !== "applied-awaiting-verification") return state;
      return {
        phase: "verification-failed",
        approval: null,
        error: safeMutationError(action.error),
        message:
          "Verification was not conclusive. The migration will not be retried; create a fresh read-only plan.",
      };
    case "blocked":
      return {
        phase: "blocked",
        approval: null,
        error: safeMutationError(action.error),
        message: "",
      };
    default:
      return state;
  }
}

export function getSupabaseMutationEligibility({
  reconciliation,
  verifiedProject,
} = {}) {
  const validation =
    validateSupabaseAutopilotReconciliation(reconciliation);
  if (!validation.valid) return blocked(validation.errors[0]);

  const projectReference = String(verifiedProject?.reference || "").trim();
  const projectName = String(verifiedProject?.name || "").trim();
  if (
    !projectReference ||
    !projectName ||
    reconciliation.selectedProject.reference !== projectReference ||
    reconciliation.selectedProject.name !== projectName
  ) {
    return blocked("The reconciliation does not match the selected project.");
  }
  if (PRODUCTION_PROJECT_PATTERN.test(projectName)) {
    return blocked("Production or live projects cannot receive mutations.");
  }
  if (
    reconciliation.status !== "additive-proposal" ||
    reconciliation.proposedMigration.status !== "unused" ||
    reconciliation.proposedMigration.identity !==
      reconciliation.proposedMigration.name ||
    reconciliation.manualReview.length ||
    reconciliation.conflicts.length ||
    !reconciliation.proposedAdditiveChanges.length ||
    !reconciliation.sqlDraft
  ) {
    return blocked(
      "Only a clean, unused additive reconciliation is eligible for approval.",
    );
  }
  return {
    eligible: true,
    reason: "",
    projectReference,
    projectName,
    migrationName: reconciliation.proposedMigration.name,
    reconciliationFingerprint: reconciliation.fingerprint,
  };
}

export function createSupabaseMutationApprovalRequest({
  reconciliation,
  verifiedProject,
  confirmedDevelopmentProjectReference,
} = {}) {
  const eligibility = getSupabaseMutationEligibility({
    reconciliation,
    verifiedProject,
  });
  if (!eligibility.eligible) throw new Error(eligibility.reason);
  if (
    confirmedDevelopmentProjectReference !== eligibility.projectReference
  ) {
    throw new Error(
      "Explicit development-only confirmation for this exact project is required.",
    );
  }
  return {
    reconciliation,
    confirmedDevelopmentProjectReference,
  };
}

export function validatePreparedSupabaseApproval(
  approval,
  reconciliation,
  verifiedProject,
) {
  const eligibility = getSupabaseMutationEligibility({
    reconciliation,
    verifiedProject,
  });
  if (!eligibility.eligible) return false;
  return Boolean(
    approval &&
      typeof approval === "object" &&
      /^[a-z0-9-]{20,160}$/.test(String(approval.approvalToken || "")) &&
      approval.projectReference === eligibility.projectReference &&
      approval.migrationName === eligibility.migrationName &&
      approval.reconciliationFingerprint ===
        eligibility.reconciliationFingerprint,
  );
}

export function canApplyPreparedSupabaseApproval(
  mutationState,
  reconciliation,
  verifiedProject,
) {
  return Boolean(
    mutationState?.phase === "approved" &&
      validatePreparedSupabaseApproval(
        mutationState.approval,
        reconciliation,
        verifiedProject,
      ),
  );
}

export function verifySupabaseMutationResult({
  plan,
  reconciliation,
  expectedProjectReference,
  expectedMigrationName,
} = {}) {
  const validation =
    validateSupabaseAutopilotReconciliation(reconciliation);
  if (!validation.valid) {
    return blocked(`Fresh reconciliation was invalid: ${validation.errors[0]}`);
  }
  const migrations = plan?.remoteSupabaseFindings?.migrations;
  if (
    plan?.selectedProjectReference !== expectedProjectReference ||
    reconciliation.selectedProject.reference !== expectedProjectReference ||
    !Array.isArray(migrations)
  ) {
    return blocked("Fresh verification did not match the approved mutation.");
  }
  const nameMatches = migrations.filter(
    (migration) => migration.name === expectedMigrationName,
  );
  if (nameMatches.length !== 1) {
    return blocked(
      nameMatches.length
        ? "Managed migration-name metadata is ambiguous."
        : "The managed migration name was not found.",
    );
  }
  if (
    reconciliation.status !== "already-satisfied" ||
    reconciliation.proposedAdditiveChanges.length ||
    reconciliation.manualReview.length ||
    reconciliation.conflicts.length
  ) {
    return blocked(
      "Migration history was present, but bounded schema structure was not independently satisfied.",
    );
  }
  return {
    eligible: true,
    reason: "",
    providerVersion: nameMatches[0].version,
  };
}

export function safeMutationError(error) {
  const message =
    typeof error === "string"
      ? error
      : error?.message || "Supabase migration workflow failed.";
  return String(message)
    .replace(/\bsb_secret_[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(
      /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g,
      "[redacted]",
    )
    .replace(/\bpostgres(?:ql)?:\/\/[^\s]+/gi, "[redacted database URL]")
    .replace(
      /\b(access_?token|refresh_?token|service_?role_?key|database_?password|api_?key)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[redacted]",
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);
}

function blocked(reason) {
  return { eligible: false, reason: safeMutationError(reason) };
}
