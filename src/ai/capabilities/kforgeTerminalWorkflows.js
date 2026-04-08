// src/ai/capabilities/kforgeTerminalWorkflows.js

export function listKforgeTerminalWorkflows() {
  return [
    {
      name: "Terminal",
      status: "available",
      route: "AI Panel → Terminal",
      summary:
        "Run commands inside KForge in the workspace root using the built-in terminal. For normal project commands, KForge Terminal is the preferred path. Expo React Native phone preview is the main exception and should currently prefer a system terminal outside KForge.",
      prerequisites: ["A project folder should be open."],
      preferred_ai_behavior: [
        "Prefer the KForge Terminal when the user wants to run normal project commands inside the current workspace.",
        "Recommend the Terminal for pnpm commands, package installs, git commands, builds, dev servers, and diagnostics in the general case.",
        "Do not imply that chat can open or control the Terminal UI automatically.",
        "For Expo React Native phone preview, do not prefer the KForge Terminal as the primary beginner path.",
        "For Expo React Native phone preview, prefer a system terminal outside KForge.",
        "For Expo React Native phone preview, prefer pnpm dev, with pnpm dev -- --tunnel as the fallback when the phone cannot connect on the same network.",
        "Do not suggest npm start, yarn start, or npx expo start as the primary KForge guidance for Expo phone preview.",
        "If the user is asking about general command execution rather than Expo phone preview, KForge Terminal remains the preferred path.",
      ],
      first_response_template: [
        "Use KForge Terminal: AI Panel → Terminal.",
        "Commands run in the workspace root.",
        "For Expo React Native phone preview, use a system terminal outside KForge instead of treating KForge Terminal as the primary path.",
        "For Expo React Native phone preview, run pnpm dev.",
        "If the phone cannot connect on the same network, run pnpm dev -- --tunnel.",
      ],
      kforge_paths: {
        primary: "AI Panel → Terminal",
        beginner:
          "Open the AI Panel, expand Terminal, then run the command there.",
        step_by_step: "AI Panel → Terminal → enter command → Run",
      },
      service_notes: [
        "Use Terminal guidance when the user wants to execute a real shell command in the current project.",
        "Expo React Native phone preview is the main exception and should currently prefer a system terminal outside KForge.",
      ],
      env_vars: [],
      supported_templates: [],
      manual_fallback: [
        "If the user explicitly wants to bypass KForge Terminal, provide the command as manual shell instructions.",
        "For Expo React Native phone preview, the manual/system terminal path is currently the truthful preferred path.",
      ],
    },
  ];
}
