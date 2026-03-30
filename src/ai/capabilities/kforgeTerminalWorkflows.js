// src/ai/capabilities/kforgeTerminalWorkflows.js

export function listKforgeTerminalWorkflows() {
  return [
    {
      name: "Terminal",
      status: "available",
      route: "AI Panel → Terminal",
      summary:
        "Run commands inside KForge in the workspace root using the built-in terminal.",
      prerequisites: ["A project folder should be open."],
      preferred_ai_behavior: [
        "Prefer the KForge Terminal when the user wants to run commands inside the project.",
        "Recommend the Terminal for npm commands, package installs, git commands, builds, dev servers, and diagnostics.",
        "Keep the guidance advisory only. Do not imply that chat can open or control the Terminal UI automatically.",
      ],
      first_response_template: [
        "Use KForge Terminal: AI Panel → Terminal.",
        "Commands run in the workspace root.",
      ],
      kforge_paths: {
        primary: "AI Panel → Terminal",
        beginner:
          "Open the AI Panel, expand Terminal, then run the command there.",
        step_by_step: "AI Panel → Terminal → enter command → Run",
      },
      service_notes: [
        "Use Terminal guidance when the user wants to execute a real shell command in the current project.",
      ],
      env_vars: [],
      supported_templates: [],
      manual_fallback: [
        "If the user explicitly wants to bypass KForge Terminal, provide the command as manual shell instructions.",
      ],
    },
  ];
}
