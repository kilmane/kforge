import {
  SUPABASE_AUTOPILOT_PLAN_VERSION,
  classifyPlanningRisk,
  buildSupabaseAppWiringDatabaseContract,
  createSupabaseAutopilotPlan,
  detectFramework,
  detectPackageManager,
  fingerprintPlan,
  validateSupabaseAutopilotPlan,
} from "./planSchema";

const inspection = {
  local: {
    applicationName: "Hajj Companion",
    applicationRootName: "hajj-companion",
    framework: "vite-react",
    packageManager: "pnpm",
    sourceFiles: ["src/App.jsx", "src/main.jsx"],
    environmentVariableNames: ["VITE_SUPABASE_URL"],
    existingSupabaseDependencies: [],
    existingSupabaseClientFiles: [],
    authenticationFiles: [],
    persistenceFiles: [],
    warnings: [],
  },
  remote: {
    projectName: "Hajj Development",
    projectReference: "abcdefghijklmnopqrst",
    projectApiUrl: "https://abcdefghijklmnopqrst.supabase.co",
    tables: [],
    migrations: [],
    warnings: [],
  },
};

function createPlan(overrides = {}) {
  return createSupabaseAutopilotPlan({
    objective: "Add sign-in and save each user's Hajj progress.",
    selectedProjectReference: "abcdefghijklmnopqrst",
    inspection,
    ...overrides,
  });
}

