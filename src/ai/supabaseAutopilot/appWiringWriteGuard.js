function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function tableAliases(table) {
  const full = normalizeName(table);
  const short = full.includes(".") ? full.split(".").pop() : full;
  return new Set([full, short].filter(Boolean));
}

function findContractTable(contract, target) {
  const cleanTarget = normalizeName(target);

  return (contract || []).find((table) =>
    tableAliases(table?.table).has(cleanTarget),
  );
}

function sameColumnSet(left, right) {
  const a = [...left].map(normalizeName).sort();
  const b = [...right].map(normalizeName).sort();

  return (
    a.length === b.length &&
    a.every((value, index) => value === b[index])
  );
}

function isUniqueConflictTarget(table, columns) {
  const cleanColumns = columns.map(normalizeName).filter(Boolean);

  if (!cleanColumns.length) return false;

  const primaryKeys = Array.isArray(table?.primaryKeys)
    ? table.primaryKeys
    : [];

  if (
    primaryKeys.length &&
    sameColumnSet(primaryKeys, cleanColumns)
  ) {
    return true;
  }

  if (cleanColumns.length !== 1) return false;

  const target = cleanColumns[0];

  return (table?.columns || []).some(
    (column) =>
      normalizeName(column?.name) === target &&
      column?.unique === true,
  );
}

function findMatchingBrace(text, startIndex) {
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

function splitTopLevelProperties(body) {
  const parts = [];
  let start = 0;
  let curly = 0;
  let square = 0;
  let round = 0;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];

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

    if (char === "{") curly += 1;
    else if (char === "}") curly -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (
      char === "," &&
      curly === 0 &&
      square === 0 &&
      round === 0
    ) {
      parts.push(body.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(body.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

function findTopLevelColon(property) {
  let curly = 0;
  let square = 0;
  let round = 0;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < property.length; index += 1) {
    const char = property[index];

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

    if (char === "{") curly += 1;
    else if (char === "}") curly -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (
      char === ":" &&
      curly === 0 &&
      square === 0 &&
      round === 0
    ) {
      return index;
    }
  }

  return -1;
}

function extractObjectKeys(text) {
  const properties = splitTopLevelProperties(
    text.slice(1, -1),
  );
  const keys = [];

  for (const property of properties) {
    if (property.startsWith("...")) return null;

    const colonIndex = findTopLevelColon(property);
    if (colonIndex < 0) return null;

    let key = property.slice(0, colonIndex).trim();

    if (
      (key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))
    ) {
      key = key.slice(1, -1);
    }

    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
      return null;
    }

    keys.push(key);
  }

  return keys;
}

function extractMutationObject(chain, methodName) {
  const methodPattern = new RegExp(`\\.${methodName}\\s*\\(`);
  const match = methodPattern.exec(chain);

  if (!match) {
    return { found: false, keys: null };
  }

  const openParen = chain.indexOf("(", match.index);
  let cursor = openParen + 1;

  while (/\s/.test(chain[cursor] || "")) cursor += 1;

  if (chain[cursor] !== "{") {
    return { found: true, keys: null };
  }

  const closingBrace = findMatchingBrace(chain, cursor);

  if (closingBrace < 0) {
    return { found: true, keys: null };
  }

  return {
    found: true,
    keys: extractObjectKeys(
      chain.slice(cursor, closingBrace + 1),
    ),
  };
}

function validateMutationFields(table, methodName, keys) {
  if (!Array.isArray(keys)) {
    return `KForge blocked this Supabase ${methodName} before approval because its payload fields could not be proven against the approved database contract.`;
  }

  const declaredColumns = new Set(
    (table?.columns || []).map((column) =>
      normalizeName(column?.name),
    ),
  );

  const undeclared = keys.filter(
    (key) => !declaredColumns.has(normalizeName(key)),
  );

  if (undeclared.length) {
    return `KForge blocked this Supabase ${methodName} before approval because it writes undeclared database field(s): ${undeclared.join(", ")}.`;
  }

  if (methodName === "update") return "";

  const supplied = new Set(keys.map(normalizeName));
  const requiredColumns = (table?.columns || [])
    .filter((column) => column?.nullable === false)
    .map((column) => normalizeName(column?.name));

  const missing = requiredColumns.filter(
    (column) => !supplied.has(column),
  );

  if (missing.length) {
    return `KForge blocked this Supabase ${methodName} before approval because the approved contract requires NOT NULL field(s) that were not supplied: ${missing.join(", ")}. No undeclared database default may be assumed.`;
  }

  return "";
}

const AUTH_UI_SESSION_RESPONSIBILITY_ID = "auth-ui-session";
const REUSABLE_HELPER_RESPONSIBILITY_ID = "reusable-helper-integration";
const REUSABLE_AUTH_DATA_CAPABILITIES = new Set([
  "auth-session",
  "data-access",
]);
const MODULE_FILE_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
];

