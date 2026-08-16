export const IMPLEMENTATION_JOB_STATUS = Object.freeze({
  CREATED: "created",
  NEEDS_INSPECTION: "needs_inspection",
  INSPECTION_IN_PROGRESS: "inspection_in_progress",
  INSPECTION_COMPLETE: "inspection_complete",
  NEEDS_WRITE_PROPOSAL: "needs_write_proposal",
  WRITE_APPROVAL_PENDING: "write_approval_pending",
  WRITE_SUCCEEDED: "write_succeeded",
  OPERATION_COMPLETED: "operation_completed",
  WRITE_BLOCKED: "write_blocked",
  NEEDS_RECOVERY: "needs_recovery",
  RESTORE_AVAILABLE: "restore_available",
  RESTORED: "restored",
  STOPPED: "stopped",
  FAILED: "failed",
});

export const IMPLEMENTATION_JOB_ACTION = Object.freeze({
  INSPECT_LIKELY_FILE: "inspect_likely_file",
  INSPECT_SPECIFIC_FILE: "inspect_specific_file",
  REQUEST_WRITE_PROPOSAL: "request_write_proposal",
  APPROVE_WRITE: "approve_write",
  RETRY_WITH_EVIDENCE: "retry_with_evidence",
  SWITCH_MODEL: "switch_model",
  RESTORE_LAST_SNAPSHOT: "restore_last_snapshot",
  SHOW_BLOCKED_REASON: "show_blocked_reason",
  SHOW_MANUAL_STEPS: "show_manual_steps",
  STOP: "stop",
});

export const IMPLEMENTATION_JOB_TOOL_DECISION = Object.freeze({
  ALLOW: "allow",
  BLOCK_REPEATED_READ: "block_repeated_read",
  BLOCK_UNSAFE_WRITE_WITHOUT_INSPECTION: "block_unsafe_write_without_inspection",
  BLOCK_UNINSPECTED_WRITE_PATH: "block_uninspected_write_path",
  BLOCK_INSPECTION_FINGERPRINT_MISMATCH:
    "block_inspection_fingerprint_mismatch",
  BLOCK_UNPLANNED_WRITE_PATH: "block_unplanned_write_path",
  BLOCK_COMPLETED_WRITE_PATH: "block_completed_write_path",
  BLOCK_INVALID_OPERATION_COMPLETION: "block_invalid_operation_completion",
});

export const IMPLEMENTATION_OPERATION_COMPLETION_TOOL = "complete_operation";

const MAX_MUTATION_HISTORY = 80;
const MAX_INSPECTION_HISTORY = 80;
const MAX_TARGET_REFRESH_INSPECTIONS_PER_MUTATION_EPOCH = 1;
const MAX_REUSABLE_EXPORTED_SYMBOLS = 40;
const MAX_REUSABLE_EXPORTED_SYMBOL_LENGTH = 80;

export function normalizeImplementationPath(path = "") {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

export function normalizeImplementationPathKey(path = "") {
  return normalizeImplementationPath(path).toLowerCase();
}

export function isImplementationReadTool(toolName = "") {
  return ["read_file", "list_dir", "search_in_file"].includes(
    String(toolName || "").trim(),
  );
}

export function isImplementationWriteTool(toolName = "") {
  return ["write_file", "replace_text", "mkdir"].includes(
    String(toolName || "").trim(),
  );
}

export function isImplementationOperationCompletionTool(toolName = "") {
  return (
    String(toolName || "").trim() ===
    IMPLEMENTATION_OPERATION_COMPLETION_TOOL
  );
}

export function normalizeImplementationPathList(paths = []) {
  const seen = new Set();
  const normalized = [];

  for (const path of Array.isArray(paths) ? paths : []) {
    const cleanPath = normalizeImplementationPath(path);
    const key = normalizeImplementationPathKey(cleanPath);

    if (!cleanPath || seen.has(key)) continue;

    seen.add(key);
    normalized.push(cleanPath);
  }

  return normalized;
}

export function hasImplementationPath(paths = [], path = "") {
  const targetKey = normalizeImplementationPathKey(path);
  if (!targetKey) return false;

  return (Array.isArray(paths) ? paths : []).some(
    (candidate) => normalizeImplementationPathKey(candidate) === targetKey,
  );
}

function stableImplementationHash(value = "") {
  const input = String(value || "");
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function normalizeOperationId(value = "") {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9_.-]{1,120}$/.test(id) ? id : "";
}

function normalizeResponsibilityId(value = "") {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9_.-]{1,80}$/.test(id) ? id : "";
}