describe("Supabase Autopilot plan schema", () => {
  test("creates a stable immutable versioned planning-only shape", () => {
    const plan = createPlan();

    expect(plan.schemaVersion).toBe(SUPABASE_AUTOPILOT_PLAN_VERSION);
    expect(plan.executionStatus).toBe("planning-only");
    expect(plan.implementationEligibility).toBe("eligible");
    expect(plan.mutationRequired).toBe(true);
    expect(plan.fingerprint).toMatch(/^fnv1a64-[a-f0-9]{16}$/);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.remoteSupabaseFindings.tables)).toBe(true);
    expect(plan.proposedDatabaseObjects[0]).toEqual(
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({
            name: "id",
            dataType: "uuid",
            safeToAddToExisting: false,
          }),
          expect.objectContaining({
            name: "user_id",
            dataType: "uuid",
            safeToAddToExisting: false,
          }),
        ]),
        primaryKeys: ["id"],
        rlsRequired: true,
      }),
    );
    expect(validateSupabaseAutopilotPlan(plan)).toEqual({
      valid: true,
      errors: [],
    });
  });

  test("derives a bounded database contract for controlled app wiring", () => {
  const contract = buildSupabaseAppWiringDatabaseContract(createPlan());

  expect(contract).toEqual([
    {
      table: "public.user_progress",
      ownership: "authenticated-user-owned",
      ownerColumn: "user_id",
      columns: [
        { name: "id", dataType: "uuid" },
        { name: "user_id", dataType: "uuid" },
        { name: "data", dataType: "jsonb" },
      ],
    },
  ]);
  expect(Object.isFrozen(contract)).toBe(true);
  expect(Object.isFrozen(contract[0])).toBe(true);
  expect(Object.isFrozen(contract[0].columns)).toBe(true);
  expect(contract[0]).not.toHaveProperty("remoteSupabaseFindings");
  expect(contract[0]).not.toHaveProperty("sqlDraft");
});
test("produces the same fingerprint for the same normalized input", () => {
    expect(createPlan().fingerprint).toBe(createPlan().fingerprint);
  });

  test("detects only an unambiguous Vite and React application", () => {
    expect(
      detectFramework({
        dependencies: { react: "^18.2.0" },
        devDependencies: { vite: "^7.0.0" },
        files: ["vite.config.js", "src/App.jsx"],
      }),
    ).toBe("vite-react");
    expect(
      detectFramework({
        dependencies: { react: "^18.2.0", next: "^15.0.0" },
        devDependencies: { vite: "^7.0.0" },
        files: ["vite.config.js", "next.config.js"],
      }),
    ).toBe("ambiguous");
    expect(detectFramework({ dependencies: { react: "^18.2.0" } })).toBe(
      "unsupported",
    );
  });

  test("detects package managers from one lockfile and rejects ambiguity", () => {
    expect(detectPackageManager({ files: ["pnpm-lock.yaml"] })).toBe("pnpm");
    expect(detectPackageManager({ files: ["package-lock.json"] })).toBe("npm");
    expect(
      detectPackageManager({
        files: ["pnpm-lock.yaml", "package-lock.json"],
      }),
    ).toBe("unknown");
    expect(detectPackageManager({ packageManager: "yarn@4.1.0" })).toBe("yarn");
  });

  test("requires explicit RLS intent for user-owned data", () => {
    const plan = createPlan();
    expect(plan.riskClassification).toBe("authentication/user-data change");
    expect(plan.proposedRlsPolicyIntent).toEqual([
      expect.objectContaining({
        ownerColumn: "user_id",
        status: "proposed",
      }),
    ]);

    const unsafe = {
      ...plan,
      proposedRlsPolicyIntent: [],
    };
    expect(validateSupabaseAutopilotPlan(unsafe).errors).toContain(
      "User-owned data plans require explicit RLS policy intent.",
    );
  });

  test("classifies destructive and production requests deterministically", () => {
    expect(
      classifyPlanningRisk({
        objective: "Drop every table and rebuild the schema.",
        framework: "vite-react",
        packageManager: "pnpm",
      }),
    ).toBe("destructive");
    expect(
      classifyPlanningRisk({
        objective: "Promote this to production.",
        framework: "vite-react",
        packageManager: "pnpm",
      }),
    ).toBe("production-prohibited");
  });

  test("preserves bounded generic Vite React wiring findings", () => {
    const plan = createPlan({
      inspection: {
        ...inspection,
        local: {
          ...inspection.local,
          wiringFindings: {
            entryFiles: ["src/main.jsx", "../outside.jsx"],
            reactStateFiles: ["src/App.jsx"],
            effectFiles: ["src/App.jsx"],
            supabaseCallFiles: ["src/lib/data.js"],
            authSessionFiles: ["src/auth/session.js"],
          },
        },
      },
    });

    expect(plan.localApplicationFindings.wiringFindings).toEqual({
      entryFiles: ["src/main.jsx"],
      reactStateFiles: ["src/App.jsx"],
      effectFiles: ["src/App.jsx"],
      supabaseCallFiles: ["src/lib/data.js"],
      authSessionFiles: ["src/auth/session.js"],
    });
    expect(validateSupabaseAutopilotPlan(plan)).toEqual({
      valid: true,
      errors: [],
    });
  });
  test("uses specific generic wiring evidence to choose deterministic integration targets", () => {
    const plan = createPlan({
      objective: "Add sign-in and save each user's dashboard settings.",
      inspection: {
        ...inspection,
        local: {
          ...inspection.local,
          applicationName: "Example Dashboard",
          applicationRootName: "example-dashboard",
          sourceFiles: [
            "src/main.jsx",
            "src/App.jsx",
            "src/lib/supabase.js",
            "src/lib/broadStore.js",
            "src/lib/data.js",
            "src/auth/broadAuth.js",
            "src/auth/session.js",
          ],
          existingSupabaseClientFiles: ["src/lib/supabase.js"],
          authenticationFiles: [
            "src/auth/broadAuth.js",
            "src/auth/session.js",
          ],
          persistenceFiles: [
            "src/lib/broadStore.js",
            "src/lib/data.js",
          ],
          wiringFindings: {
            entryFiles: ["src/main.jsx"],
            reactStateFiles: ["src/App.jsx"],
            effectFiles: ["src/App.jsx"],
            supabaseCallFiles: ["src/lib/data.js"],
            authSessionFiles: ["src/auth/session.js"],
          },
        },
      },
    });

    const operationsByRole = Object.fromEntries(
      plan.proposedApplicationFileOperations.map((operation) => [
        operation.role,
        operation,
      ]),
    );

    expect(operationsByRole["supabase-client"].path).toBe(
      "src/lib/supabase.js",
    );
    expect(operationsByRole["auth-session"].path).toBe(
      "src/auth/session.js",
    );
    expect(operationsByRole["data-access"].path).toBe("src/lib/data.js");
    expect(operationsByRole["react-integration"].path).toBe("src/App.jsx");

    const paths = plan.proposedApplicationFileOperations.map(
      (operation) => operation.path,
    );
    expect(new Set(paths).size).toBe(paths.length);
    expect(
      plan.proposedApplicationFileOperations.every(
        (operation) => operation.status === "proposed",
      ),
    ).toBe(true);
    expect(validateSupabaseAutopilotPlan(plan)).toEqual({
      valid: true,
      errors: [],
    });
  });
  test("fails closed when distinct wiring roles collapse onto the same application path", () => {
    expect(() =>
      createPlan({
        objective: "Add sign-in and save each user's dashboard settings.",
        inspection: {
          ...inspection,
          local: {
            ...inspection.local,
            applicationName: "Compact Dashboard",
            applicationRootName: "compact-dashboard",
            sourceFiles: ["src/App.jsx", "src/lib/supabase.js"],
            existingSupabaseClientFiles: ["src/lib/supabase.js"],
            authenticationFiles: ["src/App.jsx"],
            persistenceFiles: ["src/App.jsx"],
            wiringFindings: {
              entryFiles: [],
              reactStateFiles: ["src/App.jsx"],
              effectFiles: ["src/App.jsx"],
              supabaseCallFiles: ["src/App.jsx"],
              authSessionFiles: ["src/App.jsx"],
            },
          },
        },
      }),
    ).toThrow(/must not target the same path more than once/i);
  });
  test("flags unsupported frameworks without proposing implementation files", () => {
    const plan = createPlan({
      inspection: {
        ...inspection,
        local: {
          ...inspection.local,
          framework: "unsupported",
        },
      },
    });

    expect(plan.riskClassification).toBe("unsupported");
    expect(plan.implementationEligibility).toBe("blocked");
    expect(plan.unsupportedConditions).not.toHaveLength(0);
    expect(plan.proposedApplicationFileOperations).toEqual([]);
  });

  test("rejects secret values and secret-bearing plan fields", () => {
    expect(() =>
      createPlan({
        objective:
          "Use sb_secret_this_should_never_cross_the_boundary to add auth.",
      }),
    ).toThrow(/credentials or secret values/i);

    const plan = createPlan();
    const unsafe = {
      ...plan,
      access_token: "not-safe",
    };
    expect(validateSupabaseAutopilotPlan(unsafe).errors[0]).toMatch(
      /Secret-bearing field/i,
    );
  });

  test("rejects unbounded paths and completed mutation claims", () => {
    const plan = createPlan();
    const unsafe = {
      ...plan,
      proposedApplicationFileOperations: [
        {
          operation: "overwrite",
          path: "../outside.jsx",
          purpose: "Unsafe",
          status: "completed",
        },
      ],
    };
    const validation = validateSupabaseAutopilotPlan(unsafe);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/outside the safe boundary/),
        "Application operations must remain proposed.",
      ]),
    );
  });

  test("rejects malformed or falsely safe database structure", () => {
    const plan = createPlan();
    const unsafe = JSON.parse(JSON.stringify(plan));
    unsafe.proposedDatabaseObjects[0].columns[0].safeToAddToExisting = true;
    delete unsafe.fingerprint;
    unsafe.fingerprint = fingerprintPlan(unsafe);

    expect(validateSupabaseAutopilotPlan(unsafe).errors).toContain(
      "A proposed database column is malformed or not safely bounded.",
    );
  });

  test("normalizes remote metadata without database row content", () => {
    const plan = createPlan({
      inspection: {
        ...inspection,
        remote: {
          ...inspection.remote,
          tables: [
            {
              name: "public.progress",
              rlsEnabled: true,
              rows: [{ private_note: "must not cross" }],
              columns: [
                {
                  name: "id",
                  dataType: "uuid",
                  nullable: false,
                  unique: true,
                },
              ],
              primaryKeys: ["id"],
              foreignKeys: [],
            },
          ],
        },
      },
    });

    expect(JSON.stringify(plan.remoteSupabaseFindings)).not.toContain(
      "private_note",
    );
    expect(plan.remoteSupabaseFindings.tables[0]).not.toHaveProperty("rows");
  });
  test("prefers real Supabase files and never duplicates application paths", () => {
    const plan = createPlan({
      inspection: {
        ...inspection,
        local: {
          ...inspection.local,
          existingSupabaseClientFiles: [
            "src/examples/supabaseExample.js",
            "src/lib/supabase.js",
            "src/lib/supabaseQueries.js",
          ],
          persistenceFiles: [
            "src/examples/supabaseExample.js",
            "src/lib/supabaseQueries.js",
          ],
        },
      },
    });

    const paths = plan.proposedApplicationFileOperations.map(
      (operation) => operation.path,
    );

    expect(paths[0]).toBe("src/lib/supabase.js");
    expect(paths).toContain("src/lib/supabaseQueries.js");
    expect(paths).not.toContain("src/examples/supabaseExample.js");
    expect(new Set(paths).size).toBe(paths.length);
  });
});
