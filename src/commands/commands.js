export const commands = [
  {
    id: "toggle-explorer",
    title: "Toggle Explorer",
    shortcut: "Ctrl/Cmd + B",
    run: ({ toggleExplorer }) => toggleExplorer(),
  },
  {
    id: "toggle-chat",
    title: "Toggle Chat",
    shortcut: "Ctrl/Cmd + J",
    run: ({ toggleChat }) => toggleChat(),
  },
  {
    id: "dummy-save",
    title: "Save File",
    shortcut: "Ctrl/Cmd + S",
    run: () => console.log("💾 Save triggered"),
  },
];
