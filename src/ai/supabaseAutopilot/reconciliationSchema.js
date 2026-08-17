import {
  SUPPORTED_FRAMEWORK,
  SUPPORTED_PACKAGE_MANAGERS,
  buildApplicationOperationId,
  fingerprintPlan,
  isBoundedApplicationPath,
  validateSupabaseAutopilotPlan,
} from "./planSchema";

export const SUPABASE_AUTOPILOT_RECONCILIATION_VERSION =
  "supabase-autopilot-reconciliation/v1";

export const RECONCILIATION_CLASSIFICATIONS = Object.freeze([
  "already-satisfied",
  "additive-proposal",
  "manual-verification-required",
  "conflict",
  "blocked",
]);

const RECONCILIATION_STATUSES = new Set([
  "already-satisfied",
  "additive-proposal",
  "manual-review-required",
  "conflict",
  "blocked",
]);
const CLASSIFICATIONS = new Set(RECONCILIATION_CLASSIFICATIONS);
const SAFE_DATA_TYPES = new Map([
  ["bigint", "bigint"],
  ["bool", "boolean"],
  ["boolean", "boolean"],
  ["date", "date"],
  ["int4", "integer"],
  ["int8", "bigint"],
  ["integer", "integer"],
  ["jsonb", "jsonb"],
  ["text", "text"],
  ["timestamp with time zone", "timestamptz"],
  ["timestamptz", "timestamptz"],
  ["uuid", "uuid"],
  ["varchar", "varchar"],
]);
const MANAGED_OWNER_POLICY_NAME = "kforge_owner_all";
const PRODUCTION_PROJECT_PATTERN =
  /(?:^|[\s._-])(?:prod|production|live)(?:$|[\s._-])/i;
const SECRET_VALUE_PATTERNS = [
  /\bsb_secret_[A-Za-z0-9_-]+\b/,
  /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/,
  /\bpostgres(?:ql)?:\/\/[^\s]+:[^@\s]+@/i,
];
const SECRET_KEY_PATTERN =
  /(?:^|_)(?:access_?token|refresh_?token|password|secret|service_?role|database_?url|private_?key|api_?key)(?:$|_)/i;
const ROW_CONTENT_KEY_PATTERN =
  /^(?:row|rows|rowData|rowContents|records|recordContents)$/i;
const FORBIDDEN_SQL_PATTERN =
  /\b(?:drop|truncate|delete|grant|revoke|security\s+definer|owner(?:ship)?\s+to)\b/i;
const NOTHING_APPLIED_STATEMENT =
  "Planning only: nothing was applied. SQL was not executed and no database or application changes were made.";

export function createSupabaseAutopilotReconciliation(plan) {
  const inputError = validateReconciliationPlanInput(plan);
  if (inputError) {
    throw new Error(`The reconciliation input was rejected: ${inputError}`);
  }
  const planValidation = validateSupabaseAutopilotPlan(plan);
  if (!planValidation.valid) {
    throw new Error(
      `The reconciliation input was rejected: ${planValidation.errors[0]}`,
    );
  }

  const proposedMigration = buildMigrationIdentity(plan);
  const warnings = uniqueStrings([
    ...(plan.warnings || []),
    NOTHING_APPLIED_STATEMENT,
    "Migration application requires separate development-only review and explicit approval.",
  ]);
  const limitations = [
    "Database row state was not inspected. Required additions to existing tables cannot be assumed safe.",
  ];
  const blockedReasons = findBlockedReasons(plan);
  const migrationFinding = reconcileMigrationHistory(
    proposedMigration,
    plan.remoteSupabaseFindings.migrations,
  );

  if (migrationFinding.classification === "conflict") {
    blockedReasons.push(migrationFinding.summary);
  }

  if (blockedReasons.length) {
    const blockedFindings = uniqueStrings(blockedReasons).map((summary) =>
      finding("blocked", "plan", plan.fingerprint, summary),
    );
    return finishResult({
      plan,
      proposedMigration: {
        ...proposedMigration,
        status:
          migrationFinding.classification === "conflict"
            ? "collision"
            : "blocked",
      },
      status: "blocked",
      findings: [...blockedFindings, migrationFinding],
      proposedAdditiveChanges: [],
      manualReview: [],
      conflicts:
        migrationFinding.classification === "conflict"
          ? [migrationFinding]
          : [],
      warnings,
      limitations,
      sqlDraft: "",
    });
  }

  const findings = [migrationFinding];
  const proposedAdditiveChanges = [];
  const manualReview = [];
  const conflicts = [];
  const unresolvedPolicyIntents = [];
  const remoteTables = new Map(
    plan.remoteSupabaseFindings.tables.map((table) => [table.name, table]),
  );
  const proposedTableNames = new Set(
    plan.proposedDatabaseObjects.map((proposal) => proposal.name),
  );

  for (const proposal of plan.proposedDatabaseObjects) {
    reconcileDatabaseObject({
      proposal,
      remoteTable: remoteTables.get(proposal.name),
      findings,
      proposedAdditiveChanges,
      manualReview,
      conflicts,
    });
  }
  for (const remoteTable of plan.remoteSupabaseFindings.tables) {
    if (!proposedTableNames.has(remoteTable.name)) {
      findings.push(
        finding(
          "already-satisfied",
          "retained-table",
          remoteTable.name,
          "This extra remote table is outside the requested change and remains untouched; no deletion is proposed.",
        ),
      );
    }
  }
  for (const remoteMigration of plan.remoteSupabaseFindings.migrations) {
    if (remoteMigration.name !== proposedMigration.name) {
      findings.push(
        finding(
          "already-satisfied",
          "retained-migration",
          remoteMigration.version,
          "This recorded remote migration is outside the proposed migration identity and remains untouched.",
        ),
      );
    }
  }

  for (const policyIntent of plan.proposedRlsPolicyIntent) {
    if (
      reconcileRlsPolicyIntent({
        policyIntent,
        remotePolicies: plan.remoteSupabaseFindings.policies,
        policyInspectionAvailable:
          plan.remoteSupabaseFindings.policyInspectionAvailable,
        findings,
        proposedAdditiveChanges,
        manualReview,
        conflicts,
      })
    ) {
      unresolvedPolicyIntents.push(policyIntent);
    }
  }
  if (
    plan.proposedRlsPolicyIntent.length &&
    !plan.remoteSupabaseFindings.policyInspectionAvailable
  ) {
    limitations.push(
      "Remote policy definitions were unavailable, so exact policy existence could not be verified.",
    );
  }

  if (
    migrationFinding.classification === "already-satisfied" &&
    proposedAdditiveChanges.length
  ) {
    const recordedConflict = finding(
      "conflict",
      "migration",
      proposedMigration.identity,
      "The deterministic migration identity is already recorded, but inspectable remote structure does not satisfy the plan. Manual review is required.",
    );
    findings.push(recordedConflict);
    conflicts.push(recordedConflict);
  }

  const status = overallStatus({
    proposedAdditiveChanges,
    manualReview,
    conflicts,
  });
  const sqlDraft =
    migrationFinding.classification === "conflict" ||
    conflicts.some((item) => item.objectType === "migration")
      ? ""
      : buildReviewOnlySql(proposedAdditiveChanges, unresolvedPolicyIntents);

  return finishResult({
    plan,
    proposedMigration: {
      ...proposedMigration,
      status:
        migrationFinding.classification === "already-satisfied"
          ? "already-recorded"
          : "unused",
    },
    status,
    findings,
    proposedAdditiveChanges,
    manualReview,
    conflicts,
    warnings,
    limitations,
    sqlDraft,
  });
}

