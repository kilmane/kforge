const SUPPORTED_SCRIPT_RE = /\.(?:js|jsx|ts|tsx|mjs|cjs)$/i;
const MIN_EXISTING_CHARS = 800;
const MIN_NEXT_CHARS = 300;

function uniqueSorted(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ).sort();
}

function countByValue(values = []) {
  const counts = new Map();

  for (const value of values) {
    const key = String(value || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

function countRetainedValues(existingValues = [], nextValues = []) {
  const existingCounts = countByValue(existingValues);
  const nextCounts = countByValue(nextValues);
  let retained = 0;

  for (const [key, count] of existingCounts.entries()) {
    retained += Math.min(count, nextCounts.get(key) || 0);
  }

  return retained;
}

function countRetainedQuantity(existingValues = [], nextValues = []) {
  return Math.min(existingValues.length, nextValues.length);
}

function collectUseStateSetterNames(content = "") {
  const source = String(content || "");
  const setters = [];
  const tupleRe =
    /\bconst\s*\[\s*[$A-Z_a-z][$\w]*\s*,\s*([$A-Z_a-z][$\w]*)\s*\]\s*=\s*useState\b/g;
  let match;

  while ((match = tupleRe.exec(source)) !== null) {
    setters.push(match[1]);
  }

  return uniqueSorted(setters);
}

function collectLowercaseNamedFunctions(content = "") {
  const source = String(content || "");
  const names = [];
  const declarationRe = /\bfunction\s+([a-z][$\w]*)\s*\(/g;
  const arrowRe =
    /\b(?:const|let|var)\s+([a-z][$\w]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[$A-Z_a-z][$\w]*)\s*=>/g;
  let match;

  while ((match = declarationRe.exec(source)) !== null) {
    names.push(match[1]);
  }

  while ((match = arrowRe.exec(source)) !== null) {
    names.push(match[1]);
  }

  return uniqueSorted(names);
}

function collectJsxEventBindings(content = "") {
  const source = String(content || "");
  const bindings = [];
  const eventRe =
    /\b(on[A-Z][A-Za-z0-9_$]*)\s*=\s*(?:"([^"]+)"|'([^']+)'|\{\s*([^}\r\n]+?)\s*\})/g;
  let match;

  while ((match = eventRe.exec(source)) !== null) {
    const eventName = String(match[1] || "").trim();

    if (!eventName) continue;
    bindings.push(eventName);
  }

  return bindings.sort();
}

function collectFormControls(content = "") {
  const source = String(content || "");
  const controls = [];
  const tagRe = /<(input|textarea|select)\b([^>]*)>/gi;
  let match;

  while ((match = tagRe.exec(source)) !== null) {
    const tag = String(match[1] || "").toLowerCase();
    const attrs = String(match[2] || "");
    const typeMatch = attrs.match(/\btype\s*=\s*(?:"([^"]+)"|'([^']+)'|\{?\s*([A-Za-z0-9_$.-]+)\s*\}?)/i);
    const type = String(typeMatch?.[1] || typeMatch?.[2] || typeMatch?.[3] || "").trim();

    controls.push([tag, type || "default"].join(":"));
  }

  return controls.sort();
}

function collectClassTokensFromText(text = "") {
  return String(text || "")
    .replace(/\$\{[\s\S]*?\}/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => /^[A-Za-z_-][A-Za-z0-9_-]*$/.test(token));
}

function collectClassNameTokens(content = "") {
  const source = String(content || "");
  const tokens = [];
  const directRe = /\bclassName\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
  const expressionRe = /\bclassName\s*=\s*\{([\s\S]*?)\}/g;
  let match;

  while ((match = directRe.exec(source)) !== null) {
    tokens.push(...collectClassTokensFromText(match[1] || match[2] || match[3] || ""));
  }

  while ((match = expressionRe.exec(source)) !== null) {
    const expression = String(match[1] || "");
    const stringRe = /"([^"]*)"|'([^']*)'|`([^`]*)`/g;
    let stringMatch;

    while ((stringMatch = stringRe.exec(expression)) !== null) {
      tokens.push(
        ...collectClassTokensFromText(
          stringMatch[1] || stringMatch[2] || stringMatch[3] || "",
        ),
      );
    }
  }

  return uniqueSorted(tokens);
}

export function collectInteractivePreservationSignals(content = "") {
  return {
    stateSetters: collectUseStateSetterNames(content),
    namedFunctions: collectLowercaseNamedFunctions(content),
    eventBindings: collectJsxEventBindings(content),
    formControls: collectFormControls(content),
    classNameTokens: collectClassNameTokens(content),
  };
}

function isSubstantialLoss(existingValues = [], nextValues = [], options = {}) {
  const existingCount = existingValues.length;
  const minimumExisting = options.minimumExisting || 1;
  const minimumLost = options.minimumLost || 1;
  const maximumRetainedRatio = options.maximumRetainedRatio ?? 0.65;
  const retainedCounter = options.compareByQuantity
    ? countRetainedQuantity
    : countRetainedValues;

  if (existingCount < minimumExisting) return false;

  const retained = retainedCounter(existingValues, nextValues);
  const lost = existingCount - retained;
  const retainedRatio = existingCount > 0 ? retained / existingCount : 1;

  return lost >= minimumLost && retainedRatio < maximumRetainedRatio;
}

export function shouldBlockInteractiveCapabilityLoss({
  path = "",
  existingContent = "",
  nextContent = "",
} = {}) {
  const normalizedPath = String(path || "").trim();
  const existing = String(existingContent || "");
  const next = String(nextContent || "");

  if (!SUPPORTED_SCRIPT_RE.test(normalizedPath)) return "";
  if (existing.length < MIN_EXISTING_CHARS || next.length < MIN_NEXT_CHARS) {
    return "";
  }

  const existingSignals = collectInteractivePreservationSignals(existing);
  const nextSignals = collectInteractivePreservationSignals(next);
  const lostSignalKinds = [];

  if (
    isSubstantialLoss(existingSignals.stateSetters, nextSignals.stateSetters, {
      minimumExisting: 3,
      minimumLost: 2,
      maximumRetainedRatio: 0.7,
      compareByQuantity: true,
    })
  ) {
    lostSignalKinds.push("state");
  }

  if (
    isSubstantialLoss(existingSignals.namedFunctions, nextSignals.namedFunctions, {
      minimumExisting: 3,
      minimumLost: 2,
      maximumRetainedRatio: 0.65,
      compareByQuantity: true,
    })
  ) {
    lostSignalKinds.push("handlers");
  }

  if (
    isSubstantialLoss(existingSignals.eventBindings, nextSignals.eventBindings, {
      minimumExisting: 3,
      minimumLost: 2,
      maximumRetainedRatio: 0.65,
    })
  ) {
    lostSignalKinds.push("events");
  }

  if (
    isSubstantialLoss(existingSignals.formControls, nextSignals.formControls, {
      minimumExisting: 3,
      minimumLost: 2,
      maximumRetainedRatio: 0.65,
    })
  ) {
    lostSignalKinds.push("form controls");
  }

  if (
    isSubstantialLoss(existingSignals.classNameTokens, nextSignals.classNameTokens, {
      minimumExisting: 8,
      minimumLost: 5,
      maximumRetainedRatio: 0.5,
    })
  ) {
    lostSignalKinds.push("styling hooks");
  }

  if (lostSignalKinds.length < 3) return "";

  return (
    "write_file blocked: the proposed full-file replacement appears to remove " +
    "several existing app capabilities. Preserve current interactive behaviour " +
    "and styling hooks through a smaller targeted edit."
  );
}
