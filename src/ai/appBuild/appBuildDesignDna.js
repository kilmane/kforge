export function inferAppBuildDesignDna(originalGoal = "") {
  return {
    originalGoal: String(originalGoal || "").trim(),
    dimensions: [
      "primary surface",
      "data density",
      "interaction style",
      "navigation style",
      "card style",
      "header structure",
      "visual mood",
      "theme mode",
      "accent palette",
      "typography feel",
      "density",
      "background treatment",
      "layout composition",
      "device feel",
    ],
  };
}

export function buildAppBuildDesignDnaPrompt(originalGoal = "") {
  const dna = inferAppBuildDesignDna(originalGoal);
  const goalLine = dna.originalGoal
    ? `\nOriginal request to infer from: ${dna.originalGoal}\n`
    : "\n";

  return (
    "Design DNA inference:\n" +
    "- Infer a compact Design DNA from the original app request before writing source or CSS.\n" +
    "- Use universal design dimensions, not fixed app-type profiles, hardcoded category routes, or generated templates.\n" +
    "- Decide the app's primary surface, layout composition, interaction style, navigation style, data density, visual mood, theme mode, accent palette direction, typography feel, card style, header structure, background treatment, and device feel.\n" +
    "- Let the inferred DNA change the layout shape and visual system so unrelated app requests do not all become the same glass dashboard.\n" +
    "- Keep the DNA implicit in the implementation; do not output a separate design report unless asked.\n" +
    "- Use this as design direction only. The app must still be built from the inspected project evidence and the user's request." +
    goalLine
  );
}
