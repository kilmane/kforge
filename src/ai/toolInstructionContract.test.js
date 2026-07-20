import fs from "fs";
import path from "path";

const appSource = fs.readFileSync(
  path.join(__dirname, "..", "App.js"),
  "utf8",
);

describe("KForge tool instruction contract", () => {
  test("visual safety instructions do not conflict with tool-only output", () => {
    expect(appSource).toContain("Visual/UI/CSS iteration safety:");
    expect(appSource).toContain(
      "Output no prose before or after the tool block.",
    );
    expect(appSource).toContain(
      "Keep visual-preservation reasoning internal and express it through the requested file content; do not add a prose summary outside the required tool block.",
    );
    expect(appSource).not.toContain(
      "Before a write_file request for UI/CSS changes, briefly summarize",
    );
  });
});