function validateReconciliationPlanInput(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return "The source plan must be an object.";
  }
  try {
    if (JSON.stringify(plan).length > 250_000) {
      return "The source plan exceeded the reconciliation size limit.";
    }
  } catch {
    return "The source plan could not be serialized safely.";
  }
  if (
    !boundedIdentifier(plan.selectedProjectReference, 80) ||
    !isBoundedTextExact(plan.requestedObjective, 1200) ||
    !plan.projectApplicationIdentity ||
    typeof plan.projectApplicationIdentity !== "object" ||
    plan.projectApplicationIdentity.supabaseProjectReference !==
      plan.selectedProjectReference ||
    !isBoundedTextExact(
      plan.projectApplicationIdentity.supabaseProjectName,
      160,
    ) ||
    !isBoundedTextExact(
      plan.projectApplicationIdentity.applicationName,
      160,
    ) ||
    !isBoundedTextExact(
      plan.projectApplicationIdentity.applicationRootName,
      160,
    )
  ) {
    return "Project, application, or objective identity is malformed or unbounded.";
  }

  const collections = [
    [plan.proposedDatabaseObjects, 120],
    [plan.proposedRlsPolicyIntent, 120],
    [plan.proposedApplicationFileOperations, 160],
    [plan.proposedPackageOperations, 20],
    [plan.proposedVerificationSteps, 30],
    [plan.unsupportedConditions, 30],
    [plan.warnings, 60],
  ];
  if (
    collections.some(
      ([value, limit]) => !Array.isArray(value) || value.length > limit,
    )
  ) {
    return "A normalized plan collection is malformed or unbounded.";
  }
  if (
    [...plan.unsupportedConditions, ...plan.warnings].some(
      (item) => !isBoundedTextExact(item, 400),
    ) ||
    plan.proposedVerificationSteps.some(
      (item) => !isBoundedTextExact(item, 400),
    )
  ) {
    return "A warning, limitation, or verification step is malformed or unbounded.";
  }
  if (
    plan.proposedApplicationFileOperations.some(
      (operation) =>
        !operation ||
        typeof operation !== "object" ||
        !isBoundedApplicationPath(operation.path) ||
        !boundedIdentifier(operation.operation, 80) ||
        !isBoundedTextExact(operation.purpose, 500) ||
        !Array.isArray(operation.responsibilities) ||
        operation.responsibilities.length === 0 ||
        operation.responsibilities.length > 12 ||
        operation.responsibilities.some(
          (responsibility) =>
            !responsibility ||
            !boundedIdentifier(responsibility.id, 80) ||
            !isBoundedTextExact(responsibility.purpose, 300),
        ) ||
        !Array.isArray(operation.responsibilityIds) ||
        operation.responsibilityIds.join("\u0000") !==
          operation.responsibilities
            .map((responsibility) => responsibility.id)
            .join("\u0000") ||
        operation.id !==
          buildApplicationOperationId({
            path: operation.path,
            responsibilityIds: operation.responsibilityIds,
          }) ||
        ![
          "supabase-client",
          "auth-session",
          "data-access",
          "react-integration",
        ].includes(operation.role),
    ) ||
    plan.proposedPackageOperations.some(
      (operation) =>
        !operation ||
        typeof operation !== "object" ||
        !boundedIdentifier(operation.operation, 80) ||
        !/^@?[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?$/.test(
          String(operation.package || ""),
        ) ||
        !isBoundedTextExact(operation.reason, 400),
    ) ||
    plan.proposedDatabaseObjects.some(
      (proposal) => !validDatabaseProposal(proposal),
    ) ||
    plan.proposedRlsPolicyIntent.some(
      (intent) => !validPolicyIntent(intent),
    )
  ) {
    return "A normalized proposed operation is malformed or unbounded.";
  }
  if (!validLocalFindings(plan.localApplicationFindings)) {
    return "Local application findings are malformed or unbounded.";
  }

  const remote = plan.remoteSupabaseFindings;
  if (
    !remote ||
    typeof remote !== "object" ||
    remote.projectReference !== plan.selectedProjectReference ||
    remote.projectApiUrl !==
      `https://${plan.selectedProjectReference}.supabase.co` ||
    !Array.isArray(remote.tables) ||
    remote.tables.length > 120 ||
    !Array.isArray(remote.migrations) ||
    remote.migrations.length > 200 ||
    !Array.isArray(remote.policies) ||
    remote.policies.length > 240 ||
    typeof remote.policyInspectionAvailable !== "boolean" ||
    remote.tables.some((table) => !validRemoteTable(table)) ||
    new Set(remote.tables.map((table) => table.name)).size !==
      remote.tables.length ||
    remote.policies.some((policy) => !validRemotePolicy(policy)) ||
    new Set(remote.policies.map((policy) => `${policy.table}:${policy.name}`)).size !==
      remote.policies.length ||
    remote.migrations.some(
      (migration) =>
        !migration ||
        typeof migration !== "object" ||
        !boundedIdentifier(migration.version, 120) ||
        !isBoundedTextExact(migration.name, 160, true),
    )
  ) {
    return "Remote Supabase metadata is malformed or unbounded.";
  }
  return "";
}

