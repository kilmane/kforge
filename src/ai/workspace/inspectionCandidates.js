function hasWorkspaceTree(tree, projectPath) {
  return !!projectPath && Array.isArray(tree) && tree.length > 0;
}

export function buildInspectionCandidateRoutingContextBlock(tree, projectPath) {
  if (!hasWorkspaceTree(tree, projectPath)) return "";

  return [
    "=== Inspection Candidate Routing (read-only guidance; no file contents read) ===",
    "Use the workspace awareness blocks above to choose the next inspection target before editing.",
    "",
    "Routing order for implementation requests:",
    "- Start with Code Scout prompt-matched files when present.",
    "- If prompt-matched files are not present, inspect stack-relevant existing entry/config files from Project Stack Signals and Repo Explore Summary.",
    "- Prefer existing app, entry, component, route, config, or service files over inventing new paths.",
    "- For ambiguous project edits, inspect a likely existing file or folder first instead of writing immediately.",
    "- Treat these as likely inspection candidates only. Path/name matches are not file contents.",
    "",
    "Stack-informed inspection hints:",
    "- React/Vite-style projects: likely first inspections include src/App.*, src/main.*, index.html, package/config files.",
    "- Next.js-style projects: likely first inspections include app/page.*, app/layout.*, pages/index.*, next/package config files.",
    "- Tauri projects: inspect frontend files first unless the request mentions desktop, native, Rust, commands, windows, or shell behavior.",
    "- Service/API requests: inspect package/config/env/client/service files before assuming dependencies or integration shape.",
    "",
    "Do not edit before inspecting likely existing files unless the exact target file is already known from prior tool results in this conversation.",
    "=== End Inspection Candidate Routing ===",
    "",
  ].join("\n");
}
