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

export function evaluateSupabaseAppWiringWrite({
  contract,
  toolName,
  args,
} = {}) {
  if (
    String(toolName || "").trim() !== "write_file" ||
    !Array.isArray(contract) ||
    contract.length === 0
  ) {
    return { ok: true, error: "" };
  }

  const content = String(args?.content || "");
  const fromPattern =
    /\.from\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
  const matches = [...content.matchAll(fromPattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const table = findContractTable(contract, match[2]);

    if (!table) continue;

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