export function validateSupabaseAutopilotReconciliation(result) {
  const errors = [];
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return {
      valid: false,
      errors: ["Reconciliation result must be an object."],
    };
  }
  if (result.schemaVersion !== SUPABASE_AUTOPILOT_RECONCILIATION_VERSION) {
    errors.push("Reconciliation version is missing or unsupported.");
  }
  if (
    !/^fnv1a64-[a-f0-9]{16}$/.test(
      String(result.sourcePlanFingerprint || ""),
    )
  ) {
    errors.push("Source plan fingerprint is missing or invalid.");
  }
  if (
    !boundedIdentifier(result.selectedProject?.reference, 80) ||
    !boundedText(result.selectedProject?.name, 160)
  ) {
    errors.push("Selected project identity is missing or invalid.");
  }
  if (!RECONCILIATION_STATUSES.has(result.status)) {
    errors.push("Overall reconciliation status is malformed.");
  }
  if (!validMigrationIdentity(result.proposedMigration)) {
    errors.push("Proposed migration identity is malformed.");
  }
  const collectionsAreMalformed =
    !Array.isArray(result.findings) ||
    !Array.isArray(result.proposedAdditiveChanges) ||
    !Array.isArray(result.manualReview) ||
    !Array.isArray(result.conflicts) ||
    !Array.isArray(result.warnings) ||
    !Array.isArray(result.limitations);
  if (collectionsAreMalformed) {
    errors.push("Reconciliation collections are malformed.");
  } else {
    for (const item of result.findings) {
      if (!validFinding(item)) {
        errors.push("A reconciliation finding is malformed.");
        break;
      }
    }
    for (const item of [...result.manualReview, ...result.conflicts]) {
      if (!validFinding(item)) {
        errors.push("A manual-review or conflict finding is malformed.");
        break;
      }
    }
    for (const change of result.proposedAdditiveChanges) {
      if (!validAdditiveChange(change)) {
        errors.push("A proposed additive change is malformed.");
        break;
      }
    }
    if (
      [...result.warnings, ...result.limitations].some(
        (item) => !boundedText(item, 700),
      )
    ) {
      errors.push("A reconciliation warning or limitation is malformed.");
    }
  }
  if (
    (result.findings || []).length > 800 ||
    (result.proposedAdditiveChanges || []).length > 400 ||
    (result.manualReview || []).length > 400 ||
    (result.conflicts || []).length > 400
  ) {
    errors.push("Reconciliation output exceeded its bounded limits.");
  }
  if (result.canApply !== false) {
    errors.push("A reconciliation result can never be applied.");
  }
  if (result.executionStatus !== "not-applied") {
    errors.push("Reconciliation cannot report an executed mutation.");
  }
  if (result.nothingAppliedStatement !== NOTHING_APPLIED_STATEMENT) {
    errors.push("The result must explicitly state that nothing was applied.");
  }
  const sqlDraft =
    typeof result.sqlDraft === "string" ? result.sqlDraft : "";
  if (typeof result.sqlDraft !== "string") {
    errors.push("The review-only SQL draft must be text.");
  }
  let sqlDraftForForbiddenCheck = sqlDraft;

  if (!collectionsAreMalformed) {
    for (const change of result.proposedAdditiveChanges) {
      if (change.operation !== "grant-authenticated-crud") continue;

      const managedGrant =
        `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${quoteDatabaseName(
          change.table,
        )} TO authenticated;`;

      sqlDraftForForbiddenCheck =
        sqlDraftForForbiddenCheck.replace(managedGrant, "");
    }
  }

  if (
    sqlDraft.length > 30_000 ||
    FORBIDDEN_SQL_PATTERN.test(sqlDraftForForbiddenCheck)
  ) {
    errors.push("The review-only SQL draft contains prohibited content.");
  }
  if (
    sqlDraft &&
    !sqlDraft.startsWith(
      "-- PLANNING ONLY: review artifact; SQL has not been executed.",
    )
  ) {
    errors.push("The SQL draft is missing its planning-only warning.");
  }
  if (!validSqlComments(sqlDraft)) {
    errors.push("The SQL draft contains an unrecognized comment.");
  }
  if (!collectionsAreMalformed) {
    try {
      const suppressSqlDraft =
        result.proposedMigration?.status === "collision" ||
        result.conflicts.some((item) => item.objectType === "migration");
      const expectedSql = suppressSqlDraft
        ? ""
        : buildReviewOnlySql(result.proposedAdditiveChanges, []);
      if (sqlStatementsOnly(sqlDraft) !== sqlStatementsOnly(expectedSql)) {
        errors.push(
          "The SQL draft does not match the validated additive changes.",
        );
      }
    } catch {
      errors.push("The SQL draft could not be derived from its additive changes.");
    }
  }
  const unsafeField = findUnsafeField(result);
  if (unsafeField) errors.push(unsafeField);
  const expectedFingerprint = fingerprintPlan(withoutFingerprint(result));
  if (result.fingerprint !== expectedFingerprint) {
    errors.push("Reconciliation fingerprint does not match its contents.");
  }
  return { valid: errors.length === 0, errors: uniqueStrings(errors) };
}