function normalizeImplementationResponsibilities(responsibilities = []) {
  const byId = new Map();
  for (const item of Array.isArray(responsibilities) ? responsibilities : []) {
    const id = normalizeResponsibilityId(item?.id || item);
    if (!id) continue;
    byId.set(id, {
      id,
      purpose: String(item?.purpose || "").trim().slice(0, 300),
    });
  }
  return [...byId.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function buildFallbackOperation(path) {
  const normalizedPath = normalizeImplementationPath(path);
  const responsibilityId = "approved-path-implementation";
  return {
    id: `implementation-operation-${stableImplementationHash(
      `${normalizeImplementationPathKey(normalizedPath)}\u0000${responsibilityId}`,
    )}`,
    path: normalizedPath,
    role: "application",
    purpose: "Complete the approved implementation responsibility for this path.",
    responsibilityIds: [responsibilityId],
    responsibilities: [
      {
        id: responsibilityId,
        purpose: "Complete the approved implementation responsibility for this path.",
      },
    ],
    status: "pending",
  };
}

function normalizePlannedOperations(operations = [], allowedWritePaths = []) {
  const allowed = Array.isArray(allowedWritePaths) ? allowedWritePaths : [];
  const byId = new Map();

  for (const item of Array.isArray(operations) ? operations : []) {
    const path = normalizeImplementationPath(item?.path);
    const id = normalizeOperationId(item?.id);
    if (!path || !id || (allowed.length && !hasImplementationPath(allowed, path))) {
      continue;
    }
    const responsibilities = normalizeImplementationResponsibilities(
      item?.responsibilities?.length
        ? item.responsibilities
        : item?.responsibilityIds,
    );
    if (responsibilities.length === 0) continue;
    byId.set(id, {
      id,
      path,
      role: String(item?.role || "application").trim().slice(0, 80),
      purpose: String(item?.purpose || "").trim().slice(0, 500),
      responsibilityIds: responsibilities.map((entry) => entry.id),
      responsibilities,
      status: "pending",
    });
  }

  for (const path of allowed) {
    const hasOperationForPath = [...byId.values()].some(
      (operation) =>
        normalizeImplementationPathKey(operation.path) ===
        normalizeImplementationPathKey(path),
    );
    if (hasOperationForPath) continue;

    const fallback = buildFallbackOperation(path);
    byId.set(fallback.id, fallback);
  }

  return [...byId.values()];
}

function normalizeSuccessfulMutations(records = []) {
  return (Array.isArray(records) ? records : [])
    .map((record) => ({
      callId: String(record?.callId || "").trim().slice(0, 180),
      toolName: String(record?.toolName || "").trim(),
      path: normalizeImplementationPath(record?.path),
      sequence: Number.isInteger(record?.sequence)
        ? Math.max(0, record.sequence)
        : 0,
    }))
    .filter(
      (record) =>
        record.callId &&
        ["write_file", "replace_text"].includes(record.toolName) &&
        record.path &&
        record.sequence > 0,
    )
    .slice(-MAX_MUTATION_HISTORY);
}

function normalizeInspectionHistory(records = []) {
  return (Array.isArray(records) ? records : [])
    .map((record) => ({
      callId: String(record?.callId || "").trim().slice(0, 180),
      path: normalizeImplementationPath(record?.path),
      fingerprint: normalizeFileFingerprint(record?.fingerprint),
      sequence: Number.isInteger(record?.sequence)
        ? Math.max(0, record.sequence)
        : 0,
    }))
    .filter(
      (record) =>
        record.callId &&
        record.path &&
        record.fingerprint &&
        record.sequence > 0,
    )
    .slice(-MAX_INSPECTION_HISTORY);
}

function getLatestRecordForPath(records = [], path = "") {
  const pathKey = normalizeImplementationPathKey(path);
  return (Array.isArray(records) ? records : [])
    .filter((record) => normalizeImplementationPathKey(record?.path) === pathKey)
    .sort((left, right) => right.sequence - left.sequence)[0] || null;
}

function isPendingImplementationTarget(job, path = "") {
  const pathKey = normalizeImplementationPathKey(path);
  if (!pathKey) return false;

  return job.plannedOperations.some(
    (operation) =>
      normalizeImplementationPathKey(operation.path) === pathKey &&
      !job.completedOperationIds.includes(operation.id),
  );
}

function canRefreshPendingImplementationTarget(job, path = "") {
  const pathKey = normalizeImplementationPathKey(path);
  if (!pathKey || !isPendingImplementationTarget(job, path)) return false;

  const latestMutation = getLatestRecordForPath(job.successfulMutations, path);
  const epochStartSequence = latestMutation?.sequence || 0;
  const targetInspectionsInEpoch = job.inspectionHistory
    .filter(
      (inspection) =>
        normalizeImplementationPathKey(inspection.path) === pathKey &&
        inspection.sequence > epochStartSequence,
    )
    .sort((left, right) => left.sequence - right.sequence);
  if (
    targetInspectionsInEpoch.length === 0 ||
    targetInspectionsInEpoch.length >
      MAX_TARGET_REFRESH_INSPECTIONS_PER_MUTATION_EPOCH
  ) {
    return false;
  }

  const latestTargetInspection =
    targetInspectionsInEpoch[targetInspectionsInEpoch.length - 1];
  return job.inspectionHistory.some(
    (inspection) =>
      inspection.sequence > latestTargetInspection.sequence &&
      normalizeImplementationPathKey(inspection.path) !== pathKey,
  );
}

export function getPendingImplementationOperations(job = {}) {
  const current = createImplementationJob(job);
  const completed = new Set(current.completedOperationIds);
  return current.plannedOperations.filter((operation) => !completed.has(operation.id));
}

export function hasCompletedPlannedImplementationOperations(job = {}) {
  const current = createImplementationJob(job);
  return (
    current.plannedOperations.length > 0 &&
    current.plannedOperations.every((operation) =>
      current.completedOperationIds.includes(operation.id),
    )
  );
}

export function hasCompletedPlannedImplementationWrites(job = {}) {
  // Compatibility export for older callers; completion is operation-based.
  return hasCompletedPlannedImplementationOperations(job);
}

function createImplementationJobId() {
  return `implementation-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeToolRecord(record = {}) {
  const toolName = String(record?.toolName || record?.name || "").trim();
  const path = normalizeImplementationPath(record?.path || record?.args?.path || "");

  return {
    toolName,
    path,
    ok: typeof record?.ok === "boolean" ? record.ok : null,
    error: String(record?.error || "").trim(),
    at: Number.isFinite(record?.at) ? record.at : Date.now(),
  };
}

function normalizeReusableHelperContract(contract = {}) {
  const exportName = String(contract?.exportName || "").trim();
  if (
    !exportName ||
    exportName.length > MAX_REUSABLE_EXPORTED_SYMBOL_LENGTH ||
    !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(exportName)
  ) {
    return null;
  }

  const role = String(contract?.role || "").trim();
  const resultKind = String(contract?.resultKind || "").trim();
  const errorMode = String(contract?.errorMode || "").trim();
  const payloadPath = String(contract?.payloadPath || "").trim();
  const userPath = String(contract?.userPath || "").trim();
  const sessionPath = String(contract?.sessionPath || "").trim();

  const normalized = { exportName };

  if (
    ["progress-load", "progress-save", "current-user", "sign-in", "sign-up"].includes(
      role,
    )
  ) {
    normalized.role = role;
  }

  if (["database-row", "user", "auth-response"].includes(resultKind)) {
    normalized.resultKind = resultKind;
  }

  if (["throws", "response-envelope"].includes(errorMode)) {
    normalized.errorMode = errorMode;
  }

  const isStaticPropertyPath = (value) =>
    value.length <= 80 &&
    /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(value);

  if (isStaticPropertyPath(payloadPath)) normalized.payloadPath = payloadPath;
  if (isStaticPropertyPath(userPath)) normalized.userPath = userPath;
  if (isStaticPropertyPath(sessionPath)) normalized.sessionPath = sessionPath;

  if (typeof contract?.nullable === "boolean") {
    normalized.nullable = contract.nullable;
  }

  if (typeof contract?.authenticatedStateRequiresSession === "boolean") {
    normalized.authenticatedStateRequiresSession =
      contract.authenticatedStateRequiresSession;
  }

  return Object.keys(normalized).length > 1 ? normalized : null;
}

function normalizeReusableCapabilityEvidence(evidence = []) {
  const byPath = new Map();

  for (const item of Array.isArray(evidence) ? evidence : []) {
    const path = normalizeImplementationPath(item?.path);
    if (!path) continue;

    const pathKey = normalizeImplementationPathKey(path);
    const current = byPath.get(pathKey) || {
      path,
      capabilities: new Set(),
      exportedSymbols: new Set(),
      helperContracts: new Map(),
    };

    for (const capability of Array.isArray(item?.capabilities)
      ? item.capabilities
      : []) {
      const normalized = String(capability || "").trim();
      if (normalized) current.capabilities.add(normalized);
    }

    for (const symbol of Array.isArray(item?.exportedSymbols)
      ? item.exportedSymbols
      : []) {
      const normalized = String(symbol || "").trim();
      if (
        normalized.length <= MAX_REUSABLE_EXPORTED_SYMBOL_LENGTH &&
        /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(normalized)
      ) {
        current.exportedSymbols.add(normalized);
      }
    }

    for (const contract of Array.isArray(item?.helperContracts)
      ? item.helperContracts
      : []) {
      const normalized = normalizeReusableHelperContract(contract);
      if (normalized) {
        current.helperContracts.set(normalized.exportName, normalized);
      }
    }

    byPath.set(pathKey, current);
  }

  return [...byPath.values()]
    .filter((item) => item.capabilities.size > 0)
    .map((item) => {
      const exportedSymbols = [...item.exportedSymbols]
        .sort()
        .slice(0, MAX_REUSABLE_EXPORTED_SYMBOLS);
      const helperContracts = [...item.helperContracts.values()]
        .sort((left, right) => left.exportName.localeCompare(right.exportName))
        .slice(0, 40);

      return {
        path: item.path,
        capabilities: [...item.capabilities].sort(),
        ...(exportedSymbols.length ? { exportedSymbols } : {}),
        ...(helperContracts.length ? { helperContracts } : {}),
      };
    });
}
function extractFullFileSourceFromToolResult(result = {}) {
  const text =
    typeof result?.result === "string"
      ? result.result
      : typeof result === "string"
        ? result
        : "";
  const marker = "--- File contents ---\n";
  const markerIndex = text.indexOf(marker);
  return markerIndex >= 0 ? text.slice(markerIndex + marker.length) : "";
}

function extractStaticExportedApiSymbols(source = "") {
  const symbols = new Set();
  const remember = (value) => {
    const symbol = String(value || "").trim();
    if (
      symbols.size < MAX_REUSABLE_EXPORTED_SYMBOLS &&
      symbol.length <= MAX_REUSABLE_EXPORTED_SYMBOL_LENGTH &&
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(symbol)
    ) {
      symbols.add(symbol);
    }
  };
  const text = String(source || "");
  const declarationPattern =
    /^[ \t]*export\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
  for (const match of text.matchAll(declarationPattern)) remember(match[1]);

  const functionVariablePattern =
    /^[ \t]*export\s+(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*=>/gm;
  for (const match of text.matchAll(functionVariablePattern)) remember(match[1]);

  const exportListPattern = /^[ \t]*export\s*\{([^}]*)\}/gm;
  for (const match of text.matchAll(exportListPattern)) {
    for (const entry of match[1].split(",")) {
      const parsed = entry
        .trim()
        .match(
          /^([A-Za-z_$][A-Za-z0-9_$]*)(?:\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*))?$/,
        );
      if (parsed) remember(parsed[2] || parsed[1]);
    }
  }

  return [...symbols].sort();
}

function findMatchingImplementationBrace(text, startIndex) {
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = "";
      }

      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;

    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function extractProvableReusableHelperContracts(source = "") {
  const text = String(source || "");
  const contracts = [];

  const functionPattern =
    /^[ \t]*export\s+(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\([^)]*\)\s*\{/gm;

  for (const match of text.matchAll(functionPattern)) {
    const exportName = match[1];
    const openBrace =
      match.index + match[0].lastIndexOf("{");
    const closeBrace = findMatchingImplementationBrace(text, openBrace);

    if (closeBrace < 0) continue;

    const body = text.slice(openBrace + 1, closeBrace);

    const tableMatch = body.match(
      /\.from\s*\(\s*(['"`])([^'"`]+)\1\s*\)/,
    );
    const selectMatch = body.match(
      /\.select\s*\(\s*(['"`])([^'"`]+)\1\s*\)/,
    );

    const tableName = String(tableMatch?.[2] || "").trim();
    const selectedColumns = String(selectMatch?.[2] || "")
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);

    const returnsData = /\breturn\s+data\s*;?/.test(body);
    const returnsDataUser = /\breturn\s+data(?:\?\.|\.)user\s*;?/.test(body);
    const throwsError =
      /\bif\s*\(\s*error\s*\)\s*\{[\s\S]*?\bthrow\s+error\b/.test(body);
    const usesMaybeSingle = /\.maybeSingle\s*\(/.test(body);
    const usesSingle = /\.single\s*\(/.test(body);
    const usesProgressMutation =
      /\.(?:insert|update|upsert)\s*\(/.test(body);

    const delegatesToSignIn =
      /\breturn\s+supabase\.auth\.signInWithPassword\s*\(/.test(body);
    const delegatesToSignUp =
      /\breturn\s+supabase\.auth\.signUp\s*\(/.test(body);
    const readsCurrentAuthUser =
      /\bsupabase\.auth\.getUser\s*\(/.test(body) && returnsDataUser;

    if (delegatesToSignIn) {
      contracts.push({
        exportName,
        role: "sign-in",
        resultKind: "auth-response",
        userPath: "data.user",
        sessionPath: "data.session",
        authenticatedStateRequiresSession: false,
        errorMode: "response-envelope",
      });
    }

    if (delegatesToSignUp) {
      contracts.push({
        exportName,
        role: "sign-up",
        resultKind: "auth-response",
        userPath: "data.user",
        sessionPath: "data.session",
        authenticatedStateRequiresSession: true,
        errorMode: "response-envelope",
      });
    }

    if (readsCurrentAuthUser) {
      contracts.push({
        exportName,
        role: "current-user",
        resultKind: "user",
        ...(throwsError ? { errorMode: "throws" } : {}),
      });
    }

    const isProgressRead =
      (/progress/i.test(exportName) || /progress/i.test(tableName)) &&
      Boolean(tableName) &&
      selectedColumns.includes("data") &&
      usesMaybeSingle &&
      returnsData;

    if (isProgressRead) {
      contracts.push({
        exportName,
        role: "progress-load",
        resultKind: "database-row",
        payloadPath: "data",
        nullable: true,
        ...(throwsError ? { errorMode: "throws" } : {}),
      });
    }

    const isProgressSave =
      (/progress/i.test(exportName) || /progress/i.test(tableName)) &&
      Boolean(tableName) &&
      selectedColumns.includes("data") &&
      usesProgressMutation &&
      usesSingle &&
      returnsData;

    if (isProgressSave) {
      contracts.push({
        exportName,
        role: "progress-save",
        resultKind: "database-row",
        payloadPath: "data",
        nullable: false,
        ...(throwsError ? { errorMode: "throws" } : {}),
      });
    }
  }

  return contracts;
}
function rememberReusableCapabilityExports(job, path, result) {
  const pathKey = normalizeImplementationPathKey(path);
  if (
    !pathKey ||
    !job.reusableCapabilities.some(
      (item) => normalizeImplementationPathKey(item.path) === pathKey,
    )
  ) {
    return job;
  }

  const source = extractFullFileSourceFromToolResult(result);
  const exportedSymbols = extractStaticExportedApiSymbols(source);
  const helperContracts = extractProvableReusableHelperContracts(source);

  if (exportedSymbols.length === 0 && helperContracts.length === 0) return job;

  return {
    ...job,
    reusableCapabilities: normalizeReusableCapabilityEvidence(
      job.reusableCapabilities.map((item) =>
        normalizeImplementationPathKey(item.path) === pathKey
          ? {
              ...item,
              exportedSymbols: [
                ...(item.exportedSymbols || []),
                ...exportedSymbols,
              ],
              helperContracts: [
                ...(item.helperContracts || []),
                ...helperContracts,
              ],
            }
          : item,
      ),
    ),
  };
}
const FILE_FINGERPRINT_RE = /^fnv1a64-[a-f0-9]{16}$/;

function normalizeFileFingerprint(value = "") {
  const fingerprint = String(value || "").trim().toLowerCase();
  return FILE_FINGERPRINT_RE.test(fingerprint) ? fingerprint : "";
}

function normalizeInspectedFileFingerprints(evidence = []) {
  const byPath = new Map();

  for (const item of Array.isArray(evidence) ? evidence : []) {
    const path = normalizeImplementationPath(item?.path);
    const fingerprint = normalizeFileFingerprint(item?.fingerprint);
    if (!path || !fingerprint) continue;
    byPath.set(normalizeImplementationPathKey(path), { path, fingerprint });
  }

  return [...byPath.values()];
}

export function getImplementationFileFingerprint(job = {}, path = "") {
  const pathKey = normalizeImplementationPathKey(path);
  if (!pathKey) return "";

  const evidence = Array.isArray(job?.inspectedFileFingerprints)
    ? job.inspectedFileFingerprints
    : [];
  const match = evidence.find(
    (item) => normalizeImplementationPathKey(item?.path) === pathKey,
  );
  return normalizeFileFingerprint(match?.fingerprint);
}

function extractFileFingerprintFromToolResult(result = {}) {
  const text =
    typeof result?.result === "string"
      ? result.result
      : typeof result === "string"
        ? result
        : "";
  const match = text.match(/\bFile fingerprint:\s*(fnv1a64-[a-f0-9]{16})\b/i);
  return normalizeFileFingerprint(match?.[1]);
}

export function createImplementationJob(seed = {}) {
  const now = Date.now();
  const createdAt = Number.isFinite(seed.createdAt) ? seed.createdAt : now;
  const inspectedPaths = normalizeImplementationPathList(seed.inspectedPaths);
  const allowedWritePaths = Array.isArray(seed.allowedWritePaths)
    ? normalizeImplementationPathList(seed.allowedWritePaths)
    : null;
  const plannedOperations = normalizePlannedOperations(
    seed.plannedOperations,
    allowedWritePaths,
  );
  const plannedOperationIds = new Set(
    plannedOperations.map((operation) => operation.id),
  );
  const completedOperationIds = Array.from(
    new Set(
      (Array.isArray(seed.completedOperationIds)
        ? seed.completedOperationIds
        : [])
        .map(normalizeOperationId)
        .filter((id) => id && plannedOperationIds.has(id)),
    ),
  );
  const completedOperationIdSet = new Set(completedOperationIds);
  const defaultAllowedNextActions =
    inspectedPaths.length > 0
      ? [
          IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
          IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
          IMPLEMENTATION_JOB_ACTION.STOP,
        ]
      : [IMPLEMENTATION_JOB_ACTION.INSPECT_LIKELY_FILE];

  return {
    jobId: String(seed.jobId || "").trim() || createImplementationJobId(),
    status:
      String(seed.status || "").trim() ||
      IMPLEMENTATION_JOB_STATUS.NEEDS_INSPECTION,
    originalGoal: String(seed.originalGoal || "").trim(),
    continuationContext: String(seed.continuationContext || "").trim(),
    supabaseAppWiringContract: Array.isArray(seed.supabaseAppWiringContract)
      ? seed.supabaseAppWiringContract
      : null,
    reusableCapabilities: normalizeReusableCapabilityEvidence(
      seed.reusableCapabilities,
    ),
    taskKind: String(seed.taskKind || "implementation").trim(),
    modelPolicyKind: String(seed.modelPolicyKind || "").trim(),
    createdAt,
    updatedAt: Number.isFinite(seed.updatedAt) ? seed.updatedAt : now,
    inspectedPaths,
    inspectedFileFingerprints: normalizeInspectedFileFingerprints(
      seed.inspectedFileFingerprints,
    ),
    allowedWritePaths,
    plannedOperations: plannedOperations.map((operation) => ({
      ...operation,
      status: completedOperationIdSet.has(operation.id)
        ? "completed"
        : "pending",
    })),
    completedOperationIds,
    attemptedWrites: normalizeImplementationPathList(seed.attemptedWrites),
    successfulWrites: normalizeImplementationPathList(seed.successfulWrites),
    successfulMutations: normalizeSuccessfulMutations(
      seed.successfulMutations,
    ),
    inspectionHistory: normalizeInspectionHistory(seed.inspectionHistory),
    blockedWrites: normalizeImplementationPathList(seed.blockedWrites),
    failedTools: Array.isArray(seed.failedTools)
      ? seed.failedTools.map(normalizeToolRecord)
      : [],
    preWriteSnapshots: Array.isArray(seed.preWriteSnapshots)
      ? seed.preWriteSnapshots
      : [],
    allowedNextActions: Array.isArray(seed.allowedNextActions)
      ? seed.allowedNextActions.map((item) => String(item || "").trim()).filter(Boolean)
      : defaultAllowedNextActions,
    lastAssistantResult: seed.lastAssistantResult || null,
    lastSafeStopReason: String(seed.lastSafeStopReason || "").trim(),
  };
}

export function getImplementationJobAllowedNextActions(job) {
  return [...createImplementationJob(job).allowedNextActions];
}

export function rememberImplementationInspection(
  job,
  path = "",
  fingerprint = "",
  evidence = {},
) {
  const current = createImplementationJob(job);
  const cleanPath = normalizeImplementationPath(path);
  const cleanFingerprint = normalizeFileFingerprint(fingerprint);

  if (!cleanPath) {
    return {
      ...current,
      updatedAt: Date.now(),
    };
  }

  const inspectedPaths = hasImplementationPath(current.inspectedPaths, cleanPath)
    ? current.inspectedPaths
    : [...current.inspectedPaths, cleanPath];
  const inspectedFileFingerprints = cleanFingerprint
    ? [
        ...current.inspectedFileFingerprints.filter(
          (item) =>
            normalizeImplementationPathKey(item?.path) !==
            normalizeImplementationPathKey(cleanPath),
        ),
        { path: cleanPath, fingerprint: cleanFingerprint },
      ]
    : current.inspectedFileFingerprints;
  const callId = String(evidence?.callId || "").trim().slice(0, 180);
  const sequence = Number.isInteger(evidence?.sequence)
    ? Math.max(0, evidence.sequence)
    : 0;
  const inspectionHistory =
    cleanFingerprint && callId && sequence > 0
      ? [
          ...current.inspectionHistory,
          {
            callId,
            path: cleanPath,
            fingerprint: cleanFingerprint,
            sequence,
          },
        ].slice(-MAX_INSPECTION_HISTORY)
      : current.inspectionHistory;

  return {
    ...current,
    status: IMPLEMENTATION_JOB_STATUS.INSPECTION_COMPLETE,
    inspectedPaths,
    inspectedFileFingerprints,
    inspectionHistory,
    allowedNextActions: [
      IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
      IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
      IMPLEMENTATION_JOB_ACTION.STOP,
    ],
    updatedAt: Date.now(),
  };
}

export function rememberImplementationWriteAttempt(job, toolCall = {}, result = {}) {
  const current = createImplementationJob(job);
  const toolName = String(toolCall?.name || toolCall?.toolName || "").trim();
  const path = normalizeImplementationPath(toolCall?.args?.path || "");
  const ok = Boolean(result?.ok);

  if (!path || !isImplementationWriteTool(toolName)) {
    return current;
  }

  const attemptedWrites = hasImplementationPath(current.attemptedWrites, path)
    ? current.attemptedWrites
    : [...current.attemptedWrites, path];

  if (ok) {
    const callId = String(result?.callId || "").trim().slice(0, 180);
    const sequence = Number.isInteger(result?.sequence)
      ? Math.max(0, result.sequence)
      : 0;
    const successfulMutations =
      ["write_file", "replace_text"].includes(toolName) &&
      callId &&
      sequence > 0
        ? [
            ...current.successfulMutations,
            { callId, toolName, path, sequence },
          ].slice(-MAX_MUTATION_HISTORY)
        : current.successfulMutations;
    return {
      ...current,
      status: IMPLEMENTATION_JOB_STATUS.WRITE_SUCCEEDED,
      attemptedWrites,
      successfulWrites: hasImplementationPath(current.successfulWrites, path)
        ? current.successfulWrites
        : [...current.successfulWrites, path],
      successfulMutations,
      allowedNextActions: [
        IMPLEMENTATION_JOB_ACTION.RESTORE_LAST_SNAPSHOT,
        IMPLEMENTATION_JOB_ACTION.STOP,
      ],
      updatedAt: Date.now(),
    };
  }

  return {
    ...current,
    status: IMPLEMENTATION_JOB_STATUS.WRITE_BLOCKED,
    attemptedWrites,
    blockedWrites: hasImplementationPath(current.blockedWrites, path)
      ? current.blockedWrites
      : [...current.blockedWrites, path],
    allowedNextActions: [
      IMPLEMENTATION_JOB_ACTION.RETRY_WITH_EVIDENCE,
      IMPLEMENTATION_JOB_ACTION.SHOW_BLOCKED_REASON,
      IMPLEMENTATION_JOB_ACTION.STOP,
    ],
    updatedAt: Date.now(),
  };
}

export function evaluateImplementationOperationCompletion(
  job,
  claim = {},
) {
  const current = createImplementationJob(job);
  const claimKeys =
    claim && typeof claim === "object" && !Array.isArray(claim)
      ? Object.keys(claim).sort()
      : [];
  if (
    claimKeys.length !== 2 ||
    claimKeys[0] !== "operationId" ||
    claimKeys[1] !== "satisfiedResponsibilityIds"
  ) {
    return {
      ok: false,
      operationId: normalizeOperationId(claim?.operationId),
      error:
        "KForge kept this operation pending because its structured completion claim was malformed or contained unsupported fields.",
    };
  }
  const operationId = normalizeOperationId(claim?.operationId);
  const operation = current.plannedOperations.find(
    (candidate) => candidate.id === operationId,
  );

  if (!operation) {
    return {
      ok: false,
      operationId,
      error:
        "KForge blocked operation completion because the exact planned operation ID was not found.",
    };
  }
  if (current.completedOperationIds.includes(operationId)) {
    return {
      ok: false,
      operationId,
      error: "KForge blocked a duplicate operation-completion claim.",
    };
  }

  const rawSatisfiedResponsibilityIds = Array.isArray(
    claim?.satisfiedResponsibilityIds,
  )
    ? claim.satisfiedResponsibilityIds
    : [];
  const normalizedSatisfiedResponsibilityIds =
    rawSatisfiedResponsibilityIds.map(normalizeResponsibilityId);
  if (
    rawSatisfiedResponsibilityIds.length === 0 ||
    rawSatisfiedResponsibilityIds.length > 12 ||
    normalizedSatisfiedResponsibilityIds.some((id) => !id) ||
    new Set(normalizedSatisfiedResponsibilityIds).size !==
      normalizedSatisfiedResponsibilityIds.length
  ) {
    return {
      ok: false,
      operationId,
      error:
        "KForge kept this operation pending because its structured responsibility claim was malformed or duplicated.",
    };
  }
  const satisfiedResponsibilityIds = [
    ...normalizedSatisfiedResponsibilityIds,
  ].sort();
  const expectedResponsibilityIds = [...operation.responsibilityIds].sort();
  if (
    satisfiedResponsibilityIds.length !== expectedResponsibilityIds.length ||
    satisfiedResponsibilityIds.some(
      (id, index) => id !== expectedResponsibilityIds[index],
    )
  ) {
    return {
      ok: false,
      operationId,
      error:
        "KForge kept this operation pending because its completion claim did not explicitly satisfy every structured responsibility.",
    };
  }

  const latestMutation = getLatestRecordForPath(
    current.successfulMutations,
    operation.path,
  );
  if (!latestMutation) {
    return {
      ok: false,
      operationId,
      error:
        "KForge kept this operation pending because it has no correlated successful file mutation.",
    };
  }

  const latestInspection = getLatestRecordForPath(
    current.inspectionHistory,
    operation.path,
  );
  if (
    !latestInspection ||
    latestInspection.sequence <= latestMutation.sequence
  ) {
    return {
      ok: false,
      operationId,
      error:
        "KForge kept this operation pending because the target was not re-inspected after its latest successful mutation.",
    };
  }

  return {
    ok: true,
    operationId,
    operation,
    satisfiedResponsibilityIds,
    latestMutation,
    latestInspection,
  };
}

export function rememberImplementationOperationCompletion(job, claim = {}) {
  const current = createImplementationJob(job);
  const validation = evaluateImplementationOperationCompletion(current, claim);
  if (!validation.ok) return current;

  return createImplementationJob({
    ...current,
    status: IMPLEMENTATION_JOB_STATUS.OPERATION_COMPLETED,
    completedOperationIds: [
      ...current.completedOperationIds,
      validation.operationId,
    ],
    allowedNextActions: [
      IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
      IMPLEMENTATION_JOB_ACTION.STOP,
    ],
    updatedAt: Date.now(),
  });
}

export function rememberImplementationToolFailure(job, toolCall = {}, error = "") {
  const current = createImplementationJob(job);
  const failedTool = normalizeToolRecord({
    toolName: toolCall?.name || toolCall?.toolName,
    path: toolCall?.args?.path,
    ok: false,
    error,
  });

  return {
    ...current,
    status: IMPLEMENTATION_JOB_STATUS.NEEDS_RECOVERY,
    failedTools: [...current.failedTools, failedTool],
    allowedNextActions: [
      IMPLEMENTATION_JOB_ACTION.RETRY_WITH_EVIDENCE,
      IMPLEMENTATION_JOB_ACTION.SWITCH_MODEL,
      IMPLEMENTATION_JOB_ACTION.STOP,
    ],
    updatedAt: Date.now(),
  };
}

export function rememberImplementationToolResult(
  job,
  toolCall = {},
  result = {},
) {
  const current = createImplementationJob(job);
  const toolName = String(
    toolCall?.name || toolCall?.toolName || "",
  ).trim();
  const inspectedPath =
    toolCall?.args?.path || toolCall?.args?.dirPath || "";

  if (result?.ok && isImplementationReadTool(toolName)) {
    const inspectedJob = rememberImplementationInspection(
      current,
      inspectedPath,
      toolName === "read_file"
        ? extractFileFingerprintFromToolResult(result)
        : "",
      {
        callId: result?.callId,
        sequence: result?.sequence,
      },
    );
    return toolName === "read_file"
      ? rememberReusableCapabilityExports(
          inspectedJob,
          inspectedPath,
          result,
        )
      : inspectedJob;
  }

  if (isImplementationWriteTool(toolName)) {
    return rememberImplementationWriteAttempt(
      current,
      toolCall,
      result,
    );
  }

  if (
    result?.ok &&
    isImplementationOperationCompletionTool(toolName)
  ) {
    return rememberImplementationOperationCompletion(
      current,
      toolCall?.args,
    );
  }

  if (!result?.ok) {
    return rememberImplementationToolFailure(
      current,
      toolCall,
      result?.error || "Tool failed during implementation job.",
    );
  }

  return current;
}

export function evaluateImplementationToolRequest(job, toolCall = {}, options = {}) {
  const current = createImplementationJob(job);
  const toolName = String(toolCall?.name || toolCall?.toolName || "").trim();
  const path = normalizeImplementationPath(toolCall?.args?.path || "");
  const blockRepeatedReads = options.blockRepeatedReads !== false;
  const requireInspectionBeforeWrite =
    options.requireInspectionBeforeWrite === true;
  const latestMutation = path
    ? getLatestRecordForPath(current.successfulMutations, path)
    : null;
  const latestInspection = path
    ? getLatestRecordForPath(current.inspectionHistory, path)
    : null;
  const needsPostMutationInspection = Boolean(
    latestMutation &&
      (!latestInspection || latestInspection.sequence <= latestMutation.sequence),
  );
  const canRefreshActiveTarget =
    toolName === "read_file" &&
    canRefreshPendingImplementationTarget(current, path);
  const requiredFreshInspectionPath = normalizeImplementationPath(
    options.requiredFreshInspectionPath,
  );
  const canPerformRequiredFreshInspection = Boolean(
    toolName === "read_file" &&
      requiredFreshInspectionPath &&
      normalizeImplementationPathKey(path) ===
        normalizeImplementationPathKey(requiredFreshInspectionPath) &&
      isPendingImplementationTarget(current, path),
  );

  if (isImplementationOperationCompletionTool(toolName)) {
    const validation = evaluateImplementationOperationCompletion(
      current,
      toolCall?.args,
    );
    return validation.ok
      ? {
          decision: IMPLEMENTATION_JOB_TOOL_DECISION.ALLOW,
          ok: true,
          path: validation.operation.path,
          toolName,
          operationId: validation.operationId,
          allowedNextActions: [],
          error: "",
        }
      : {
          decision:
            IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_INVALID_OPERATION_COMPLETION,
          ok: false,
          path: validation.operation?.path || "",
          toolName,
          operationId: validation.operationId,
          allowedNextActions: [
            IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
            IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
            IMPLEMENTATION_JOB_ACTION.STOP,
          ],
          error: validation.error,
        };
  }

  if (
    blockRepeatedReads &&
    isImplementationReadTool(toolName) &&
    path &&
    hasImplementationPath(current.inspectedPaths, path) &&
    !needsPostMutationInspection &&
    !canRefreshActiveTarget &&
    !canPerformRequiredFreshInspection
  ) {
    return {
      decision: IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_REPEATED_READ,
      ok: false,
      path,
      toolName,
      allowedNextActions: [
        IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
        IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
        IMPLEMENTATION_JOB_ACTION.STOP,
      ],
      error:
        "KForge blocked a repeated read of an already inspected file for this implementation job. Use the inspected evidence, request one smallest safe replace_text or write_file change, inspect one different clearly relevant text file, or stop with a clear job-specific reason.",
    };
  }

  if (
    Array.isArray(current.allowedWritePaths) &&
    isImplementationWriteTool(toolName) &&
    path &&
    !hasImplementationPath(current.allowedWritePaths, path)
  ) {
    return {
      decision: IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_UNPLANNED_WRITE_PATH,
      ok: false,
      path,
      toolName,
      allowedNextActions: [
        IMPLEMENTATION_JOB_ACTION.STOP,
      ],
      error:
        "KForge blocked a write request outside the approved implementation paths.",
    };
  }

  if (
    Array.isArray(current.allowedWritePaths) &&
    isImplementationWriteTool(toolName) &&
    path &&
    current.plannedOperations.some(
      (operation) =>
        normalizeImplementationPathKey(operation.path) ===
          normalizeImplementationPathKey(path),
    ) &&
    current.plannedOperations
      .filter(
        (operation) =>
          normalizeImplementationPathKey(operation.path) ===
          normalizeImplementationPathKey(path),
      )
      .every((operation) =>
        current.completedOperationIds.includes(operation.id),
      )
  ) {
    return {
      decision: IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_COMPLETED_WRITE_PATH,
      ok: false,
      path,
      toolName,
      allowedNextActions: [
        IMPLEMENTATION_JOB_ACTION.REQUEST_WRITE_PROPOSAL,
        IMPLEMENTATION_JOB_ACTION.STOP,
      ],
      error:
        "KForge blocked a write to a path whose planned implementation operation is already complete. Start a new controlled job to modify completed work.",
    };
  }
  if (
    toolName === "replace_text" &&
    path &&
    !hasImplementationPath(current.inspectedPaths, path)
  ) {
    return {
      decision: IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_UNINSPECTED_WRITE_PATH,
      ok: false,
      path,
      toolName,
      allowedNextActions: [
        IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
        IMPLEMENTATION_JOB_ACTION.STOP,
      ],
      error:
        "KForge blocked replace_text because the exact target file was not successfully inspected for this implementation job.",
    };
  }
  if (["replace_text", "write_file"].includes(toolName) && path) {
    if (needsPostMutationInspection) {
      return {
        decision:
          IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_UNINSPECTED_WRITE_PATH,
        ok: false,
        path,
        toolName,
        allowedNextActions: [
          IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
          IMPLEMENTATION_JOB_ACTION.STOP,
        ],
        error:
          `KForge blocked another ${toolName} because the target must be re-inspected after its latest successful mutation.`,
      };
    }
    const recordedFingerprint = getImplementationFileFingerprint(current, path);
    const requestedFingerprint = normalizeFileFingerprint(
      toolCall?.args?.expectedFileFingerprint,
    );

    if (
      toolName === "replace_text" &&
      (!recordedFingerprint || requestedFingerprint !== recordedFingerprint)
    ) {
      return {
        decision:
          IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_INSPECTION_FINGERPRINT_MISMATCH,
        ok: false,
        path,
        toolName,
        allowedNextActions: [IMPLEMENTATION_JOB_ACTION.STOP],
        error:
          "KForge blocked replace_text because its expected fingerprint does not match the successful target-file inspection evidence.",
      };
    }

    if (
      toolName === "write_file" &&
      recordedFingerprint &&
      requestedFingerprint !== recordedFingerprint
    ) {
      return {
        decision:
          IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_INSPECTION_FINGERPRINT_MISMATCH,
        ok: false,
        path,
        toolName,
        allowedNextActions: [
          IMPLEMENTATION_JOB_ACTION.INSPECT_SPECIFIC_FILE,
          IMPLEMENTATION_JOB_ACTION.STOP,
        ],
        error:
          "KForge blocked write_file because an existing inspected target requires its exact recorded fingerprint.",
      };
    }
  }
  if (
    requireInspectionBeforeWrite &&
    isImplementationWriteTool(toolName) &&
    path &&
    current.inspectedPaths.length === 0
  ) {
    return {
      decision:
        IMPLEMENTATION_JOB_TOOL_DECISION.BLOCK_UNSAFE_WRITE_WITHOUT_INSPECTION,
      ok: false,
      path,
      toolName,
      allowedNextActions: [
        IMPLEMENTATION_JOB_ACTION.INSPECT_LIKELY_FILE,
        IMPLEMENTATION_JOB_ACTION.STOP,
      ],
      error:
        "KForge blocked a write request before any relevant file was inspected for this implementation job.",
    };
  }

  return {
    decision: IMPLEMENTATION_JOB_TOOL_DECISION.ALLOW,
    ok: true,
    path,
    toolName,
    refreshInspection:
      canRefreshActiveTarget || canPerformRequiredFreshInspection,
    allowedNextActions: [],
    error: "",
  };
}

export function evaluateAndRememberImplementationToolRequest(
  job,
  toolCall = {},
  options = {},
) {
  const current = createImplementationJob(job);
  const decision = evaluateImplementationToolRequest(
    current,
    toolCall,
    options,
  );

  return {
    job: decision.ok
      ? current
      : rememberImplementationToolFailure(
          current,
          toolCall,
          decision.error,
        ),
    decision,
  };
}

function buildSupabaseContractPromptSection(contract = []) {
  if (!Array.isArray(contract) || contract.length === 0) return "";

  const tableSections = contract.map((table) => {
    const columns = Array.isArray(table?.columns) ? table.columns : [];
    const declaredColumns = columns
      .map((column) => String(column?.name || "").trim())
      .filter(Boolean);
    const requiredMutationColumns = columns
      .filter((column) => column?.nullable === false)
      .map((column) => String(column?.name || "").trim())
      .filter(Boolean);
    const jsonPayloadColumns = columns
      .filter(
        (column) =>
          String(column?.dataType || "").trim().toLowerCase() === "jsonb",
      )
      .map((column) => String(column?.name || "").trim())
      .filter(Boolean);
    const primaryKeys = Array.isArray(table?.primaryKeys)
      ? table.primaryKeys.map((column) => String(column || "").trim()).filter(Boolean)
      : [];

    return (
      `Table ${String(table?.table || "").trim()}:\n` +
      `- Declared columns: ${declaredColumns.join(", ") || "none"}.\n` +
      `- Every insert/upsert object must explicitly supply these NOT NULL fields: ${requiredMutationColumns.join(", ") || "none"}. Do not assume undeclared database defaults.\n` +
      `- User ownership field: ${String(table?.ownerColumn || "").trim() || "none"}.\n` +
      `- Structured JSON payload field(s): ${jsonPayloadColumns.join(", ") || "none"}.\n` +
      `- Primary key field(s): ${primaryKeys.join(", ") || "none"}.\n` +
      "- Updates may write only declared columns. Upsert conflict targets must be an approved primary key or declared unique column."
    );
  });

  return (
    "Authoritative Supabase mutation rules:\n" +
    tableSections.join("\n") +
    "\n\n"
  );
}

function buildReusableCapabilityPromptSection(evidence = []) {
  if (!Array.isArray(evidence) || evidence.length === 0) return "";

  const capabilityLines = evidence.map((item) => {
    const exports = Array.isArray(item.exportedSymbols)
      ? item.exportedSymbols
      : [];

    return (
      `- ${item.path}: ${item.capabilities.join(", ")}` +
      (exports.length
        ? `\n  Available inspected helper exports: ${exports.join(", ")}`
        : "")
    );
  });

  const helperContractLines = evidence.flatMap((item) =>
    (Array.isArray(item.helperContracts) ? item.helperContracts : []).map(
      (contract) => {
        const resultDescription =
          contract.nullable === true
            ? `a nullable ${contract.resultKind}`
            : contract.resultKind === "auth-response"
              ? `an ${contract.resultKind}`
              : `a ${contract.resultKind}`;

        let line =
          `- ${contract.exportName} returns ${resultDescription}`;

        if (contract.payloadPath) {
          line += `; application payload path: ${contract.payloadPath}`;
        }

        if (contract.userPath) {
          line += `; user path: ${contract.userPath}`;
        }

        if (contract.sessionPath) {
          line += `; session path: ${contract.sessionPath}`;
        }

        if (contract.authenticatedStateRequiresSession === true) {
          line += "; authenticated state requires an active session";
        }

        if (contract.errorMode) {
          line += `; errors: ${contract.errorMode}`;
        }

        return line;
      },
    ),
  );

  const helperContractSection = helperContractLines.length
    ? "\nAuthoritative inspected helper contracts:\n" +
      helperContractLines.join("\n") +
      "\n"
    : "";

  const allHelperContracts = evidence.flatMap((item) =>
    Array.isArray(item.helperContracts) ? item.helperContracts : [],
  );

  const hasThrowingProgressLoad = allHelperContracts.some(
    (contract) =>
      contract.role === "progress-load" &&
      contract.errorMode === "throws",
  );

  const hasProgressSave = allHelperContracts.some(
    (contract) => contract.role === "progress-save",
  );

  const progressHydrationInvariantSection =
    hasThrowingProgressLoad && hasProgressSave
      ? "\nProgress hydration and persistence invariant:\n" +
        "- A failed progress load must not enable persistence or autosave readiness.\n" +
        "- A successfully resolved nullable no-row result may initialize defaults before persistence becomes ready.\n"
      : "";

  return (
    "Existing reusable Supabase capability evidence:\n" +
    capabilityLines.join("\n") +
    helperContractSection +
    progressHydrationInvariantSection +
    "\nInspect any still-unread evidence path above before implementing the matching responsibility. Reuse its existing exported helpers and boundaries; do not duplicate them with direct Supabase calls or new helper modules unless inspected evidence proves they cannot satisfy the approved operation.\n\n"
  );
}
export function buildImplementationJobBlockedWriteRecoveryPrompt(
  job,
  fallbackGoal = "",
  options = {},
) {
  const current = createImplementationJob(job);
  const originalGoal = current.originalGoal || String(fallbackGoal || "").trim();
  const targetPath = normalizeImplementationPath(
    options.targetPath ||
      current.blockedWrites[current.blockedWrites.length - 1] ||
      "",
  );
  const blockedReason = String(options.blockedReason || "").trim();
  const blockedReasonSection = blockedReason
    ? `Blocked write reason:\n${blockedReason}\n\n`
    : "";
  const focusedPrompt = buildImplementationJobFocusedPrompt(
    current,
    originalGoal,
  );

  return (
    "Recover from the blocked file write.\n\n" +
    `Original request: ${originalGoal}\n\n` +
    `Blocked write target: ${targetPath || "the inspected target file"}\n\n` +
    blockedReasonSection +
    "The target file has now been inspected. Do not repeat broad inspection.\n" +
    "Prefer exactly one replace_text tool call for a small change when an exact unique anchor and the recorded target fingerprint are available. Otherwise request exactly one write_file tool call for the blocked target.\n" +
    "replace_text must use the recorded target fingerprint plus exact oldText/newText; write_file content must be the complete full current file text and must include expectedFileFingerprint when overwriting an existing inspected file.\n" +
    "Do not return a fragment, placeholder, abbreviated content, comment-only content, or only the newly added JSX/button.\n" +
    "Preserve the existing app structure, state, handlers, imports, styling hooks, copy, and all unrelated behavior.\n" +
    "Correct the specific blocked reason rather than retrying the same unsafe implementation shape.\n\n" +
    focusedPrompt
  );
}

export function buildImplementationJobInspectionPrompt(
  job,
  fallbackGoal = "",
  options = {},
) {
  const current = createImplementationJob(job);
  const originalGoal = current.originalGoal || String(fallbackGoal || "").trim();
  const isFix = options.isFix === true;

  return (
    (isFix ? "Inspect before fixing.\n\n" : "Inspect before editing.\n\n") +
    `Original request: ${originalGoal}\n\n` +
    "The previous model response tried to request write_file before inspection evidence was available.\n" +
    "Do not request write_file yet. Request exactly one inspection tool call next: read_file, list_dir, or search_in_file.\n" +
    (isFix
      ? "After the inspection result is available, continue with the smallest safe fix only if needed."
      : "After the inspection result is available, continue with the smallest safe edit only if needed.")
  );
}

export function buildImplementationJobFocusedPrompt(job, fallbackGoal = "") {
  const current = createImplementationJob(job);
  const originalGoal =
    current.originalGoal || String(fallbackGoal || "").trim();
  const inspectedPaths = current.inspectedPaths.length
    ? current.inspectedPaths.join(", ")
    : "none yet";
  const inspectedFingerprintSection = current.inspectedFileFingerprints.length
    ? "Inspected file fingerprints for controlled replace_text:\n" +
      current.inspectedFileFingerprints
        .map((item) => `- ${item.path}: ${item.fingerprint}`)
        .join("\n") +
      "\n\n"
    : "";
  const continuationContextSection = current.continuationContext
    ? `Implementation constraints that remain authoritative:\n${current.continuationContext}\n\n`
    : "";
  const supabaseContractSection = buildSupabaseContractPromptSection(
    current.supabaseAppWiringContract,
  );
  const reusableCapabilitySection = buildReusableCapabilityPromptSection(
    current.reusableCapabilities,
  );

  const hasApprovedWritePaths =
    Array.isArray(current.allowedWritePaths) &&
    current.allowedWritePaths.length > 0;

  const pendingOperations = getPendingImplementationOperations(current);
  const completedOperations = current.plannedOperations.filter((operation) =>
    current.completedOperationIds.includes(operation.id),
  );
  const operationLines = current.plannedOperations
    .map(
      (operation) =>
        `- ${operation.id} [${operation.status}] ${operation.path}\n` +
        operation.responsibilities
          .map(
            (responsibility) =>
              `  - ${responsibility.id}: ${responsibility.purpose}`,
          )
          .join("\n"),
    )
    .join("\n");
  const mutationLines = current.successfulMutations.length
    ? current.successfulMutations
        .map(
          (mutation) =>
            `- #${mutation.sequence} ${mutation.toolName} ${mutation.path} (${mutation.callId})`,
        )
        .join("\n")
    : "- none";
  const pendingApprovedWrites = Array.from(
    new Set(pendingOperations.map((operation) => operation.path)),
  );

  const approvedWriteSection = hasApprovedWritePaths
    ? `Approved application write paths: ${current.allowedWritePaths.join(", ")}\n` +
      `Planned implementation operations:\n${operationLines || "- none"}\n` +
      `Completed operation IDs: ${
        completedOperations.length
          ? completedOperations.map((operation) => operation.id).join(", ")
          : "none"
      }\n` +
      `Pending operation paths: ${
        pendingApprovedWrites.length
          ? pendingApprovedWrites.join(", ")
          : "none"
      }\n` +
      `Correlated successful mutations:\n${mutationLines}\n\n` +
      "Supporting inspected files are evidence only and are not write targets unless they are listed as pending approved writes.\n" +
      "A successful file mutation is progress only; it does not complete an operation or the original objective.\n" +
      "Any write_file request must target an approved path with a pending operation and include the recorded expectedFileFingerprint when overwriting an existing inspected file.\n" +
      "Any replace_text request must target an approved path with a pending operation and use that target's latest recorded inspected fingerprint.\n" +
      "One bounded read_file refresh of an active pending target is allowed after successful inspections of other files when its exact source is no longer available. Immediate repeated reads and more than one target refresh in the same mutation epoch remain blocked.\n" +
      "After any successful mutation, read_file the changed target again before another replace_text or an operation-completion claim.\n" +
      `Only after every responsibility is implemented and the latest mutation has been re-inspected may you request ${IMPLEMENTATION_OPERATION_COMPLETION_TOOL} with exactly operationId and satisfiedResponsibilityIds.\n\n`
    : "";

  return (
    "Continue the active KForge implementation job.\n\n" +
    `Original request: ${originalGoal}\n\n` +
    continuationContextSection +
    supabaseContractSection +
    reusableCapabilitySection +
    approvedWriteSection +
    `Already inspected paths: ${inspectedPaths}\n\n` +
    inspectedFingerprintSection +
    "For an already-established target file, preserve its current UI, structure, state, handlers, imports, styling hooks, copy, and unrelated behavior. Do not simplify, reimagine, or replace the application with a smaller app. write_file content must be the complete current file with only the smallest approved integration applied.\n\n" +
    "For a small anchored change to an inspected approved file, prefer replace_text with exactly path, expectedFileFingerprint, oldText, and newText. oldText must be a non-empty unique exact match. Do not use regex, offsets, ranges, fuzzy matching, or patch syntax. Do not reproduce the whole file in newText.\n\n" +
    "Do not repeat broad inspection. Request exactly one valid fenced ```tool``` block next.\n" +
    (hasApprovedWritePaths
      ? "If the inspected evidence is enough, request one replace_text tool for a small exact anchored edit or one write_file tool for a necessary complete replacement, targeting a path with a pending operation.\n" +
        "If a mutation just succeeded, request one fresh read_file of that changed target before the next targeted edit or completion claim. Otherwise inspect one different clearly relevant text evidence file.\n"
      : "If the inspected evidence is enough, request one write_file tool for the smallest safe change.\n" +
        "If more evidence is genuinely needed, request one read_file for one different clearly relevant text file.\n") +
    "If no safe code edit is justified, explain the job-specific reason and stop."
  );
}

export function buildImplementationJobReadProgressionPrompt(
  job,
  fallbackGoal = "",
) {
  const current = createImplementationJob(job);

  return (
    "KForge controller continuation: the last read-only evidence request succeeded, and the approved implementation job still has pending writes. Do not treat the successful read as completion and do not ask the user to continue harmless inspection manually.\n\n" +
    buildImplementationJobFocusedPrompt(current, fallbackGoal)
  );
}
