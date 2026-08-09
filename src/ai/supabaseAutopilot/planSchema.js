export const SUPABASE_AUTOPILOT_PLAN_VERSION =
  "supabase-autopilot-plan/v1";

export const SUPPORTED_FRAMEWORK = "vite-react";
export const SUPPORTED_PACKAGE_MANAGERS = Object.freeze([
  "pnpm",
  "npm",
  "yarn",
  "bun",
]);

const PRODUCTION_PATTERN =
  /\b(prod(?:uction)?|live\s+(?:database|data|users|customers)|promote\s+to\s+production)\b/i;
const DESTRUCTIVE_PATTERN =
  /\b(drop|truncate|wipe|erase|destroy|delete\s+(?:all|the\s+database|the\s+schema)|reset\s+(?:the\s+)?database|overwrite\s+(?:the\s+)?schema)\b/i;
const AUTH_OR_USER_DATA_PATTERN =
  /\b(auth(?:entication)?|sign[\s-]?in|sign[\s-]?up|log[\s-]?in|account|profile|per[\s-]?user|each\s+user|user(?:'s)?\s+(?:own|data|progress)|my\s+(?:data|progress)|private|progress)\b/i;
const SECRET_VALUE_PATTERNS = [
  /\bsb_secret_[A-Za-z0-9_-]+\b/,
  /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/,
  /\bpostgres(?:ql)?:\/\/[^\s]+:[^@\s]+@/i,
];
const SECRET_KEY_PATTERN =
  /(?:^|_)(?:access_?token|refresh_?token|password|secret|service_?role|database_?url|private_?key|api_?key)(?:$|_)/i;
const ROW_CONTENT_KEY_PATTERN =
  /^(?:row|rows|rowData|rowContents|records|recordContents)$/i;
const PROPOSED_STATUSES = new Set(["proposed", "planning-only"]);
const PROPOSED_DATABASE_TYPES = new Set([
  "bigint",
  "boolean",
  "date",
  "integer",
  "jsonb",
  "text",
  "timestamptz",
  "uuid",
  "varchar",
]);

export function detectFramework(application = {}) {
  const dependencies = dependencyNames(application);
  const files = normalizedFiles(application.files);
  const hasReact = dependencies.has("react");
  const hasVite =
    dependencies.has("vite") ||
    files.some((path) => /^vite\.config\.(?:js|jsx|ts|tsx|mjs|cjs)$/.test(path));
  const hasOtherFramework =
    dependencies.has("next") ||
    dependencies.has("@angular/core") ||
    dependencies.has("vue") ||
    dependencies.has("svelte") ||
    files.some((path) => /^(?:next|nuxt|svelte)\.config\./.test(path));

  if (hasReact && hasVite && !hasOtherFramework) return SUPPORTED_FRAMEWORK;
  if (hasReact && hasVite && hasOtherFramework) return "ambiguous";
  return "unsupported";
}

export function detectPackageManager(application = {}) {
  const files = new Set(normalizedFiles(application.files));
  const lockfileManagers = [
    ["pnpm-lock.yaml", "pnpm"],
    ["package-lock.json", "npm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
  ]
    .filter(([file]) => files.has(file))
    .map(([, manager]) => manager);
  const uniqueManagers = [...new Set(lockfileManagers)];

  if (uniqueManagers.length === 1) return uniqueManagers[0];
  if (uniqueManagers.length > 1) return "unknown";

  const declared = String(application.packageManager || "")
    .trim()
    .toLowerCase()
    .split("@")[0];
  return SUPPORTED_PACKAGE_MANAGERS.includes(declared) ? declared : "unknown";
}

export function classifyPlanningRisk({
  objective,
  framework,
  packageManager,
} = {}) {
  const request = String(objective || "").trim();
  if (PRODUCTION_PATTERN.test(request)) return "production-prohibited";
  if (DESTRUCTIVE_PATTERN.test(request)) return "destructive";
  if (
    framework !== SUPPORTED_FRAMEWORK ||
    !SUPPORTED_PACKAGE_MANAGERS.includes(packageManager)
  ) {
    return "unsupported";
  }
  if (AUTH_OR_USER_DATA_PATTERN.test(request)) {
    return "authentication/user-data change";
  }
  return request ? "additive development change" : "informational";
}

export function createSupabaseAutopilotPlan({
  objective,
  selectedProjectReference,
  inspection,
} = {}) {
  const requestedObjective = boundedText(objective, 1200);
  const selectedRef = boundedIdentifier(selectedProjectReference, 80);
  const remote = normalizeRemoteInspection(inspection?.remote);
  const local = normalizeLocalInspection(inspection?.local);

  if (!selectedRef) {
    throw new Error("A selected Supabase project reference is required.");
  }
  if (!requestedObjective) {
    throw new Error("Describe the feature to plan.");
  }
  rejectSecretText(requestedObjective);
  if (remote.projectReference !== selectedRef) {
    throw new Error(
      "The inspected Supabase project does not match the selected project.",
    );
  }

  const framework =
    local.framework || detectFramework(local.detectionEvidence);
  const packageManager =
    local.packageManager || detectPackageManager(local.detectionEvidence);
  const riskClassification = classifyPlanningRisk({
    objective: requestedObjective,
    framework,
    packageManager,
  });
  const userOwnedData = AUTH_OR_USER_DATA_PATTERN.test(requestedObjective);
  const unsupportedConditions = buildUnsupportedConditions({
    framework,
    packageManager,
    riskClassification,
  });
  const warnings = uniqueStrings([
    ...local.warnings,
    ...remote.warnings,
    "Planning only: no database or application changes have occurred.",
    riskClassification === "destructive"
      ? "Destructive requests cannot proceed in Supabase Autopilot."
      : "",
    riskClassification === "production-prohibited"
      ? "Production-oriented work is prohibited; use a development project only."
      : "",
  ]);
  const canProposeImplementation = unsupportedConditions.length === 0;
  const proposedDatabaseObjects = canProposeImplementation
    ? buildDatabaseObjects(requestedObjective, remote.tables, userOwnedData)
    : [];
  const proposedRlsPolicyIntent =
    canProposeImplementation && userOwnedData
      ? [
          {
            table: proposedDatabaseObjects[0]?.name || "public.user_records",
            ownerColumn: "user_id",
            intent:
              "Authenticated users may select, insert, update, and delete only rows where user_id matches auth.uid().",
            status: "proposed",
          },
        ]
      : [];
  const proposedApplicationFileOperations = canProposeImplementation
    ? buildFileOperations(local, userOwnedData)
    : [];
  const proposedPackageOperations = canProposeImplementation
    ? buildPackageOperations(local)
    : [];
  const verificationSteps = buildVerificationSteps({
    userOwnedData,
    canProposeImplementation,
  });

  const planWithoutFingerprint = {
    schemaVersion: SUPABASE_AUTOPILOT_PLAN_VERSION,
    selectedProjectReference: selectedRef,
    projectApplicationIdentity: {
      supabaseProjectName: remote.projectName,
      supabaseProjectReference: remote.projectReference,
      applicationName: local.applicationName,
      applicationRootName: local.applicationRootName,
    },
    detectedFramework: framework,
    detectedPackageManager: packageManager,
    localApplicationFindings: {
      sourceFiles: local.sourceFiles,
      environmentVariableNames: local.environmentVariableNames,
      existingSupabaseDependencies: local.existingSupabaseDependencies,
      existingSupabaseClientFiles: local.existingSupabaseClientFiles,
      authenticationFiles: local.authenticationFiles,
      persistenceFiles: local.persistenceFiles,
      wiringFindings: local.wiringFindings,
    },
    remoteSupabaseFindings: {
      projectReference: remote.projectReference,
      projectApiUrl: remote.projectApiUrl,
      tables: remote.tables,
      migrations: remote.migrations,
    },
    requestedObjective,
    proposedDatabaseObjects,
    proposedRlsPolicyIntent,
    proposedApplicationFileOperations,
    proposedPackageOperations,
    proposedVerificationSteps: verificationSteps,
    warnings,
    unsupportedConditions,
    implementationEligibility: canProposeImplementation
      ? "eligible"
      : "blocked",
    riskClassification,
    mutationRequired:
      proposedDatabaseObjects.length > 0 ||
      proposedApplicationFileOperations.length > 0 ||
      proposedPackageOperations.length > 0,
    executionStatus: "planning-only",
  };
  const plan = {
    ...planWithoutFingerprint,
    fingerprint: fingerprintPlan(planWithoutFingerprint),
  };
  const validation = validateSupabaseAutopilotPlan(plan);
  if (!validation.valid) {
    throw new Error(`The generated plan was rejected: ${validation.errors[0]}`);
  }
  return deepFreeze(plan);
}

export function validateSupabaseAutopilotPlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return { valid: false, errors: ["Plan must be an object."] };
  }
  if (plan.schemaVersion !== SUPABASE_AUTOPILOT_PLAN_VERSION) {
    errors.push("Plan version is missing or unsupported.");
  }
  if (!boundedIdentifier(plan.selectedProjectReference, 80)) {
    errors.push("Selected project reference is missing or invalid.");
  }
  if (
    plan.remoteSupabaseFindings?.projectReference !==
    plan.selectedProjectReference
  ) {
    errors.push("Selected and inspected Supabase project references differ.");
  }
  if (
    ![
      SUPPORTED_FRAMEWORK,
      "unsupported",
      "ambiguous",
    ].includes(plan.detectedFramework)
  ) {
    errors.push("Framework classification is malformed.");
  }
  if (
    plan.detectedFramework !== SUPPORTED_FRAMEWORK &&
    !plan.unsupportedConditions?.length
  ) {
    errors.push("Unsupported frameworks must be explicitly flagged.");
  }
  if (
    !SUPPORTED_PACKAGE_MANAGERS.includes(plan.detectedPackageManager) &&
    !plan.unsupportedConditions?.length
  ) {
    errors.push("Unknown package managers must be explicitly flagged.");
  }
  for (const operation of plan.proposedApplicationFileOperations || []) {
    if (!isBoundedApplicationPath(operation.path)) {
      errors.push(`Application path is outside the safe boundary: ${operation.path}`);
    }
    if (!PROPOSED_STATUSES.has(operation.status)) {
      errors.push("Application operations must remain proposed.");
    }
    if (
      !["supabase-client", "auth-session", "data-access", "react-integration"].includes(
        operation.role,
      )
    ) {
      errors.push("Application wiring role is missing or unsupported.");
    }
  }
  const applicationPaths = (plan.proposedApplicationFileOperations || []).map(
    (operation) => operation.path,
  );
  if (new Set(applicationPaths).size !== applicationPaths.length) {
    errors.push("Application operations must not target the same path more than once.");
  }
  for (const operation of plan.proposedPackageOperations || []) {
    if (!PROPOSED_STATUSES.has(operation.status)) {
      errors.push("Package operations must remain proposed.");
    }
  }
  for (const operation of [
    ...(plan.proposedDatabaseObjects || []),
    ...(plan.proposedRlsPolicyIntent || []),
  ]) {
    if (!PROPOSED_STATUSES.has(operation.status)) {
      errors.push("Database and policy operations must remain proposed.");
    }
  }
  for (const databaseObject of plan.proposedDatabaseObjects || []) {
    const objectError = validateProposedDatabaseObject(databaseObject);
    if (objectError) errors.push(objectError);
  }
  const expectedEligibility = plan.unsupportedConditions?.length
    ? "blocked"
    : "eligible";
  if (
    !["eligible", "blocked"].includes(plan.implementationEligibility) ||
    plan.implementationEligibility !== expectedEligibility
  ) {
    errors.push("Implementation eligibility is missing or inconsistent.");
  }
  if (
    plan.riskClassification === "authentication/user-data change" &&
    !(plan.proposedRlsPolicyIntent || []).length
  ) {
    errors.push("User-owned data plans require explicit RLS policy intent.");
  }
  if (
    ["destructive", "production-prohibited"].includes(plan.riskClassification) &&
    !(plan.warnings || []).length
  ) {
    errors.push("Prohibited requests require a visible warning.");
  }
  if (plan.executionStatus !== "planning-only") {
    errors.push("A planning-only plan cannot report completed mutations.");
  }
  const unsafeField = findUnsafeField(plan);
  if (unsafeField) errors.push(unsafeField);
  const expectedFingerprint = fingerprintPlan(withoutFingerprint(plan));
  if (plan.fingerprint !== expectedFingerprint) {
    errors.push("Plan fingerprint does not match its contents.");
  }
  return { valid: errors.length === 0, errors: uniqueStrings(errors) };
}

export function isBoundedApplicationPath(value) {
  const path = String(value || "").trim().replace(/\\/g, "/");
  if (
    !path ||
    path.length > 220 ||
    path.startsWith("/") ||
    /^[A-Za-z]:\//.test(path) ||
    path.split("/").some((part) => !part || part === "." || part === "..") ||
    path.startsWith(".env") ||
    path === ".gitignore"
  ) {
    return false;
  }
  return /^(?:src|public)\/[A-Za-z0-9._/-]+$/.test(path);
}

export function fingerprintPlan(plan) {
  const input = stableStringify(plan);
  return `fnv1a64-${fnv1a32(input, 0x811c9dc5)}${fnv1a32(
    input,
    0x9e3779b9,
  )}`;
}

function normalizeLocalInspection(value = {}) {
  const local = value && typeof value === "object" ? value : {};
  return {
    applicationName: boundedText(local.applicationName, 160) || "Open application",
    applicationRootName:
      boundedText(local.applicationRootName, 160) || "open-project",
    framework: ["vite-react", "unsupported", "ambiguous"].includes(
      local.framework,
    )
      ? local.framework
      : "",
    packageManager: SUPPORTED_PACKAGE_MANAGERS.includes(local.packageManager)
      ? local.packageManager
      : local.packageManager === "unknown"
        ? "unknown"
        : "",
    sourceFiles: boundedPaths(local.sourceFiles, 160),
    environmentVariableNames: uniqueStrings(
      (local.environmentVariableNames || [])
        .map((name) => String(name || "").trim())
        .filter((name) => /^[A-Z][A-Z0-9_]{1,100}$/.test(name)),
    ).slice(0, 80),
    existingSupabaseDependencies: boundedStrings(
      local.existingSupabaseDependencies,
      20,
      120,
    ),
    existingSupabaseClientFiles: boundedPaths(
      local.existingSupabaseClientFiles,
      30,
    ),
    authenticationFiles: boundedPaths(local.authenticationFiles, 40),
    persistenceFiles: boundedPaths(local.persistenceFiles, 40),
    wiringFindings: normalizeWiringFindings(local.wiringFindings),
    warnings: boundedStrings(local.warnings, 30, 400),
    detectionEvidence:
      local.detectionEvidence && typeof local.detectionEvidence === "object"
        ? local.detectionEvidence
        : {},
  };
}

function normalizeWiringFindings(value = {}) {
  const findings = value && typeof value === "object" ? value : {};
  return {
    entryFiles: boundedPaths(findings.entryFiles, 20),
    reactStateFiles: boundedPaths(findings.reactStateFiles, 80),
    effectFiles: boundedPaths(findings.effectFiles, 80),
    supabaseCallFiles: boundedPaths(findings.supabaseCallFiles, 80),
    authSessionFiles: boundedPaths(findings.authSessionFiles, 80),
  };
}

function normalizeRemoteInspection(value = {}) {
  const remote = value && typeof value === "object" ? value : {};
  return {
    projectName: boundedText(remote.projectName, 160) || "Supabase project",
    projectReference: boundedIdentifier(remote.projectReference, 80),
    projectApiUrl: safeProjectUrl(remote.projectApiUrl, remote.projectReference),
    tables: (Array.isArray(remote.tables) ? remote.tables : [])
      .slice(0, 120)
      .map((table) => ({
        name: boundedDatabaseName(table?.name),
        rlsEnabled: table?.rlsEnabled === true,
        columns: (Array.isArray(table?.columns) ? table.columns : [])
          .slice(0, 120)
          .map((column) => ({
            name: boundedIdentifier(column?.name, 100),
            dataType: boundedText(column?.dataType, 120),
            nullable: column?.nullable === true,
            unique: column?.unique === true,
          }))
          .filter((column) => column.name && column.dataType),
        primaryKeys: boundedStrings(table?.primaryKeys, 20, 100),
        foreignKeys: (Array.isArray(table?.foreignKeys)
          ? table.foreignKeys
          : []
        )
          .slice(0, 40)
          .map((foreignKey) => ({
            name: boundedIdentifier(foreignKey?.name, 120),
            sourceColumns: boundedStrings(
              foreignKey?.sourceColumns,
              20,
              100,
            ),
            targetTable: boundedDatabaseName(foreignKey?.targetTable),
            targetColumns: boundedStrings(
              foreignKey?.targetColumns,
              20,
              100,
            ),
          })),
      }))
      .filter((table) => table.name),
    migrations: (Array.isArray(remote.migrations) ? remote.migrations : [])
      .slice(0, 200)
      .map((migration) => ({
        version: boundedIdentifier(migration?.version, 120),
        name: boundedText(migration?.name, 160),
      }))
      .filter((migration) => migration.version),
    warnings: boundedStrings(remote.warnings, 30, 400),
  };
}

function buildUnsupportedConditions({
  framework,
  packageManager,
  riskClassification,
}) {
  return uniqueStrings([
    framework === "ambiguous"
      ? "Multiple frontend frameworks were detected. Select a single Vite + React application before implementation planning."
      : framework !== SUPPORTED_FRAMEWORK
        ? "Only a clearly detected Vite + React application is supported in this milestone."
        : "",
    !SUPPORTED_PACKAGE_MANAGERS.includes(packageManager)
      ? "The application package manager could not be determined safely."
      : "",
    riskClassification === "destructive"
      ? "Destructive database or application work is unsupported."
      : "",
    riskClassification === "production-prohibited"
      ? "Production access or promotion is prohibited."
      : "",
  ]);
}

function buildDatabaseObjects(objective, existingTables, userOwnedData) {
  const existingNames = new Set(existingTables.map((table) => table.name));
  const baseName = /\bprogress\b/i.test(objective)
    ? "public.user_progress"
    : /\bprofile\b/i.test(objective)
      ? "public.profiles"
      : userOwnedData
        ? "public.user_records"
        : "public.feature_records";
  const tableName = baseName.split(".")[1];
  const columns = [
    proposedColumn("id", "uuid", false),
    ...(userOwnedData
      ? [proposedColumn("user_id", "uuid", false)]
      : []),
    proposedColumn("data", "jsonb", false),
  ];
  return [
    {
      operation: existingNames.has(baseName) ? "review-table" : "create-table",
      name: baseName,
      purpose: boundedText(
        `Store the data required for: ${objective}`,
        500,
      ),
      ownership: userOwnedData ? "authenticated-user-owned" : "application",
      columns,
      primaryKeys: ["id"],
      foreignKeys: userOwnedData
        ? [
            {
              name: `${tableName}_user_id_fkey`,
              sourceColumns: ["user_id"],
              targetTable: "auth.users",
              targetColumns: ["id"],
            },
          ]
        : [],
      rlsRequired: userOwnedData,
      status: "proposed",
    },
  ];
}

function proposedColumn(name, dataType, nullable) {
  return {
    name,
    dataType,
    nullable,
    unique: false,
    safeToAddToExisting: nullable,
  };
}

function buildFileOperations(local, userOwnedData) {
  const operations = [];
  const usedPaths = new Set();

  const pathRank = (path) => {
    const normalized = String(path || "")
      .replace(/\\/g, "/")
      .toLowerCase();

    if (/^src\/lib\/supabase(?:client)?\.[jt]sx?$/.test(normalized)) {
      return 0;
    }
    if (/^src\/lib\/.*supabase.*\.[jt]sx?$/.test(normalized)) {
      return 1;
    }
    if (
      /^src\/.*supabase.*\.[jt]sx?$/.test(normalized) &&
      !normalized.includes("/examples/")
    ) {
      return 2;
    }
    return normalized.includes("/examples/") ? 4 : 3;
  };

  const preferredPath = (paths, fallback) => {
    const candidates = [...new Set(paths || [])]
      .filter(
        (path) =>
          isBoundedApplicationPath(path) &&
          !usedPaths.has(path),
      )
      .sort((left, right) => {
        const rankDifference = pathRank(left) - pathRank(right);
        if (rankDifference !== 0) return rankDifference;
        return left < right ? -1 : left > right ? 1 : 0;
      });

    return candidates[0] || fallback;
  };

  const preferredEvidencePath = (specificPaths, broadPaths, fallback) =>
    preferredPath(specificPaths, "") || preferredPath(broadPaths, fallback);

  const clientPath = preferredPath(
    local.existingSupabaseClientFiles,
    "src/lib/supabaseClient.js",
  );
  usedPaths.add(clientPath);
  operations.push({
    operation: local.existingSupabaseClientFiles.includes(clientPath)
      ? "review-and-update"
      : "create",
    path: clientPath,
    role: "supabase-client",
    purpose:
      "Configure the browser-safe Supabase client using environment-variable names only.",
    status: "proposed",
  });

  if (userOwnedData) {
    const authenticationPath = preferredEvidencePath(
      local.wiringFindings.authSessionFiles,
      local.authenticationFiles,
      "src/features/auth/AuthProvider.jsx",
    );
    usedPaths.add(authenticationPath);
    operations.push({
      operation: "create-or-update",
      path: authenticationPath,
      role: "auth-session",
      purpose: "Provide sign-in state and session-aware UI behavior.",
      status: "proposed",
    });
  }

  const persistencePath = preferredEvidencePath(
    local.wiringFindings.supabaseCallFiles,
    local.persistenceFiles,
    "src/features/supabase/FeatureData.jsx",
  );
  usedPaths.add(persistencePath);
  operations.push({
    operation: "create-or-update",
    path: persistencePath,
    role: "data-access",
    purpose:
      "Connect the requested feature to the proposed Supabase data model.",
    status: "proposed",
  });

  const reactIntegrationPath = preferredEvidencePath(
    local.wiringFindings.effectFiles,
    [
      ...local.wiringFindings.reactStateFiles,
      ...local.wiringFindings.entryFiles,
    ],
    "src/App.jsx",
  );
  usedPaths.add(reactIntegrationPath);
  operations.push({
    operation: local.sourceFiles.includes(reactIntegrationPath)
      ? "review-and-update"
      : "create",
    path: reactIntegrationPath,
    role: "react-integration",
    purpose:
      "Connect the React application lifecycle and state to the planned Supabase auth and data-access boundaries.",
    status: "proposed",
  });

  return operations;
}

function buildPackageOperations(local) {
  return local.existingSupabaseDependencies.includes("@supabase/supabase-js")
    ? []
    : [
        {
          operation: "add",
          package: "@supabase/supabase-js",
          reason: "Use the supported Supabase JavaScript client.",
          status: "proposed",
        },
      ];
}

function buildVerificationSteps({ userOwnedData, canProposeImplementation }) {
  if (!canProposeImplementation) {
    return [
      "Resolve every unsupported condition, then create a new planning snapshot.",
      "Confirm again that the connection targets a development project in read-only mode.",
    ];
  }
  return [
    "Review the future migration and confirm it contains only the proposed additive objects.",
    userOwnedData
      ? "Verify with two separate test users that each user can access only their own rows."
      : "Verify the feature against representative development-only test data.",
    "Run the application’s focused tests and production frontend build after future implementation.",
    "Confirm no service-role key or other secret is present in browser code.",
  ];
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
      return `Secret-like content was found at ${path.join(".") || "plan"}.`;
    }
    return "";
  }
  for (const [key, nested] of Object.entries(value)) {
    if (
      SECRET_KEY_PATTERN.test(key) &&
      key !== "environmentVariableNames"
    ) {
      return `Secret-bearing field '${key}' is not allowed in a plan.`;
    }
    if (ROW_CONTENT_KEY_PATTERN.test(key)) {
      return `Database row content field '${key}' is not allowed in a plan.`;
    }
    const unsafe = findUnsafeField(nested, [...path, key]);
    if (unsafe) return unsafe;
  }
  return "";
}

