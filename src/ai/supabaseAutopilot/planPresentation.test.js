import { createSupabaseAutopilotPlan } from "./planSchema";
import { presentSupabaseAutopilotPlan } from "./planPresentation";

test("presents a plain-English planning-only summary", () => {
  const plan = createSupabaseAutopilotPlan({
    objective: "Add sign-in and save each user's Hajj progress.",
    selectedProjectReference: "abcdefghijklmnopqrst",
    inspection: {
      local: {
        applicationName: "Hajj Companion",
        applicationRootName: "hajj-companion",
        framework: "vite-react",
        packageManager: "pnpm",
        sourceFiles: ["src/App.jsx"],
      },
      remote: {
        projectName: "Hajj Development",
        projectReference: "abcdefghijklmnopqrst",
        projectApiUrl: "https://abcdefghijklmnopqrst.supabase.co",
        tables: [],
        migrations: [],
      },
    },
  });

  const presentation = presentSupabaseAutopilotPlan(plan);

  expect(presentation.title).toMatch(/Hajj progress/);
  expect(presentation.summary.join(" ")).toMatch(/read-only mode/i);
  expect(presentation.summary.join(" ")).toMatch(/has made none/i);
  expect(presentation.steps.join(" ")).toMatch(/RLS policies/i);
  expect(presentation.shortFingerprint).toHaveLength(12);
});