function reconcileRlsPolicyIntent({
  policyIntent,
  remotePolicies,
  policyInspectionAvailable,
  findings,
  proposedAdditiveChanges,
  manualReview,
  conflicts,
}) {
  if (!policyInspectionAvailable || policyIntent.ownerColumn !== "user_id") {
    const policyFinding = finding(
      "manual-verification-required",
      "rls-policy",
      policyIntent.table,
      "Remote policy definitions were not available in the bounded inspection. Review the requested policy intent manually; no policy is claimed as reconciled.",
    );
    findings.push(policyFinding);
    manualReview.push(policyFinding);
    return true;
  }

  const tablePolicies = remotePolicies.filter(
    (policy) => policy.table === policyIntent.table,
  );
  const managedPolicies = tablePolicies.filter(
    (policy) => policy.name === MANAGED_OWNER_POLICY_NAME,
  );
  const extraPolicies = tablePolicies.filter(
    (policy) => policy.name !== MANAGED_OWNER_POLICY_NAME,
  );
  if (extraPolicies.length) {
    const policyFinding = finding(
      "manual-verification-required",
      "rls-policy",
      policyIntent.table,
      "Additional remote RLS policies exist on the requested user-owned table. Their combined access semantics require manual review.",
    );
    findings.push(policyFinding);
    manualReview.push(policyFinding);
    return true;
  }
  if (managedPolicies.length === 1) {
    const policy = managedPolicies[0];
    if (
      policy.permissive &&
      policy.authenticatedOnly &&
      policy.command === "ALL" &&
      policy.ownerUsing &&
      policy.ownerCheck
    ) {
      findings.push(
        finding(
          "already-satisfied",
          "rls-policy",
          policyIntent.table,
          "The deterministic authenticated-owner RLS policy is already present with the expected bounded semantics.",
        ),
      );
      return false;
    }
    const policyFinding = finding(
      "conflict",
      "rls-policy",
      policyIntent.table,
      "The deterministic RLS policy name already exists with different access semantics. No policy replacement SQL was generated.",
    );
    findings.push(policyFinding);
    conflicts.push(policyFinding);
    return true;
  }

  proposedAdditiveChanges.push({
    operation: "create-policy",
    table: policyIntent.table,
    name: MANAGED_OWNER_POLICY_NAME,
    ownerColumn: policyIntent.ownerColumn,
  });
  findings.push(
    finding(
      "additive-proposal",
      "rls-policy",
      policyIntent.table,
      "The deterministic authenticated-owner RLS policy is absent and can be created additively.",
    ),
  );
  return false;
}

function reconcileDatabaseObject({
  proposal,
  remoteTable,
  findings,
  proposedAdditiveChanges,
  manualReview,
  conflicts,
}) {
  const proposeAuthenticatedCrudGrant = () => {
    if (proposal.ownership !== "authenticated-user-owned") return;

    const grantFinding = finding(
      "additive-proposal",
      "table-grant",
      proposal.name,
      "Authenticated application access requires bounded CRUD privileges in addition to row-level security.",
    );
    findings.push(grantFinding);
    proposedAdditiveChanges.push({
      operation: "grant-authenticated-crud",
      table: proposal.name,
    });
  };

  if (!remoteTable) {
    const tableFinding = finding(
      "additive-proposal",
      "table",
      proposal.name,
      "The proposed table is absent remotely and can be drafted as an additive create-table operation.",
    );
    findings.push(tableFinding);
    proposedAdditiveChanges.push({
      operation: "create-table",
      table: proposal.name,
      columns: proposal.columns,
      primaryKeys: proposal.primaryKeys,
      foreignKeys: proposal.foreignKeys,
    });

    proposeAuthenticatedCrudGrant();

    if (proposal.rlsRequired) {
      const rlsFinding = finding(
        "additive-proposal",
        "rls",
        proposal.name,
        "Row-level security is required and can be enabled additively after the table is created.",
      );
      findings.push(rlsFinding);
      proposedAdditiveChanges.push({
        operation: "enable-rls",
        table: proposal.name,
      });
    }
    return;
  }

  proposeAuthenticatedCrudGrant();

  const remoteColumns = new Map(
    remoteTable.columns.map((column) => [column.name, column]),
  );
  const proposedColumnNames = new Set();

  for (const column of proposal.columns) {
    proposedColumnNames.add(column.name);
    const remoteColumn = remoteColumns.get(column.name);
    if (!remoteColumn) {
      if (column.safeToAddToExisting === true) {
        const additiveFinding = finding(
          "additive-proposal",
          "column",
          `${proposal.name}.${column.name}`,
          "The nullable column is absent remotely and the normalized proposal explicitly marks it safe to add to an existing table.",
        );
        findings.push(additiveFinding);
        proposedAdditiveChanges.push({
          operation: "add-column",
          table: proposal.name,
          column,
        });
      } else {
        const manualFinding = finding(
          "manual-verification-required",
          "column",
          `${proposal.name}.${column.name}`,
          column.nullable
            ? "The column is absent remotely, but the normalized plan did not prove that adding it to an existing table is safe."
            : "The required NOT NULL column is absent remotely. Existing row state is unknown, so no default or automatic addition was invented.",
        );
        findings.push(manualFinding);
        manualReview.push(manualFinding);
      }
      continue;
    }

    const mismatch = compareColumn(column, remoteColumn);
    if (mismatch) {
      const conflictFinding = finding(
        "conflict",
        "column",
        `${proposal.name}.${column.name}`,
        mismatch,
      );
      findings.push(conflictFinding);
      conflicts.push(conflictFinding);
    } else {
      findings.push(
        finding(
          "already-satisfied",
          "column",
          `${proposal.name}.${column.name}`,
          "Inspectable type, nullability, and uniqueness metadata satisfy the normalized proposal.",
        ),
      );
    }
  }

  for (const remoteColumn of remoteTable.columns) {
    if (!proposedColumnNames.has(remoteColumn.name)) {
      findings.push(
        finding(
          "already-satisfied",
          "retained-column",
          `${proposal.name}.${remoteColumn.name}`,
          "This extra remote column is retained outside the requested change; no deletion is proposed.",
        ),
      );
    }
  }

  reconcilePrimaryKeys(proposal, remoteTable, findings, conflicts);
  reconcileForeignKeys(
    proposal,
    remoteTable,
    findings,
    manualReview,
    conflicts,
  );

  if (proposal.rlsRequired && !remoteTable.rlsEnabled) {
    const rlsFinding = finding(
      "additive-proposal",
      "rls",
      proposal.name,
      "Row-level security is required but disabled remotely; additive RLS enablement is proposed.",
    );
    findings.push(rlsFinding);
    proposedAdditiveChanges.push({
      operation: "enable-rls",
      table: proposal.name,
    });
  } else if (remoteTable.rlsEnabled) {
    findings.push(
      finding(
        "already-satisfied",
        "rls",
        proposal.name,
        proposal.rlsRequired
          ? "Remote metadata confirms row-level security is enabled."
          : "Remote row-level security remains enabled as retained extra protection; it will not be disabled.",
      ),
    );
  } else {
    findings.push(
      finding(
        "already-satisfied",
        "rls",
        proposal.name,
        "The normalized proposal does not require changing the current disabled RLS state.",
      ),
    );
  }
}