function validateProposedDatabaseObject(value) {
  if (
    !value ||
    typeof value !== "object" ||
    !["create-table", "review-table"].includes(value.operation) ||
    !boundedDatabaseName(value.name) ||
    !isBoundedNormalizedText(value.purpose, 500) ||
    !["authenticated-user-owned", "application"].includes(value.ownership) ||
    !Array.isArray(value.columns) ||
    !value.columns.length ||
    value.columns.length > 80 ||
    !Array.isArray(value.primaryKeys) ||
    value.primaryKeys.length > 20 ||
    !Array.isArray(value.foreignKeys) ||
    value.foreignKeys.length > 40 ||
    typeof value.rlsRequired !== "boolean"
  ) {
    return "A proposed database object is malformed.";
  }

  const columnNames = new Set();
  for (const column of value.columns) {
    if (
      !column ||
      typeof column !== "object" ||
      !boundedIdentifier(column.name, 63) ||
      column.name.includes(".") ||
      !PROPOSED_DATABASE_TYPES.has(column.dataType) ||
      typeof column.nullable !== "boolean" ||
      typeof column.unique !== "boolean" ||
      typeof column.safeToAddToExisting !== "boolean" ||
      (column.safeToAddToExisting &&
        (!column.nullable || column.unique))
    ) {
      return "A proposed database column is malformed or not safely bounded.";
    }
    columnNames.add(column.name);
  }
  if (columnNames.size !== value.columns.length) {
    return "A proposed database object contains duplicate columns.";
  }

  if (
    value.primaryKeys.some(
      (column) =>
        !boundedIdentifier(column, 63) ||
        column.includes(".") ||
        !columnNames.has(column),
    )
  ) {
    return "A proposed primary key is malformed.";
  }

  for (const foreignKey of value.foreignKeys) {
    if (
      !foreignKey ||
      typeof foreignKey !== "object" ||
      !boundedIdentifier(foreignKey.name, 63) ||
      foreignKey.name.includes(".") ||
      !boundedDatabaseName(foreignKey.targetTable) ||
      !Array.isArray(foreignKey.sourceColumns) ||
      !foreignKey.sourceColumns.length ||
      !Array.isArray(foreignKey.targetColumns) ||
      foreignKey.sourceColumns.length !== foreignKey.targetColumns.length ||
      foreignKey.sourceColumns.some(
        (column) =>
          !boundedIdentifier(column, 63) ||
          column.includes(".") ||
          !columnNames.has(column),
      ) ||
      foreignKey.targetColumns.some(
        (column) =>
          !boundedIdentifier(column, 63) || column.includes("."),
      )
    ) {
      return "A proposed foreign key is malformed.";
    }
  }

  const constrainedColumns = new Set([
    ...value.primaryKeys,
    ...value.foreignKeys.flatMap((foreignKey) => foreignKey.sourceColumns),
  ]);
  if (
    value.columns.some(
      (column) =>
        column.safeToAddToExisting && constrainedColumns.has(column.name),
    )
  ) {
    return "A constrained column cannot be marked safe to add to an existing table.";
  }
  return "";
}

