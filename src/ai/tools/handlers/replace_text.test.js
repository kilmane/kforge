import {
  fingerprintFileContent,
  materializeExactTextReplacement,
} from "./replace_text";

const currentContent = [
  "export default function App() {",
  "  return <main className=\"app-shell\">Existing app</main>;",
  "}",
].join("\n");

test("materializes one unique exact replacement", () => {
  const fingerprint = fingerprintFileContent(currentContent);
  const result = materializeExactTextReplacement({
    currentContent,
    expectedFileFingerprint: fingerprint,
    oldText: "Existing app",
    newText: "Existing app with persistence",
  });

  expect(result.ok).toBe(true);
  expect(result.currentFingerprint).toBe(fingerprint);
  expect(result.materializedContent).toContain(
    "Existing app with persistence",
  );
  expect(result.materializedContent).not.toContain(">Existing app<");
});

test("matches an LF anchor in an LF file and preserves LF newlines", () => {
  const current = "const first = true;\nconst second = false;\nconst tail = true;";
  const result = materializeExactTextReplacement({
    currentContent: current,
    expectedFileFingerprint: fingerprintFileContent(current),
    oldText: "const first = true;\nconst second = false;",
    newText: "const first = true;\nconst second = true;",
  });

  expect(result.ok).toBe(true);
  expect(result.materializedContent).toBe(
    "const first = true;\nconst second = true;\nconst tail = true;",
  );
  expect(result.materializedContent).not.toContain("\r");
});

test("matches an LF anchor in a CRLF file and preserves CRLF newlines", () => {
  const current =
    "const untouched = true;\r\nconst first = true;\r\nconst second = false;\r\nconst tail = true;\r\n";
  const result = materializeExactTextReplacement({
    currentContent: current,
    expectedFileFingerprint: fingerprintFileContent(current),
    oldText: "const first = true;\nconst second = false;",
    newText: "const first = true;\nconst second = true;\nconst added = true;",
  });

  expect(result.ok).toBe(true);
  expect(result.materializedContent).toBe(
    "const untouched = true;\r\nconst first = true;\r\nconst second = true;\r\nconst added = true;\r\nconst tail = true;\r\n",
  );
  expect(result.materializedContent.replaceAll("\r\n", "")).not.toContain(
    "\n",
  );
});

test("matches a CRLF anchor in a CRLF file", () => {
  const current = "const first = true;\r\nconst second = false;\r\n";
  const result = materializeExactTextReplacement({
    currentContent: current,
    expectedFileFingerprint: fingerprintFileContent(current),
    oldText: "const first = true;\r\nconst second = false;",
    newText: "const first = true;\r\nconst second = true;",
  });

  expect(result.ok).toBe(true);
  expect(result.materializedContent).toBe(
    "const first = true;\r\nconst second = true;\r\n",
  );
});

test("preserves untouched CRLF content outside the materialized edit", () => {
  const prefix = "// untouched prefix\r\nconst marker = 'before';\r\n";
  const suffix = "const untouchedTail = true;\r\n// untouched suffix\r\n";
  const current = `${prefix}const mode = 'local';\r\n${suffix}`;
  const result = materializeExactTextReplacement({
    currentContent: current,
    expectedFileFingerprint: fingerprintFileContent(current),
    oldText: "const mode = 'local';",
    newText: "const mode = 'remote';\nconst synced = true;",
  });

  expect(result.ok).toBe(true);
  expect(result.materializedContent).toBe(
    `${prefix}const mode = 'remote';\r\nconst synced = true;\r\n${suffix}`,
  );
  expect(result.materializedContent.startsWith(prefix)).toBe(true);
  expect(result.materializedContent.endsWith(suffix)).toBe(true);
});

