
import fs from "fs";
import path from "path";

const appSource = fs.readFileSync(
  path.join(__dirname, "..", "App.js"),
  "utf8",
);

describe("app-build start routing", () => {
  test("approved blueprint starts controlled app-build implementation", () => {
    expect(appSource).toMatch(
      /Start implementation from the approved plan[\s\S]{0,1500}forceAppBuildImplementation:\s*true/,
    );
    expect(appSource).toMatch(
      /Start implementation from the approved plan[\s\S]{0,1500}modelToolOriginalGoal:\s*draft/,
    );
    expect(appSource).toMatch(
      /Start implementation from the approved plan[\s\S]{0,1500}lastUserGoal:\s*draft/,
    );
  });
});
