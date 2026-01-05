import Editor from "@monaco-editor/react";

export default function CodeEditor() {
  return (
    <Editor
      height="100%"
      defaultLanguage="javascript"
      defaultValue={`function vibe() {
  return "KForge is heating up 🔥";
}`}
      theme="vs-dark"
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        automaticLayout: true,
      }}
    />
  );
}