function normalizeProjectPath(value) {
  const parts = [];

  const segments = String(value || "")
    .trim()
    .replaceAll("\\", "/")
    .split("/");
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (parts.length === 0) return "";
      parts.pop();
      continue;
    }
    parts.push(segment);
  }

  return parts.join("/");
}

function normalizeProjectPathKey(value) {
  return normalizeProjectPath(value).toLowerCase();
}

function stripModuleExtension(value) {
  const path = normalizeProjectPathKey(value);
  const extension = MODULE_FILE_EXTENSIONS.find((candidate) =>
    path.endsWith(candidate),
  );
  return extension ? path.slice(0, -extension.length) : path;
}

function resolveRelativeModulePath(targetPath, importSource) {
  const source = String(importSource || "").trim().replaceAll("\\", "/");
  if (!source.startsWith("./") && !source.startsWith("../")) return "";

  const normalizedTarget = normalizeProjectPath(targetPath);
  if (!normalizedTarget) return "";
  const targetParts = normalizedTarget.split("/");
  targetParts.pop();
  return normalizeProjectPath([...targetParts, source].join("/"));
}

function modulePathMatchesEvidence(resolvedImportPath, evidencePath) {
  const resolved = stripModuleExtension(resolvedImportPath);
  const evidence = stripModuleExtension(evidencePath);
  if (!resolved || !evidence) return false;

  return (
    resolved === evidence ||
    `${resolved}/index` === evidence ||
    resolved === `${evidence}/index`
  );
}

function operationResponsibilityIds(operation) {
  return new Set([
    ...(Array.isArray(operation?.responsibilityIds)
      ? operation.responsibilityIds
      : []),
    ...(Array.isArray(operation?.responsibilities)
      ? operation.responsibilities.map((item) => item?.id)
      : []),
  ].map((item) => String(item || "").trim()).filter(Boolean));
}

function pendingTargetHasResponsibility(
  implementationContext,
  targetPath,
  responsibilityId,
) {
  const targetKey = normalizeProjectPathKey(targetPath);
  const requiredResponsibilityId = String(responsibilityId || "").trim();

  if (
    !targetKey ||
    !requiredResponsibilityId ||
    !implementationContext ||
    typeof implementationContext !== "object"
  ) {
    return false;
  }

  const completedOperationIds = new Set(
    (Array.isArray(implementationContext.completedOperationIds)
      ? implementationContext.completedOperationIds
      : []).map((item) => String(item || "").trim()),
  );

  return (
    Array.isArray(implementationContext.plannedOperations)
      ? implementationContext.plannedOperations
      : []
  ).some(
    (operation) =>
      normalizeProjectPathKey(operation?.path) === targetKey &&
      !completedOperationIds.has(String(operation?.id || "").trim()) &&
      operationResponsibilityIds(operation).has(requiredResponsibilityId),
  );
}

function escapeIdentifierForRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function reusableEvidencePathsForPendingTarget(
  implementationContext,
  targetPath,
) {
  const targetKey = normalizeProjectPathKey(targetPath);
  if (!targetKey || !implementationContext || typeof implementationContext !== "object") {
    return [];
  }

  const completedOperationIds = new Set(
    (Array.isArray(implementationContext.completedOperationIds)
      ? implementationContext.completedOperationIds
      : []).map((item) => String(item || "").trim()),
  );
  const requiresReusableHelpers = (
    Array.isArray(implementationContext.plannedOperations)
      ? implementationContext.plannedOperations
      : []
  ).some(
    (operation) =>
      normalizeProjectPathKey(operation?.path) === targetKey &&
      !completedOperationIds.has(String(operation?.id || "").trim()) &&
      operationResponsibilityIds(operation).has(
        REUSABLE_HELPER_RESPONSIBILITY_ID,
      ),
  );
  if (!requiresReusableHelpers) return [];

  return (
    Array.isArray(implementationContext.reusableCapabilities)
      ? implementationContext.reusableCapabilities
      : []
  )
    .filter((evidence) =>
      (Array.isArray(evidence?.capabilities) ? evidence.capabilities : []).some(
        (capability) =>
          REUSABLE_AUTH_DATA_CAPABILITIES.has(
            String(capability || "").trim().toLowerCase(),
          ),
      ),
    )
    .map((evidence) => normalizeProjectPath(evidence?.path))
    .filter(Boolean);
}

