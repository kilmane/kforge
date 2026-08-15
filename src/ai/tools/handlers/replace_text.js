const FILE_FINGERPRINT_RE = /^fnv1a64-[a-f0-9]{16}$/;

function fnv1a32(input, seed) {
  let hash = seed >>> 0;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

export function fingerprintFileContent(content = "") {
  const input = String(content ?? "");
  return `fnv1a64-${fnv1a32(input, 0x811c9dc5)}${fnv1a32(
    input,
    0x9e3779b9,
  )}`;
}

function countExactMatches(content, oldText) {
  let count = 0;
  let cursor = 0;

  while (cursor <= content.length - oldText.length) {
    const matchIndex = content.indexOf(oldText, cursor);
    if (matchIndex < 0) break;

    count += 1;
    if (count > 1) break;
    cursor = matchIndex + 1;
  }

  return count;
}

function normalizeNewlinesWithOriginalBoundaries(value = "") {
  const input = String(value ?? "");
  let normalized = "";
  const originalBoundaries = [0];

  for (let index = 0; index < input.length; index += 1) {
    if (input[index] === "\r") {
      const isCrLf = input[index + 1] === "\n";
      normalized += "\n";
      if (isCrLf) index += 1;
      originalBoundaries.push(index + 1);
      continue;
    }

    normalized += input[index];
    originalBoundaries.push(index + 1);
  }

  return { normalized, originalBoundaries };
}

function detectNewlineConvention(value = "") {
  const input = String(value ?? "");
  let hasCrLf = false;
  let hasLf = false;
  let hasCr = false;

  for (let index = 0; index < input.length; index += 1) {
    if (input[index] === "\r") {
      if (input[index + 1] === "\n") {
        hasCrLf = true;
        index += 1;
      } else {
        hasCr = true;
      }
    } else if (input[index] === "\n") {
      hasLf = true;
    }
  }

  const conventions = [hasCrLf, hasLf, hasCr].filter(Boolean).length;
  return {
    mixed: conventions > 1,
    newline: hasCrLf && conventions === 1
      ? "\r\n"
      : hasLf && conventions === 1
        ? "\n"
        : hasCr && conventions === 1
          ? "\r"
          : "",
  };
}

function convertNewlinesToConvention(value, newline) {
  const input = String(value ?? "");
  if (!newline) return input;
  return normalizeNewlinesWithOriginalBoundaries(input).normalized
    .split("\n")
    .join(newline);
}

export function materializeExactTextReplacement({
  currentContent = "",
  expectedFileFingerprint = "",
  oldText,
  newText,
} = {}) {
  const current = String(currentContent ?? "");
  const expectedFingerprint = String(expectedFileFingerprint || "")
    .trim()
    .toLowerCase();

  if (!FILE_FINGERPRINT_RE.test(expectedFingerprint)) {
    return {
      ok: false,
      requiresFreshInspection: true,
      error:
        "replace_text requires a valid fingerprint from the successful target-file inspection.",
    };
  }

  if (typeof oldText !== "string" || oldText.length === 0) {
    return {
      ok: false,
      error: "replace_text requires non-empty exact oldText.",
    };
  }

  if (typeof newText !== "string") {
    return {
      ok: false,
      error: "replace_text requires string newText.",
    };
  }

  if (oldText === newText) {
    return {
      ok: false,
      error: "replace_text blocked a no-op replacement.",
    };
  }

  const currentFingerprint = fingerprintFileContent(current);
  if (currentFingerprint !== expectedFingerprint) {
    return {
      ok: false,
      requiresFreshInspection: true,
      currentFingerprint,
      error:
        "replace_text blocked this edit because the file fingerprint no longer matches the inspected version.",
    };
  }

  const normalizedCurrent = normalizeNewlinesWithOriginalBoundaries(current);
  const normalizedOldText = normalizeNewlinesWithOriginalBoundaries(oldText)
    .normalized;
  const matchCount = countExactMatches(
    normalizedCurrent.normalized,
    normalizedOldText,
  );
  if (matchCount !== 1) {
    return {
      ok: false,
      requiresFreshInspection: true,
      currentFingerprint,
      matchCount,
      error:
        `replace_text requires oldText to match exactly once; found ${matchCount}.`,
    };
  }

  const normalizedMatchIndex = normalizedCurrent.normalized.indexOf(
    normalizedOldText,
  );
  const matchIndex =
    normalizedCurrent.originalBoundaries[normalizedMatchIndex];
  const matchEndIndex =
    normalizedCurrent.originalBoundaries[
      normalizedMatchIndex + normalizedOldText.length
    ];
  const newlineConvention = detectNewlineConvention(current);
  if (
    newlineConvention.mixed &&
    (newText.includes("\r") || newText.includes("\n"))
  ) {
    return {
      ok: false,
      currentFingerprint,
      matchCount,
      error:
        "replace_text blocked this edit because mixed file newline styles make the replacement newline convention ambiguous.",
    };
  }

  const materializedNewText = convertNewlinesToConvention(
    newText,
    newlineConvention.newline,
  );
  const materializedContent =
    current.slice(0, matchIndex) +
    materializedNewText +
    current.slice(matchEndIndex);

  if (materializedContent === current) {
    return {
      ok: false,
      currentFingerprint,
      matchCount,
      error: "replace_text blocked a no-op replacement.",
    };
  }

  return {
    ok: true,
    currentFingerprint,
    matchCount,
    matchIndex,
    materializedContent,
  };
}

function indentReviewText(value) {
  return String(value ?? "")
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

export function buildReplaceTextApprovalPrompt({
  path = "",
  currentFingerprint = "",
  oldText = "",
  newText = "",
  materializedContent = "",
} = {}) {
  const nextBytes = new TextEncoder().encode(
    String(materializedContent ?? ""),
  ).length;

  return (
    "Approve controlled targeted file edit?\n\n" +
    `Path: ${String(path || "").trim()}\n` +
    `Inspected fingerprint: ${String(currentFingerprint || "").trim()}\n` +
    `Materialized result size: ${nextBytes} bytes\n\n` +
    "The exact materialized targeted edit is:\n\n" +
    "--- Exact current text\n" +
    indentReviewText(oldText) +
    "\n+++ Exact replacement text\n" +
    indentReviewText(newText) +
    "\n\nKForge will revalidate the file fingerprint and unique anchor immediately before saving."
  );
}
