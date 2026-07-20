export function isVisualUiProjectEditIntent(text = "") {
  const value = String(text || "").toLowerCase().trim();
  if (!value) return false;

  const hasEditAction =
    /\b(make|improve|update|change|modify|add|show|display|style|restyle|redesign|polish|enhance|adjust|tweak|highlight|keep)\b/.test(
      value,
    );

  const hasUiTarget =
    /\b(app|page|screen|view|ui|ux|interface|frontend|component|section|stage|journey|button|card|panel|form|dashboard|layout)\b/.test(
      value,
    );

  const hasVisualRequirement =
    /\b(visual|appearance|look|looks|style|styling|styled|restyle|redesign|polish|colour|color|palette|theme|layout|responsive|mobile|phone|tablet|spacing|alignment|highlight|grid|column|columns|timeline)\b/.test(
      value,
    );

  return hasEditAction && hasUiTarget && hasVisualRequirement;
}