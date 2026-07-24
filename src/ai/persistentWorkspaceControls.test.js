import fs from "fs";
import path from "path";

const panelSource = fs.readFileSync(
  path.join(__dirname, "panel", "AiPanel.jsx"),
  "utf8",
);
const transcriptSource = fs.readFileSync(
  path.join(__dirname, "panel", "TranscriptPanel.jsx"),
  "utf8",
);
const previewSource = fs.readFileSync(
  path.join(__dirname, "..", "runtime", "PreviewPanel.jsx"),
  "utf8",
);
const terminalSource = fs.readFileSync(
  path.join(__dirname, "..", "runtime", "CommandRunnerPanel.jsx"),
  "utf8",
);
const servicesSource = fs.readFileSync(
  path.join(__dirname, "..", "runtime", "ServicePanel.jsx"),
  "utf8",
);
const toolbarSource = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "components",
    "PersistentWorkspaceToolbar.jsx",
  ),
  "utf8",
);

function getWorkspaceSection(label, nextLabel) {
  const start = panelSource.indexOf(`aria-label="${label} workspace"`);
  const end = nextLabel
    ? panelSource.indexOf(`aria-label="${nextLabel} workspace"`, start)
    : panelSource.indexOf("{/* Change Provider/Model modal */}", start);

  if (start < 0 || end < 0) {
    throw new Error(`Could not find ${label} workspace section`);
  }

  return panelSource.slice(start, end);
}

describe("persistent workspace controls contract", () => {
  test.each([
    ["Preview", "Terminal", "setPreviewOpen", "setPreviewCopyText"],
    ["Terminal", "Services", "setTerminalOpen", "setTerminalCopyText"],
    ["Services", null, "setServicesOpen", "setServicesCopyText"],
  ])(
    "%s keeps a sticky toolbar wired to its existing close handler and output",
    (label, nextLabel, closeSetter, copySetter) => {
      const section = getWorkspaceSection(label, nextLabel);

      expect(section).toContain("sticky top-0");
      expect(section).toContain(
        `ariaLabel="${label} workspace controls"`,
      );
      expect(section).toContain(`onClose={() => ${closeSetter}(false)}`);
      expect(section).toContain(`onCopyTextChange={${copySetter}}`);
    },
  );

  test("runtime panels publish structured in-memory output instead of DOM text", () => {
    [previewSource, terminalSource, servicesSource].forEach((source) => {
      expect(source).toContain("formatLogEntriesForClipboard");
      expect(source).toContain("onCopyTextChange(copyText)");
      expect(source).not.toContain("document.body.innerText");
      expect(source).not.toContain("window.getSelection");
    });
  });

  test("Transcript copies chronological message data and keeps its sticky header", () => {
    expect(transcriptSource).toContain("sticky top-0");
    expect(transcriptSource).toContain("formatTranscriptForClipboard");
    expect(transcriptSource).toContain('ariaLabel="Transcript controls"');
  });

  test("Copy all has empty, success, error, and redaction safeguards", () => {
    expect(toolbarSource).toContain("redactSensitiveText");
    expect(toolbarSource).toContain("navigator.clipboard.writeText");
    expect(toolbarSource).toContain("disabled={!canCopy}");
    expect(toolbarSource).toContain('"Copied"');
    expect(toolbarSource).toContain("Copy failed");
  });
});
