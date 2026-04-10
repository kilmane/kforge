// src/ai/capabilities/kforgeTerminalWorkflows.js

export function listKforgeTerminalWorkflows() {
  return [
    {
      name: "Terminal",
      status: "available",
      route: "AI Panel → Terminal",
      summary:
        "Run commands inside KForge in the workspace root using the built-in terminal. Use Terminal guidance when the user wants to execute a real shell command in the current project.",
      prerequisites: ["A project folder should be open."],
      preferred_ai_behavior: [
        "Prefer the KForge Terminal when the user wants to run normal project commands inside the current workspace.",
        "Recommend the Terminal for real shell-command execution in the current project.",
        "Do not imply that chat can open or control the Terminal UI automatically.",
        "If the user explicitly asks to bypass KForge Terminal or asks for manual command guidance, provide the command as manual shell instructions instead of handing off to Terminal.",
        "Keep Terminal guidance truthful and workflow-oriented rather than teaching brittle framework-specific command recipes.",
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
        "Do not describe Terminal as something chat can operate automatically.",
      ],
      env_vars: [],
      supported_templates: [],
      manual_fallback: [
        "If the user explicitly wants to bypass KForge Terminal, provide manual shell guidance in chat.",
        "When giving manual shell guidance, prefer known project facts over generic guesses.",
      ],
    },
  ];
}
