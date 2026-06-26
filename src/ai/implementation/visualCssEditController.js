export const VISUAL_CSS_TARGET_PATH = "src/App.css";

export const VISUAL_MARKUP_CANDIDATE_PATHS = Object.freeze([
  "src/App.jsx",
  "src/App.js",
  "src/main.jsx",
  "src/main.js",
]);

export function extractVisualCssReplacementPayload(value) {
  const text = String(value || "").trim();
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = String(fencedMatch?.[1] || text).trim();

  try {
    const parsed = JSON.parse(jsonText);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function normalizeVisualCssReplacementItems(replacementPayload) {
  const rawReplacementItems = Array.isArray(replacementPayload?.replacements)
    ? replacementPayload.replacements
    : replacementPayload && typeof replacementPayload === "object"
      ? [replacementPayload]
      : [];

  return rawReplacementItems.map((item) => ({
    findText: String(item?.find || ""),
    replaceText: String(item?.replace || ""),
  }));
}

export function applyVisualCssReplacementItems(
  currentCssContent = "",
  replacementItems = [],
) {
  const normalizedItems = Array.isArray(replacementItems)
    ? replacementItems
    : [];

  if (
    normalizedItems.length === 0 ||
    normalizedItems.length > 3 ||
    normalizedItems.some((item) => !item.findText || !item.replaceText)
  ) {
    return {
      ok: false,
      reason: "invalid_items",
      nextCssContent: String(currentCssContent || ""),
      missingFindText: "",
    };
  }

  let nextCssContent = String(currentCssContent || "");

  for (const item of normalizedItems) {
    if (!nextCssContent.includes(item.findText)) {
      return {
        ok: false,
        reason: "missing_find",
        nextCssContent,
        missingFindText: item.findText,
      };
    }

    nextCssContent = nextCssContent.replace(item.findText, item.replaceText);
  }

  return {
    ok: true,
    reason: "",
    nextCssContent,
    missingFindText: "",
  };
}