test("fails closed when the exact text is absent", () => {
  const result = materializeExactTextReplacement({
    currentContent,
    expectedFileFingerprint: fingerprintFileContent(currentContent),
    oldText: "Missing anchor",
    newText: "Replacement",
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/exactly once.*found 0/i);
});

test("fails closed when the exact text appears more than once", () => {
  const duplicated = "const marker = true;\nconst marker = true;\n";
  const result = materializeExactTextReplacement({
    currentContent: duplicated,
    expectedFileFingerprint: fingerprintFileContent(duplicated),
    oldText: "const marker = true;",
    newText: "const marker = false;",
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/exactly once.*found 2/i);
});

test("fails closed when normalized anchors appear more than once", () => {
  const duplicated =
    "const first = true;\r\nconst second = false;\r\n" +
    "const first = true;\r\nconst second = false;\r\n";
  const result = materializeExactTextReplacement({
    currentContent: duplicated,
    expectedFileFingerprint: fingerprintFileContent(duplicated),
    oldText: "const first = true;\nconst second = false;",
    newText: "const first = true;\nconst second = true;",
  });

  expect(result.ok).toBe(false);
  expect(result.matchCount).toBe(2);
  expect(result.error).toMatch(/exactly once.*found 2/i);
});

test("fails closed when a normalized multiline anchor is absent", () => {
  const current = "const first = true;\r\nconst second = false;\r\n";
  const result = materializeExactTextReplacement({
    currentContent: current,
    expectedFileFingerprint: fingerprintFileContent(current),
    oldText: "const first = true;\nconst missing = true;",
    newText: "const replacement = true;",
  });

  expect(result.ok).toBe(false);
  expect(result.matchCount).toBe(0);
  expect(result.error).toMatch(/exactly once.*found 0/i);
});

test("fails closed when mixed file newlines make insertion style ambiguous", () => {
  const current = "const first = true;\r\nconst target = false;\nconst tail = true;";
  const result = materializeExactTextReplacement({
    currentContent: current,
    expectedFileFingerprint: fingerprintFileContent(current),
    oldText: "const target = false;",
    newText: "const target = true;\nconst added = true;",
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/mixed file newline styles.*ambiguous/i);
});

test("treats regex-looking oldText as literal exact text", () => {
  const source = "const pattern = /a.+b/;";
  const result = materializeExactTextReplacement({
    currentContent: source,
    expectedFileFingerprint: fingerprintFileContent(source),
    oldText: "/a.+b/",
    newText: "/literal/",
  });

  expect(result.ok).toBe(true);
  expect(result.materializedContent).toBe("const pattern = /literal/;");
});

test("fails closed when the current file fingerprint is stale", () => {
  const result = materializeExactTextReplacement({
    currentContent,
    expectedFileFingerprint: fingerprintFileContent("older contents"),
    oldText: "Existing app",
    newText: "Replacement",
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/fingerprint.*no longer matches/i);
});

test("keeps fingerprint validation sensitive to actual CRLF file content", () => {
  const crlfCurrent = "const first = true;\r\nconst second = false;\r\n";
  const lfInspection = "const first = true;\nconst second = false;\n";
  const result = materializeExactTextReplacement({
    currentContent: crlfCurrent,
    expectedFileFingerprint: fingerprintFileContent(lfInspection),
    oldText: "const first = true;\nconst second = false;",
    newText: "const first = true;\nconst second = true;",
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/fingerprint.*no longer matches/i);
});

test("preserves a large established file except for one anchored edit", () => {
  const prefix = Array.from(
    { length: 900 },
    (_, index) => `const preservedHandler${index} = () => ${index};`,
  ).join("\n");
  const anchor = "const persistenceMode = \"local\";";
  const current = `${prefix}\n${anchor}\nexport default function App() { return null; }`;
  expect(current.length).toBeGreaterThan(20_000);

  const result = materializeExactTextReplacement({
    currentContent: current,
    expectedFileFingerprint: fingerprintFileContent(current),
    oldText: anchor,
    newText:
      `${anchor}\nconst remotePersistenceMode = \"supabase\";`,
  });

  expect(result.ok).toBe(true);
  expect(result.materializedContent).toBe(
    current.replace(
      anchor,
      `${anchor}\nconst remotePersistenceMode = \"supabase\";`,
    ),
  );
  expect(result.materializedContent).toContain("preservedHandler899");
});