function rejectSecretText(value) {
  if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new Error("Remove credentials or secret values from the planning request.");
  }
}

function dependencyNames(application) {
  const names = new Set();
  for (const field of ["dependencies", "devDependencies"]) {
    const value = application?.[field];
    if (Array.isArray(value)) {
      value.forEach((name) => names.add(String(name)));
    } else if (value && typeof value === "object") {
      Object.keys(value).forEach((name) => names.add(name));
    }
  }
  return names;
}

function normalizedFiles(files) {
  return (Array.isArray(files) ? files : [])
    .map((path) => String(path || "").trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function boundedPaths(values, limit) {
  return uniqueStrings(
    (Array.isArray(values) ? values : [])
      .map((path) => String(path || "").trim().replace(/\\/g, "/"))
      .filter((path) => isBoundedApplicationPath(path)),
  ).slice(0, limit);
}

function boundedStrings(values, limit, maxLength) {
  return uniqueStrings(
    (Array.isArray(values) ? values : [])
      .map((value) => boundedText(value, maxLength))
      .filter(Boolean),
  ).slice(0, limit);
}

function boundedText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function isBoundedNormalizedText(
  value,
  maxLength,
  { allowEmpty = false } = {},
) {
  if (typeof value !== "string") return false;
  const normalized = boundedText(value, maxLength);
  return (
    value === normalized &&
    value.length <= maxLength &&
    (allowEmpty || Boolean(value))
  );
}

function boundedIdentifier(value, maxLength) {
  const identifier = String(value || "").trim();
  return identifier.length <= maxLength && /^[A-Za-z0-9_.-]+$/.test(identifier)
    ? identifier
    : "";
}

function boundedDatabaseName(value) {
  const name = String(value || "").trim();
  return name.length <= 180 && /^[A-Za-z_][A-Za-z0-9_$.-]*$/.test(name)
    ? name
    : "";
}

function safeProjectUrl(value, projectReference) {
  const url = String(value || "").trim();
  const expected = projectReference
    ? `https://${projectReference}.supabase.co`
    : "";
  return url === expected ? url : "";
}

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function withoutFingerprint(plan) {
  const { fingerprint: _fingerprint, ...rest } = plan;
  return rest;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function fnv1a32(input, seed) {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