function findStaticReusableBoundaryBypasses(content) {
  const bypasses = [];
  const namedImportPattern =
    /^[ \t]*import\s+(?!type\b)(?:[A-Za-z_$][A-Za-z0-9_$]*\s*,\s*)?\{([^}]*)\}\s*from\s*(['"])([^'"]+)\2/gm;

  for (const match of String(content || "").matchAll(namedImportPattern)) {
    const importedNames = match[1]
      .split(",")
      .map((item) => item.trim())
      .map(
        (item) =>
          item.match(
            /^([A-Za-z_$][A-Za-z0-9_$]*)(?:\s+as\s+[A-Za-z_$][A-Za-z0-9_$]*)?$/,
          )?.[1] || "",
      )
      .filter(Boolean);
    const source = match[3];

    if (importedNames.includes("supabase")) {
      bypasses.push({ kind: "raw_client", source });
    }
    if (
      source === "@supabase/supabase-js" &&
      importedNames.includes("createClient")
    ) {
      bypasses.push({ kind: "client_factory", source });
    }
  }

  const namespaceImportPattern =
    /^[ \t]*import\s+\*\s+as\s+[A-Za-z_$][A-Za-z0-9_$]*\s+from\s*(['"])([^'"]+)\1/gm;
  for (const match of String(content || "").matchAll(namespaceImportPattern)) {
    bypasses.push({
      kind:
        match[2] === "@supabase/supabase-js"
          ? "client_factory_namespace"
          : "namespace",
      source: match[2],
    });
  }

  return bypasses;
}

function validateReusableHelperBoundary({
  implementationContext,
  targetPath,
  content,
}) {
  const evidencePaths = reusableEvidencePathsForPendingTarget(
    implementationContext,
    targetPath,
  );
  if (evidencePaths.length === 0) return "";

  for (const bypass of findStaticReusableBoundaryBypasses(content)) {
    if (
      bypass.kind === "client_factory" ||
      bypass.kind === "client_factory_namespace"
    ) {
      return (
        "KForge blocked this application edit before approval because its pending " +
        "reusable-helper-integration responsibility requires the existing inspected " +
        "auth/data helper boundary, but the edit imports Supabase client creation " +
        "access directly from @supabase/supabase-js."
      );
    }

    const resolvedImportPath = resolveRelativeModulePath(
      targetPath,
      bypass.source,
    );
    if (
      evidencePaths.some((evidencePath) =>
        modulePathMatchesEvidence(resolvedImportPath, evidencePath),
      )
    ) {
      return (
        "KForge blocked this application edit before approval because its pending " +
        "reusable-helper-integration responsibility requires the existing auth/data " +
        (bypass.kind === "namespace"
          ? "helper boundary, but the edit imports that entire module namespace and indirectly exposes its raw client."
          : "helper boundary, but the edit imports the raw exported Supabase client from that boundary.")
      );
    }
  }

  return "";
}

function validateAuthSessionWiring({
  implementationContext,
  targetPath,
  content,
}) {
  if (
    !pendingTargetHasResponsibility(
      implementationContext,
      targetPath,
      AUTH_UI_SESSION_RESPONSIBILITY_ID,
    )
  ) {
    return "";
  }

  const source = String(content || "");

  if (
    !/\bsignUpWithEmail\s*\(/.test(source) ||
    !/\bsetUser\s*\(/.test(source)
  ) {
    return "";
  }

  const signUpResultPattern =
    /\b(?:const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:(?!\b(?:const|let)\b)[\s\S]){0,700}?\bsignUpWithEmail\s*\(/g;

  for (const resultMatch of source.matchAll(signUpResultPattern)) {
    const resultName = resultMatch[1];
    const escapedResultName = escapeIdentifierForRegExp(resultName);

    const flow = source.slice(
      resultMatch.index,
      Math.min(source.length, resultMatch.index + 2000),
    );

    const derivedUserPattern = new RegExp(
      "\\b(?:const|let)\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*=\\s*(?:" +
        escapedResultName +
        "\\?\\.user|" +
        escapedResultName +
        "\\?\\.data\\?\\.user|" +
        escapedResultName +
        "\\.user|" +
        escapedResultName +
        "\\.data\\.user)",
    );

    const derivedUserMatch = derivedUserPattern.exec(flow);
    if (!derivedUserMatch) continue;

    const userName = derivedUserMatch[1];
    const escapedUserName = escapeIdentifierForRegExp(userName);

    const afterDerivedUser = flow.slice(derivedUserMatch.index);
    const setUserPattern = new RegExp(
      "\\bsetUser\\s*\\(\\s*" + escapedUserName + "\\s*\\)",
    );

    const setUserMatch = setUserPattern.exec(afterDerivedUser);
    if (!setUserMatch) continue;

    const pathToSetUser = flow.slice(
      0,
      derivedUserMatch.index +
        setUserMatch.index +
        setUserMatch[0].length,
    );

    const activeSessionPattern = new RegExp(
      "\\b" +
        escapedResultName +
        "(?:\\?\\.|\\.)(?:session|data(?:\\?\\.|\\.)session)\\b",
    );

    const explicitSignInGatePattern = new RegExp(
      "if\\s*\\([^)]*\\bauthMode\\s*={2,3}\\s*['\"]sign-in['\"][^)]*\\)" +
        "\\s*\\{?[\\s\\S]{0,300}\\bsetUser\\s*\\(\\s*" +
        escapedUserName +
        "\\s*\\)",
    );

    if (
      !activeSessionPattern.test(pathToSetUser) &&
      !explicitSignInGatePattern.test(pathToSetUser)
    ) {
      return (
        "KForge blocked this application edit before approval because its pending " +
        "auth-ui-session responsibility treats a Supabase sign-up user as an authenticated " +
        "session without proving that an active session exists."
      );
    }
  }

  return "";
}

export function evaluateSupabaseAppWiringWrite({
  contract,
  toolName,
  args,
  materializedContent,
  implementationContext,
} = {}) {
  const normalizedToolName = String(toolName || "").trim();
  if (!["write_file", "replace_text"].includes(normalizedToolName)) {
    return { ok: true, error: "" };
  }

  const hasContract = Array.isArray(contract) && contract.length > 0;
  const targetPath = String(args?.path || "").trim();
  const reusableEvidencePaths = reusableEvidencePathsForPendingTarget(
    implementationContext,
    targetPath,
  );
  const requiresAuthSessionValidation = pendingTargetHasResponsibility(
    implementationContext,
    targetPath,
    AUTH_UI_SESSION_RESPONSIBILITY_ID,
  );
  const requiresTrustedContent =
    hasContract ||
    reusableEvidencePaths.length > 0 ||
    requiresAuthSessionValidation;

  if (
    normalizedToolName === "replace_text" &&
    requiresTrustedContent &&
    typeof materializedContent !== "string"
  ) {
    return {
      ok: false,
      error:
        "KForge blocked replace_text before approval because no trusted materialized result was available for Supabase application validation.",
    };
  }

  const content =
    normalizedToolName === "replace_text"
      ? materializedContent
      : String(args?.content || "");
  const authSessionError = validateAuthSessionWiring({
    implementationContext,
    targetPath,
    content,
  });
  if (authSessionError) {
    return { ok: false, error: authSessionError };
  }
  const reusableHelperError = validateReusableHelperBoundary({
    implementationContext,
    targetPath,
    content,
  });
  if (reusableHelperError) {
    return { ok: false, error: reusableHelperError };
  }

  if (!hasContract) return { ok: true, error: "" };

  const fromPattern =
    /\b([A-Za-z_$][\w$]*)\s*\.from\s*\(\s*(['"`])([^'"`]+)\2\s*\)/g;
  const matches = [...content.matchAll(fromPattern)];
  const nonSupabaseStaticReceivers = new Set([
    "Array",
    "Object",
    "String",
    "Number",
    "Reflect",
  ]);

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (nonSupabaseStaticReceivers.has(match[1])) continue;
    const table = findContractTable(contract, match[3]);

    if (!table) {
      return {
        ok: false,
        error:
          "KForge blocked this Supabase application write before approval because " +
          `table '${match[3]}' is not present in the approved database contract.`,
      };
    }

    const start = match.index;
    const end =
      index + 1 < matches.length
        ? matches[index + 1].index
        : content.length;
    const chain = content.slice(start, end);

    const upsert = extractMutationObject(chain, "upsert");

    if (upsert.found) {
      const conflictMatch =
        /onConflict\s*:\s*(['"`])([^'"`]+)\1/.exec(chain);

      if (conflictMatch) {
        const conflictColumns = conflictMatch[2]
          .split(",")
          .map((column) => column.trim())
          .filter(Boolean);

        if (!isUniqueConflictTarget(table, conflictColumns)) {
          return {
            ok: false,
            error:
              "KForge blocked this Supabase upsert before approval because " +
              `onConflict targets '${conflictColumns.join(",")}', which is not declared unique or as the approved primary key.`,
          };
        }
      }

      const fieldError = validateMutationFields(
        table,
        "upsert",
        upsert.keys,
      );

      if (fieldError) {
        return { ok: false, error: fieldError };
      }
    }

    for (const methodName of ["insert", "update"]) {
      const mutation = extractMutationObject(
        chain,
        methodName,
      );

      if (!mutation.found) continue;

      const fieldError = validateMutationFields(
        table,
        methodName,
        mutation.keys,
      );

      if (fieldError) {
        return { ok: false, error: fieldError };
      }
    }
  }

  return { ok: true, error: "" };
}
