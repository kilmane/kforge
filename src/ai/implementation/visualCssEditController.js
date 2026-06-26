export const VISUAL_CSS_TARGET_PATH = "src/App.css";

export const VISUAL_MARKUP_CANDIDATE_PATHS = Object.freeze([
  "src/App.jsx",
  "src/App.js",
  "src/main.jsx",
  "src/main.js",
]);

export function buildVisualCssEditPrompt({
  visualCssGoal = "",
  visualCssTargetPath = VISUAL_CSS_TARGET_PATH,
  visualMarkupPath = "",
  visualMarkupContent = "",
  currentCssContent = "",
} = {}) {
  const visualCssEvidenceForPrompt = String(currentCssContent || "").slice(0, 20000);
  const visualMarkupEvidenceForPrompt = String(visualMarkupContent || "").slice(0, 12000);

  return (
    "KForge controlled visual style edit.\n\n" +
    `Original user request:\n${String(visualCssGoal || "").trim()}\n\n` +
    `Inspected target CSS file: ${visualCssTargetPath}\n\n` +
    `Markup evidence file: ${visualMarkupPath || "not available"}\n\n` +
    (visualMarkupEvidenceForPrompt
      ? "Current inspected app markup/component content:\n```jsx\n" +
        visualMarkupEvidenceForPrompt +
        "\n```\n\n"
      : "No app markup/component evidence was available. Use the CSS evidence only and make the smallest safe visual edit.\n\n") +
    "Current inspected CSS content:\n```css\n" +
    visualCssEvidenceForPrompt +
    "\n```\n\n" +
    "Return exactly one fenced ```json``` block and nothing else.\n\n" +
    "Required JSON shape:\n" +
    JSON.stringify(
      {
        replacements: [
          {
            find: "<exact existing CSS snippet from src/App.css>",
            replace: "<replacement snippet with only the smallest visual/readability improvement>",
          },
        ],
      },
      null,
      2,
    ) +
    "\n\n" +
    "Rules:\n" +
    "- Do not return write_file.\n" +
    "- Do not return the full CSS file.\n" +
    "- Return a replacements array with 1 to 3 items only.\n" +
    "- Each find value must be an exact existing snippet copied from the inspected CSS.\n" +
    "- Each replace value must preserve the same selector/block structure unless a tiny style-only adjustment needs one extra CSS property.\n" +
    "- Use one replacement item when one CSS block is enough.\n" +
    "- Use two or three replacement items only when the requested change needs separate CSS blocks, such as a title selector plus its nearest wrapper/container selector.\n" +
    "- Use the markup evidence to identify the selector/class actually attached to the visible element the user described.\n" +
    "- The user may describe the target in plain language, such as main title, secondary title, heading, button, card, or background; do not require the user to know CSS selectors or file names.\n" +
    "- If the user says main title/title/heading, prefer the visible h1/heading element and its className from the markup evidence. If no class is available, use the smallest safe existing CSS selector that affects that heading.\n" +
    "- If the user requests multiple visual properties in one sentence, such as smaller + bold + colour + centred, the replacements should address each requested property when it is safe. Do not silently satisfy only one requested property.\n" +
    "- If a requested property is already satisfied, preserve it and do not make unnecessary changes for that property.\n" +
    "- If the user asks to centre a visible title/heading and the heading selector already has text-align: center, include the nearest small wrapper/container selector as one of the replacements when needed. Prefer a minimal centering adjustment such as text-align: center, justify-items: center, align-items: center, or margin-inline: auto without redesigning the page.\n" +
    "- Make only the requested visual/style change, such as colour, font weight, centering, size, contrast, or readability.\n" +
    "- Preserve the current theme, layout, spacing, copy, cards, buttons, and app identity unless the user explicitly asks to change them.\n" +
    "- Do not redesign the app.\n"
  );
}

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