function reconcilePrimaryKeys(proposal, remoteTable, findings, conflicts) {
  const proposed = sorted(proposal.primaryKeys);
  const remote = sorted(remoteTable.primaryKeys);
  if (sameStrings(proposed, remote)) {
    findings.push(
      finding(
        "already-satisfied",
        "primary-key",
        proposal.name,
        proposed.length
          ? "Remote primary-key metadata satisfies the normalized proposal."
          : "No primary-key change is requested.",
      ),
    );
    return;
  }
  const conflictFinding = finding(
    "conflict",
    "primary-key",
    proposal.name,
    "Remote primary-key metadata differs from the normalized proposal. No destructive repair SQL was generated.",
  );
  findings.push(conflictFinding);
  conflicts.push(conflictFinding);
}

function reconcileForeignKeys(
  proposal,
  remoteTable,
  findings,
  manualReview,
  conflicts,
) {
  const remainingRemote = [...remoteTable.foreignKeys];
  for (const proposed of proposal.foreignKeys) {
    const index = remainingRemote.findIndex((remote) =>
      sameForeignKey(proposed, remote),
    );
    if (index >= 0) {
      remainingRemote.splice(index, 1);
      findings.push(
        finding(
          "already-satisfied",
          "foreign-key",
          `${proposal.name}.${proposed.name}`,
          "Remote foreign-key metadata satisfies the normalized proposal.",
        ),
      );
      continue;
    }

    const sameSource = remoteTable.foreignKeys.find((remote) =>
      sameStrings(
        sorted(proposed.sourceColumns),
        sorted(remote.sourceColumns),
      ),
    );
    const nextFinding = finding(
      sameSource ? "conflict" : "manual-verification-required",
      "foreign-key",
      `${proposal.name}.${proposed.name}`,
      sameSource
        ? "A foreign key on the same source columns targets a different structure. No repair SQL was generated."
        : "The required foreign key is not present in inspectable metadata. Existing row state is unknown, so constraint creation requires manual verification.",
    );
    findings.push(nextFinding);
    (sameSource ? conflicts : manualReview).push(nextFinding);
  }

  for (const remote of remainingRemote) {
    findings.push(
      finding(
        "already-satisfied",
        "retained-foreign-key",
        `${proposal.name}.${remote.name}`,
        "This extra remote foreign key is retained outside the requested change; no deletion is proposed.",
      ),
    );
  }
}

function reconcileMigrationHistory(proposedMigration, migrations) {
  const managedNameMatches = migrations.filter(
    (migration) => migration.name === proposedMigration.name,
  );
  if (managedNameMatches.length > 1) {
    return finding(
      "conflict",
      "migration",
      proposedMigration.identity,
      "The deterministic managed migration name appears more than once in bounded read-only migration metadata. Provider identity is ambiguous and reconciliation is blocked.",
    );
  }
  if (managedNameMatches.length === 1) {
    const [recorded] = managedNameMatches;
    return finding(
      "already-satisfied",
      "migration",
      proposedMigration.identity,
      `The deterministic managed migration name is recorded under Supabase-assigned version ${recorded.version}. Schema structure must still reconcile before the plan can be considered satisfied.`,
    );
  }
  return finding(
    "additive-proposal",
    "migration",
    proposedMigration.identity,
    "The deterministic managed migration name is unused in the bounded read-only migration list.",
  );
}

