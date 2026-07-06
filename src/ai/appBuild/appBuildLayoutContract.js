export function buildAppBuildLayoutContract(originalGoal = "") {
  const goal = String(originalGoal || "").trim();

  return (
    "layout contract:\n" +
    "- Infer the app's primary workflow surface from the original request and inspected project evidence; do not use a fixed app-type template.\n" +
    "- Do not default to the same generic hero + stat cards + form + list dashboard pattern unless that structure genuinely fits the requested workflow.\n" +
    "- Make the first screen a usable app surface: the main workflow, key controls, visible state, and requested summaries should be visible or clearly reachable.\n" +
    "- Shape sections, labels, item actions, empty states, and summaries around the request-specific entities and workflow.\n" +
    "- Choose layout structure from the workflow needs, such as a tool cockpit, planner board, timeline, table workspace, split editor, wizard, feed, operational console, or mixed workspace; these are generic composition options, not app-type routes.\n" +
    "- Forms, stats, cards, lists, tables, timelines, calendars, charts, and navigation should support the inferred primary workflow surface rather than replacing it.\n" +
    "- Do not use unrequested named demo records. Start user-managed data empty unless the user explicitly asks for demo/sample data.\n" +
    "- App-data reset must clear user-managed data and derived metrics to empty/neutral values; it must not restore seed records." +
    (goal ? `\n- Original request to infer from: ${goal}` : "")
  );
}
