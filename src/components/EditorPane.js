import React from "react";
import Editor from "@monaco-editor/react";

export default function EditorPane({ filePath, value, onChange }) {
  if (!filePath) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm opacity-70">
        Click a file in the Explorer to open it
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        theme="vs-dark"
        path={filePath}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          tabSize: 2,
          wordWrap: "on",
          automaticLayout: true
        }}
      />
    </div>
  );
}
