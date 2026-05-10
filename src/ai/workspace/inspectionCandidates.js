function hasWorkspaceTree(tree, projectPath) {
  return !!projectPath && Array.isArray(tree) && tree.length > 0;
}

export function buildInspectionCandidateRoutingContextBlock(tree, projectPath) {
  if (!hasWorkspaceTree(tree, projectPath)) return "";

  return [
    "=== Inspection Candidate Routing (read-only guidance; path/name hints only) ===",
    "For implementation-oriented project edits, use the workspace awareness blocks above to choose one likely inspection target before editing.",
    "This block does not override the latest user request or KForge workflow state.",
    "",
    "Next inspection candidate priority:",
    "1. Code Scout prompt-matched existing files, when present.",
    "2. Code Scout prompt-matched existing folders, when a directory listing is needed.",
    "3. Stack-relevant existing entry/config files from Project Stack Signals and Repo Explore Summary.",
    "4. Existing app, entry, component, route, config, or service files visible in the raw workspace tree.",
    "",
    "Inspection behavior:",
    "- Prefer read_file for a likely existing file and list_dir for a likely existing folder.",
    "- Prefer existing files over inventing new paths.",
    "- For ambiguous project edits, inspect first instead of writing immediately.",
    "- Treat all candidates as likely only. Path/name matches are not file contents.",
    "- Do not read extra files once enough information exists to continue the requested task.",
    "",
    "Stack-informed hints:",
    "- React/Vite-style projects: likely first inspections include src/App.*, src/main.*, index.html, package.json, and vite/config files.",
    "- Next.js-style projects: likely first inspections include app/page.*, app/layout.*, pages/index.*, package.json, and next/config files.",
    "- Tauri projects: inspect frontend files first unless the request mentions desktop, native, Rust, commands, windows, or shell behavior.",
    "- Service/API requests: inspect package/config/client/service files before assuming dependencies or integration shape.",
    "",
    "Do not edit before inspecting likely existing files unless the exact target file is already known from prior tool results in this conversation.",
    "=== End Inspection Candidate Routing ===",
    "",
  ].join("\n");
}
