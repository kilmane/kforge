import {
  formatLogEntriesForClipboard,
  formatTranscriptForClipboard,
  redactSensitiveText,
} from "./clipboardText.js";

describe("clipboard text formatting", () => {
  test("keeps log entries in display order with timestamps and line breaks", () => {
    const result = formatLogEntriesForClipboard([
      { ts: 1000, kind: "stdin", line: "> pnpm build" },
      { ts: 2000, kind: "stdout", line: "Building...\nDone" },
      { ts: 3000, kind: "stderr", line: "One warning" },
    ]);

    expect(result.indexOf("> pnpm build")).toBeLessThan(
      result.indexOf("Building..."),
    );
    expect(result.indexOf("Building...")).toBeLessThan(
      result.indexOf("One warning"),
    );
    expect(result).toContain("Building...\nDone");
    expect(result).toMatch(/\[\d{2}:\d{2}:\d{2}\] > pnpm build/);
  });

  test("keeps transcript roles, timestamps, and chronological content", () => {
    const result = formatTranscriptForClipboard([
      { ts: 1000, role: "user", content: "First request" },
      { ts: 2000, role: "assistant", content: "First response" },
      { ts: 3000, role: "system", content: "Status message" },
    ]);

    expect(result).toMatch(/\[\d{2}:\d{2}:\d{2}\] YOU\nFirst request/);
    expect(result).toMatch(
      /\[\d{2}:\d{2}:\d{2}\] ASSISTANT\nFirst response/,
    );
    expect(result).toMatch(/\[\d{2}:\d{2}:\d{2}\] SYSTEM\nStatus message/);
    expect(result.indexOf("First request")).toBeLessThan(
      result.indexOf("First response"),
    );
    expect(result.indexOf("First response")).toBeLessThan(
      result.indexOf("Status message"),
    );
  });

  test("redacts environment values, authorization headers, and known tokens", () => {
    const result = redactSensitiveText(
      [
        "VITE_SUPABASE_ANON_KEY=eyJabcdefgh.ijklmnop.qrstuvwx",
        'STRIPE_SECRET_KEY: "sk_live_1234567890"',
        "Authorization: Bearer top-secret-token",
        "Supabase anon key: pasted-value",
        "git push https://user:password@example.com/repo.git",
        "Normal status message",
      ].join("\n"),
    );

    expect(result).not.toContain("eyJabcdefgh.ijklmnop.qrstuvwx");
    expect(result).not.toContain("sk_live_1234567890");
    expect(result).not.toContain("top-secret-token");
    expect(result).not.toContain("pasted-value");
    expect(result).not.toContain("password@example.com");
    expect(result).toContain("Normal status message");
    expect(result.match(/\[REDACTED\]/g).length).toBeGreaterThanOrEqual(4);
  });
});