function buildReviewOnlySql(changes, policyIntents) {
  if (!changes.length) return "";
  const statements = [
    "-- PLANNING ONLY: review artifact; SQL has not been executed.",
    "-- No database or application changes were made by Supabase Autopilot.",
  ];

  for (const change of changes) {
    if (change.operation === "create-table") {
      statements.push(renderCreateTable(change));
    } else if (change.operation === "add-column") {
      statements.push(
        `ALTER TABLE ${quoteDatabaseName(change.table)} ADD COLUMN ${quoteIdentifier(
          change.column.name,
        )} ${renderDataType(change.column.dataType)};`,
      );
    } else if (change.operation === "enable-rls") {
      statements.push(
        `ALTER TABLE ${quoteDatabaseName(change.table)} ENABLE ROW LEVEL SECURITY;`,
      );
    } else if (change.operation === "grant-authenticated-crud") {
      statements.push(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${quoteDatabaseName(
          change.table,
        )} TO authenticated;`,
      );
    } else if (change.operation === "create-policy") {
      statements.push(
        `CREATE POLICY ${quoteIdentifier(change.name)} ON ${quoteDatabaseName(
          change.table,
        )} FOR ALL TO authenticated USING (${quoteIdentifier(
          change.ownerColumn,
        )} = auth.uid()) WITH CHECK (${quoteIdentifier(
          change.ownerColumn,
        )} = auth.uid());`,
      );
    }
  }

  for (const policyIntent of policyIntents) {
    statements.push(
      `-- Policy intent for ${quoteDatabaseName(
        policyIntent.table,
      )} requires manual verification; no policy SQL was generated.`,
    );
  }
  return statements.join("\n\n");
}

function renderCreateTable(change) {
  const definitions = change.columns.map((column) => {
    const constraints = `${column.nullable ? "" : " NOT NULL"}${
      column.unique ? " UNIQUE" : ""
    }`;
    return `  ${quoteIdentifier(column.name)} ${renderDataType(
      column.dataType,
    )}${constraints}`;
  });
  if (change.primaryKeys.length) {
    definitions.push(
      `  PRIMARY KEY (${change.primaryKeys.map(quoteIdentifier).join(", ")})`,
    );
  }
  for (const foreignKey of change.foreignKeys) {
    definitions.push(
      `  CONSTRAINT ${quoteIdentifier(
        foreignKey.name,
      )} FOREIGN KEY (${foreignKey.sourceColumns
        .map(quoteIdentifier)
        .join(", ")}) REFERENCES ${quoteDatabaseName(
        foreignKey.targetTable,
      )} (${foreignKey.targetColumns.map(quoteIdentifier).join(", ")})`,
    );
  }
  return `CREATE TABLE ${quoteDatabaseName(change.table)} (\n${definitions.join(
    ",\n",
  )}\n);`;
}

function findBlockedReasons(plan) {
  const reasons = [];
  const projectName = String(
    plan.projectApplicationIdentity?.supabaseProjectName || "",
  );
  if (
    plan.projectApplicationIdentity?.supabaseProjectReference !==
      plan.selectedProjectReference ||
    plan.remoteSupabaseFindings?.projectReference !==
      plan.selectedProjectReference
  ) {
    reasons.push(
      "Selected project identity does not match the normalized inspection.",
    );
  }
  if (PRODUCTION_PROJECT_PATTERN.test(projectName)) {
    reasons.push(
      "Reconciliation is blocked for a production-named Supabase project.",
    );
  }
  if (
    ["destructive", "production-prohibited"].includes(
      plan.riskClassification,
    )
  ) {
    reasons.push(
      "The source plan is destructive or production-oriented and is ineligible for reconciliation.",
    );
  }
  if (
    plan.detectedFramework !== SUPPORTED_FRAMEWORK ||
    !SUPPORTED_PACKAGE_MANAGERS.includes(plan.detectedPackageManager) ||
    plan.unsupportedConditions.length ||
    plan.implementationEligibility !== "eligible"
  ) {
    reasons.push(
      "The source plan is unsupported or not eligible for future implementation.",
    );
  }
  return reasons;
}

function buildMigrationIdentity(plan) {
  const proposalFingerprint = fingerprintPlan({
    selectedProjectReference: plan.selectedProjectReference,
    proposedDatabaseObjects: plan.proposedDatabaseObjects,
    proposedRlsPolicyIntent: plan.proposedRlsPolicyIntent,
  });
  const hexadecimal = String(proposalFingerprint || "")
    .replace(/^fnv1a64-/, "")
    .toLowerCase();
  const numeric = hexadecimal
    .split("")
    .map((value) => String(Number.parseInt(value, 16) % 10))
    .join("");
  const version = `3${numeric.slice(0, 13).padEnd(13, "0")}`;
  const name = `supabase_autopilot_${hexadecimal.slice(-12)}`;
  return {
    // Supabase assigns the remote migration version. This deterministic value
    // remains planning metadata and is not used to match remote migrations.
    version,
    name,
    identity: name,
  };
}

function finishResult({
  plan,
  proposedMigration,
  status,
  findings,
  proposedAdditiveChanges,
  manualReview,
  conflicts,
  warnings,
  limitations,
  sqlDraft,
}) {
  const resultWithoutFingerprint = {
    schemaVersion: SUPABASE_AUTOPILOT_RECONCILIATION_VERSION,
    sourcePlanFingerprint: plan.fingerprint,
    selectedProject: {
      name: plan.projectApplicationIdentity.supabaseProjectName,
      reference: plan.selectedProjectReference,
    },
    proposedMigration,
    status,
    findings,
    proposedAdditiveChanges,
    manualReview,
    conflicts,
    warnings: uniqueStrings(warnings),
    limitations: uniqueStrings(limitations),
    sqlDraft,
    canApply: false,
    executionStatus: "not-applied",
    nothingAppliedStatement: NOTHING_APPLIED_STATEMENT,
  };
  const result = {
    ...resultWithoutFingerprint,
    fingerprint: fingerprintPlan(resultWithoutFingerprint),
  };
  const validation = validateSupabaseAutopilotReconciliation(result);
  if (!validation.valid) {
    throw new Error(
      `The generated reconciliation was rejected: ${validation.errors[0]}`,
    );
  }
  return deepFreeze(result);
}

function compareColumn(proposed, remote) {
  if (
    normalizeDataType(proposed.dataType) !== normalizeDataType(remote.dataType)
  ) {
    return `Remote type '${remote.dataType}' conflicts with proposed type '${proposed.dataType}'. No type-altering SQL was generated.`;
  }
  if (proposed.nullable !== remote.nullable) {
    return "Remote nullability conflicts with the normalized proposal. No backfill, default, or nullability-altering SQL was generated.";
  }
  if (proposed.unique !== remote.unique) {
    return "Remote uniqueness metadata conflicts with the normalized proposal. No constraint repair SQL was generated.";
  }
  return "";
}

function sameForeignKey(left, right) {
  return (
    left.targetTable === right.targetTable &&
    sameStrings(
      sorted(left.sourceColumns),
      sorted(right.sourceColumns),
    ) &&
    sameStrings(
      sorted(left.targetColumns),
      sorted(right.targetColumns),
    )
  );
}

function overallStatus({
  proposedAdditiveChanges,
  manualReview,
  conflicts,
}) {
  if (conflicts.length) return "conflict";
  if (manualReview.length) return "manual-review-required";
  if (proposedAdditiveChanges.length) return "additive-proposal";
  return "already-satisfied";
}

function finding(classification, objectType, objectName, summary) {
  return { classification, objectType, objectName, summary };
}

function validFinding(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      CLASSIFICATIONS.has(value.classification) &&
      boundedIdentifier(value.objectType, 80) &&
      boundedIdentifier(value.objectName, 300) &&
      boundedText(value.summary, 700),
  );
}

function validDatabaseProposal(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      ["create-table", "review-table"].includes(value.operation) &&
      ["authenticated-user-owned", "application"].includes(value.ownership) &&
      isBoundedTextExact(value.purpose, 500) &&
      typeof value.rlsRequired === "boolean" &&
      value.status === "proposed" &&
      validAdditiveChange({
        operation: "create-table",
        table: value.name,
        columns: value.columns,
        primaryKeys: value.primaryKeys,
        foreignKeys: value.foreignKeys,
      }),
  );
}

function validPolicyIntent(value) {
  if (
    !value ||
    typeof value !== "object" ||
    !boundedIdentifier(value.ownerColumn, 63) ||
    value.ownerColumn.includes(".") ||
    !isBoundedTextExact(value.intent, 700) ||
    value.status !== "proposed"
  ) {
    return false;
  }
  try {
    quoteDatabaseName(value.table);
    return true;
  } catch {
    return false;
  }
}

function validLocalFindings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const pathCollections = [
    [value.sourceFiles, 160],
    [value.existingSupabaseClientFiles, 30],
    [value.authenticationFiles, 40],
    [value.persistenceFiles, 40],
  ];
  return Boolean(
    pathCollections.every(
      ([paths, limit]) =>
        Array.isArray(paths) &&
        paths.length <= limit &&
        paths.every(isBoundedApplicationPath),
    ) &&
      Array.isArray(value.environmentVariableNames) &&
      value.environmentVariableNames.length <= 80 &&
      value.environmentVariableNames.every((name) =>
        /^[A-Z][A-Z0-9_]{1,100}$/.test(String(name || "")),
      ) &&
      Array.isArray(value.existingSupabaseDependencies) &&
      value.existingSupabaseDependencies.length <= 20 &&
      value.existingSupabaseDependencies.every((item) =>
        isBoundedTextExact(item, 120),
      ) &&
      validWiringFindings(value.wiringFindings)
  );
}

function validWiringFindings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const pathCollections = [
    [value.entryFiles, 20],
    [value.reactStateFiles, 80],
    [value.effectFiles, 80],
    [value.supabaseCallFiles, 80],
    [value.authSessionFiles, 80],
  ];
  return pathCollections.every(
    ([paths, limit]) =>
      Array.isArray(paths) &&
      paths.length <= limit &&
      paths.every(isBoundedApplicationPath),
  );
}

function validRemotePolicy(value) {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.permissive !== "boolean" ||
    typeof value.authenticatedOnly !== "boolean" ||
    !["ALL", "SELECT", "INSERT", "UPDATE", "DELETE"].includes(value.command) ||
    typeof value.ownerUsing !== "boolean" ||
    typeof value.ownerCheck !== "boolean"
  ) {
    return false;
  }
  try {
    quoteDatabaseName(value.table);
    quoteIdentifier(value.name);
    return true;
  } catch {
    return false;
  }
}

function validRemoteTable(value) {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.rlsEnabled !== "boolean" ||
    !Array.isArray(value.columns) ||
    value.columns.length > 120 ||
    !Array.isArray(value.primaryKeys) ||
    value.primaryKeys.length > 20 ||
    !Array.isArray(value.foreignKeys) ||
    value.foreignKeys.length > 40
  ) {
    return false;
  }
  try {
    quoteDatabaseName(value.name);
  } catch {
    return false;
  }
  if (
    value.columns.some(
      (column) =>
        !column ||
        typeof column !== "object" ||
        !boundedIdentifier(column.name, 100) ||
        column.name.includes(".") ||
        !isBoundedTextExact(column.dataType, 120) ||
        typeof column.nullable !== "boolean" ||
        typeof column.unique !== "boolean",
    ) ||
    new Set(value.columns.map((column) => column.name)).size !==
      value.columns.length ||
    value.primaryKeys.some(
      (column) =>
        !boundedIdentifier(column, 100) || column.includes("."),
    )
  ) {
    return false;
  }
  return value.foreignKeys.every((foreignKey) => {
    if (
      !foreignKey ||
      typeof foreignKey !== "object" ||
      !boundedIdentifier(foreignKey.name, 120) ||
      foreignKey.name.includes(".") ||
      !Array.isArray(foreignKey.sourceColumns) ||
      !foreignKey.sourceColumns.length ||
      !Array.isArray(foreignKey.targetColumns) ||
      foreignKey.sourceColumns.length !== foreignKey.targetColumns.length ||
      foreignKey.sourceColumns.some(
        (column) =>
          !boundedIdentifier(column, 100) || column.includes("."),
      ) ||
      foreignKey.targetColumns.some(
        (column) =>
          !boundedIdentifier(column, 100) || column.includes("."),
      )
    ) {
      return false;
    }
    try {
      quoteDatabaseName(foreignKey.targetTable);
      return true;
    } catch {
      return false;
    }
  });
}

function validAdditiveChange(value) {
  if (
    !value ||
    typeof value !== "object" ||
    ![
      "create-table",
      "add-column",
      "enable-rls",
      "grant-authenticated-crud",
      "create-policy",
    ].includes(value.operation)
  ) {
    return false;
  }
  try {
    quoteDatabaseName(value.table);
    if (value.operation === "enable-rls") return true;
    if (value.operation === "grant-authenticated-crud") return true;
    if (value.operation === "create-policy") {
      return Boolean(
        value.name === MANAGED_OWNER_POLICY_NAME &&
          quoteIdentifier(value.name) &&
          boundedIdentifier(value.ownerColumn, 63) &&
          !value.ownerColumn.includes("."),
      );
    }
    if (value.operation === "add-column") {
      return Boolean(
        validProposedColumn(value.column) &&
          value.column.nullable &&
          !value.column.unique &&
          value.column.safeToAddToExisting,
      );
    }
    if (
      !Array.isArray(value.columns) ||
      !value.columns.length ||
      value.columns.length > 80 ||
      !Array.isArray(value.primaryKeys) ||
      value.primaryKeys.length > 20 ||
      !Array.isArray(value.foreignKeys) ||
      value.foreignKeys.length > 40 ||
      value.columns.some((column) => !validProposedColumn(column))
    ) {
      return false;
    }
    const columnNames = new Set(value.columns.map((column) => column.name));
    if (
      columnNames.size !== value.columns.length ||
      value.primaryKeys.some(
        (column) =>
          !columnNames.has(column) || !boundedIdentifier(column, 63),
      )
    ) {
      return false;
    }
    for (const foreignKey of value.foreignKeys) {
      if (
        !foreignKey ||
        typeof foreignKey !== "object" ||
        !boundedIdentifier(foreignKey.name, 63) ||
        foreignKey.name.includes(".") ||
        !Array.isArray(foreignKey.sourceColumns) ||
        !foreignKey.sourceColumns.length ||
        !Array.isArray(foreignKey.targetColumns) ||
        foreignKey.sourceColumns.length !== foreignKey.targetColumns.length ||
        foreignKey.sourceColumns.some(
          (column) =>
            !columnNames.has(column) || !boundedIdentifier(column, 63),
        ) ||
        foreignKey.targetColumns.some(
          (column) => !boundedIdentifier(column, 63),
        )
      ) {
        return false;
      }
      quoteDatabaseName(foreignKey.targetTable);
    }
    return true;
  } catch {
    return false;
  }
}

function validProposedColumn(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      boundedIdentifier(value.name, 63) &&
      !value.name.includes(".") &&
      normalizeDataType(value.dataType) &&
      typeof value.nullable === "boolean" &&
      typeof value.unique === "boolean" &&
      typeof value.safeToAddToExisting === "boolean",
  );
}

function validMigrationIdentity(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      /^[0-9]{14}$/.test(value.version) &&
      /^[a-z0-9_]{1,120}$/.test(value.name) &&
      value.identity === value.name &&
      ["unused", "already-recorded", "collision", "blocked"].includes(
        value.status,
      ),
  );
}

function normalizeDataType(value) {
  return SAFE_DATA_TYPES.get(
    String(value || "").trim().replace(/\s+/g, " ").toLowerCase(),
  );
}

function renderDataType(value) {
  const normalized = normalizeDataType(value);
  if (!normalized) {
    throw new Error("The normalized proposal contains an unsupported SQL type.");
  }
  return normalized;
}

function quoteDatabaseName(value) {
  const [schema, table, ...rest] = String(value || "").split(".");
  if (
    rest.length ||
    !boundedIdentifier(schema, 63) ||
    !boundedIdentifier(table, 63)
  ) {
    throw new Error("The normalized proposal contains an invalid table name.");
  }
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
}

function quoteIdentifier(value) {
  if (!boundedIdentifier(value, 63) || String(value).includes(".")) {
    throw new Error("The normalized proposal contains an invalid SQL identifier.");
  }
  return `"${value}"`;
}

function findUnsafeField(value, path = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const unsafe = findUnsafeField(value[index], [...path, String(index)]);
      if (unsafe) return unsafe;
    }
    return "";
  }
  if (!value || typeof value !== "object") {
    if (
      typeof value === "string" &&
      SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      return `Secret-like content was found at ${
        path.join(".") || "reconciliation"
      }.`;
    }
    return "";
  }
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      return `Secret-bearing field '${key}' is not allowed in reconciliation.`;
    }
    if (ROW_CONTENT_KEY_PATTERN.test(key)) {
      return `Database row content field '${key}' is not allowed in reconciliation.`;
    }
    const unsafe = findUnsafeField(nested, [...path, key]);
    if (unsafe) return unsafe;
  }
  return "";
}

function boundedIdentifier(value, maxLength) {
  const identifier = String(value || "").trim();
  return identifier.length <= maxLength && /^[A-Za-z0-9_.$-]+$/.test(identifier)
    ? identifier
    : "";
}

function boundedText(value, maxLength) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text.length <= maxLength ? text : "";
}

function isBoundedTextExact(value, maxLength, allowEmpty = false) {
  return Boolean(
    typeof value === "string" &&
      value.length <= maxLength &&
      value === boundedText(value, maxLength) &&
      (allowEmpty || value),
  );
}

function sorted(values) {
  return [...(values || [])].sort();
}

function sameStrings(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function withoutFingerprint(value) {
  const { fingerprint: _fingerprint, ...rest } = value;
  return rest;
}

function sqlStatementsOnly(value) {
  return String(value || "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
}

function validSqlComments(value) {
  if (!value) return true;
  const comments = String(value)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("--"));
  if (
    comments[0] !==
      "-- PLANNING ONLY: review artifact; SQL has not been executed." ||
    comments[1] !==
      "-- No database or application changes were made by Supabase Autopilot."
  ) {
    return false;
  }
  return comments.slice(2).every((line) =>
    /^-- Policy intent for "[A-Za-z0-9_$-]+"\."[A-Za-z0-9_$-]+" requires manual verification; no policy SQL was generated\.$/.test(
      line,
    ),
  );
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
