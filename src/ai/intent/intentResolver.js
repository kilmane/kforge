import { getIntentRegistry } from "./intentRegistry.js";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordMatches(text, keyword) {
  const normalizedText = normalizeText(text);
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedText || !normalizedKeyword) {
    return false;
  }

  const pattern = new RegExp(
    `(^|\\b)${escapeRegExp(normalizedKeyword)}(\\b|$)`,
    "i",
  );
  return pattern.test(normalizedText);
}

export function resolveIntent(input) {
  const text = normalizeText(input);
  if (!text) {
    return null;
  }

  const registry = getIntentRegistry();

  for (const entry of registry) {
    const keywords = Array.isArray(entry?.keywords) ? entry.keywords : [];

    const matchedKeyword = keywords.find((keyword) =>
      keywordMatches(text, keyword),
    );
    if (!matchedKeyword) {
      continue;
    }

    return {
      intentId: entry.id,
      capability: entry.capability,
      providerId: entry.providerId,
      taskId: entry.taskId,
      matchedKeyword,
      recommendationTitle: entry.recommendationTitle,
      nextStep: entry.nextStep,
      reason: entry.reason,
      sourceText: String(input || "").trim(),
    };
  }

  return null;
}
