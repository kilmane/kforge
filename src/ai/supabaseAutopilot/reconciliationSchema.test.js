import {
  createSupabaseAutopilotPlan,
  fingerprintPlan,
} from "./planSchema";
import {
  SUPABASE_AUTOPILOT_RECONCILIATION_VERSION,
  createSupabaseAutopilotReconciliation,
  validateSupabaseAutopilotReconciliation,
} from "./reconciliationSchema";

const projectReference = "abcdefghijklmnopqrst";
const localInspection = {
  applicationName: "Hajj Companion",
  applicationRootName: "hajj-companion",
  framework: "vite-react",
  packageManager: "pnpm",
  sourceFiles: ["src/App.jsx"],
  environmentVariableNames: ["VITE_SUPABASE_URL"],
  existingSupabaseDependencies: [],
  existingSupabaseClientFiles: [],
  authenticationFiles: [],
  persistenceFiles: [],
  warnings: [],
};

function createPlan({
  objective = "Add a notes table.",
  projectName = "Hajj Development",
  tables = [],
  migrations = [],
  local = localInspection,
} = {}) {
  return createSupabaseAutopilotPlan({
    objective,
    selectedProjectReference: projectReference,
    inspection: {
      local,
      remote: {
        projectName,
        projectReference,
        projectApiUrl: `https://${projectReference}.supabase.co`,
        tables,
        migrations,
        warnings: [],
      },
    },
  });
}

function compatibleFeatureTable(overrides = {}) {
  return {
    name: "public.feature_records",
    rlsEnabled: false,
    columns: [
      {
        name: "id",
        dataType: "uuid",
        nullable: false,
        unique: false,
      },
      {
        name: "data",
        dataType: "jsonb",
        nullable: false,
        unique: false,
      },
    ],
    primaryKeys: ["id"],
    foreignKeys: [],
    ...overrides,
  };
}

function refingerprint(plan, mutate) {
  const copy = JSON.parse(JSON.stringify(plan));
  mutate(copy);
  delete copy.fingerprint;
  copy.fingerprint = fingerprintPlan(copy);
  return copy;
}

describe("Supabase Autopilot migration reconciliation", () => {
  test("identical normalized input produces the same immutable result and migration identity", () => {
    const first = createSupabaseAutopilotReconciliation(createPlan());
    const second = createSupabaseAutopilotReconciliation(createPlan());

    expect(first.schemaVersion).toBe(
      SUPABASE_AUTOPILOT_RECONCILIATION_VERSION,
    );
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.proposedMigration).toEqual(second.proposedMigration);
    expect(first.fingerprint).toMatch(/^fnv1a64-[a-f0-9]{16}$/);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.findings)).toBe(true);
  });

  test("a missing table produces an additive proposal and review-only SQL", () => {
    const result = createSupabaseAutopilotReconciliation(createPlan());

    expect(result.status).toBe("additive-proposal");
    expect(result.proposedAdditiveChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "create-table",
          table: "public.feature_records",
        }),
      ]),
    );
    expect(result.sqlDraft).toMatch(
      /^-- PLANNING ONLY: review artifact; SQL has not been executed\./,
    );
    expect(result.sqlDraft).toContain(
      'CREATE TABLE "public"."feature_records"',
    );
  });

  test("a compatible existing table is not created again", () => {
    const result = createSupabaseAutopilotReconciliation(
      createPlan({ tables: [compatibleFeatureTable()] }),
    );

    expect(result.status).toBe("already-satisfied");
    expect(result.proposedAdditiveChanges).toEqual([]);
    expect(result.sqlDraft).toBe("");
    expect(
      result.findings.filter(
        (item) =>
          item.objectType === "column" &&
          item.classification === "already-satisfied",
      ),
    ).toHaveLength(2);
  });

  test("a type or primary-key mismatch becomes a conflict without repair SQL", () => {
    const table = compatibleFeatureTable({
      columns: [
        {
          name: "id",
          dataType: "text",
          nullable: false,
          unique: false,
        },
        {
          name: "data",
          dataType: "jsonb",
          nullable: false,
          unique: false,
        },
      ],
      primaryKeys: ["data"],
    });
    const result = createSupabaseAutopilotReconciliation(
      createPlan({ tables: [table] }),
    );

    expect(result.status).toBe("conflict");
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ objectType: "column" }),
        expect.objectContaining({ objectType: "primary-key" }),
      ]),
    );
    expect(result.sqlDraft).not.toMatch(/\bALTER\s+COLUMN\b/i);
    expect(result.sqlDraft).not.toMatch(/\bDROP\b/i);
  });

  test("an uncertain required-column addition requires manual review", () => {
    const table = compatibleFeatureTable({
      columns: [
        {
          name: "id",
          dataType: "uuid",
          nullable: false,
          unique: false,
        },
      ],
    });
    const result = createSupabaseAutopilotReconciliation(
      createPlan({ tables: [table] }),
    );

    expect(result.status).toBe("manual-review-required");
    expect(result.manualReview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          objectName: "public.feature_records.data",
        }),
      ]),
    );
    expect(result.sqlDraft).not.toContain('ADD COLUMN "data"');
  });

  test("a missing nullable column is additive only when the normalized plan proves it safe", () => {
    const plan = createPlan({ tables: [compatibleFeatureTable()] });
    const withOptionalColumn = refingerprint(plan, (copy) => {
      copy.proposedDatabaseObjects[0].columns.push({
        name: "description",
        dataType: "text",
        nullable: true,
        unique: false,
        safeToAddToExisting: true,
      });
    });
    const result =
      createSupabaseAutopilotReconciliation(withOptionalColumn);

    expect(result.proposedAdditiveChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ operation: "add-column" }),
      ]),
    );
    expect(result.sqlDraft).toContain('ADD COLUMN "description" text');
  });

  test("extra remote fields are retained and never deleted", () => {
    const table = compatibleFeatureTable({
      columns: [
        ...compatibleFeatureTable().columns,
        {
          name: "remote_only",
          dataType: "text",
          nullable: true,
          unique: false,
        },
      ],
    });
    const result = createSupabaseAutopilotReconciliation(
      createPlan({
        tables: [
          table,
          {
            name: "public.remote_only",
            rlsEnabled: true,
            columns: [],
            primaryKeys: [],
            foreignKeys: [],
          },
        ],
      }),
    );

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          objectType: "retained-column",
          objectName: "public.feature_records.remote_only",
        }),
        expect.objectContaining({
          objectType: "retained-table",
          objectName: "public.remote_only",
        }),
      ]),
    );
    expect(result.sqlDraft).not.toMatch(/\b(?:DROP|DELETE)\b/i);
  });

  test("RLS is never disabled when it exists as extra remote protection", () => {
    const result = createSupabaseAutopilotReconciliation(
      createPlan({
        tables: [compatibleFeatureTable({ rlsEnabled: true })],
      }),
    );

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          objectType: "rls",
          classification: "already-satisfied",
        }),
      ]),
    );
    expect(result.sqlDraft).not.toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
  });

  test("unavailable policy metadata is reported honestly", () => {
    const result = createSupabaseAutopilotReconciliation(
      createPlan({
        objective: "Add sign-in and save each user's Hajj progress.",
      }),
    );

    expect(result.manualReview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ objectType: "rls-policy" }),
      ]),
    );
    expect(result.limitations.join(" ")).toMatch(
      /policy definitions were unavailable/i,
    );
    expect(result.sqlDraft).toMatch(
      /requires manual verification; no policy SQL was generated/i,
    );
  });

  test("migration identity collisions block reconciliation", () => {
    const identity =
      createSupabaseAutopilotReconciliation(
        createPlan(),
      ).proposedMigration;
    const result = createSupabaseAutopilotReconciliation(
      createPlan({
        migrations: [
          {
            version: identity.version,
            name: "different_migration",
          },
        ],
      }),
    );

    expect(result.status).toBe("blocked");
    expect(result.proposedMigration.status).toBe("collision");
    expect(result.conflicts[0].objectType).toBe("migration");
    expect(result.sqlDraft).toBe("");
  });

  test("an already-recorded matching migration identity is recognized without claiming mutation", () => {
    const identity =
      createSupabaseAutopilotReconciliation(
        createPlan({ tables: [compatibleFeatureTable()] }),
      ).proposedMigration;
    const result = createSupabaseAutopilotReconciliation(
      createPlan({
        tables: [compatibleFeatureTable()],
        migrations: [
          {
            version: identity.version,
            name: identity.name,
          },
        ],
      }),
    );

    expect(result.status).toBe("already-satisfied");
    expect(result.proposedMigration.status).toBe("already-recorded");
    expect(result.executionStatus).toBe("not-applied");
  });

  test("destructive operations never appear in SQL", () => {
    const blocked = createSupabaseAutopilotReconciliation(
      createPlan({ objective: "Drop every table and rebuild the schema." }),
    );
    const additive = createSupabaseAutopilotReconciliation(createPlan());

    expect(blocked.status).toBe("blocked");
    expect(blocked.sqlDraft).toBe("");
    expect(additive.sqlDraft).not.toMatch(
      /\b(?:DROP|TRUNCATE|DELETE|GRANT|REVOKE)\b/i,
    );
  });

  test("secret-bearing and row-bearing plan input is rejected", () => {
    const plan = createPlan();
    const withSecret = refingerprint(plan, (copy) => {
      copy.service_role_key = "not-allowed";
    });
    const withRows = refingerprint(plan, (copy) => {
      copy.remoteSupabaseFindings.rows = [{ private_note: "not-allowed" }];
    });
    const withUnboundedObjective = refingerprint(plan, (copy) => {
      copy.requestedObjective = "x".repeat(1201);
    });
    const withUnsafePath = refingerprint(plan, (copy) => {
      copy.proposedApplicationFileOperations[0].path = "../outside.jsx";
    });

    expect(() =>
      createSupabaseAutopilotReconciliation(withSecret),
    ).toThrow(/secret-bearing/i);
    expect(() => createSupabaseAutopilotReconciliation(withRows)).toThrow(
      /row content/i,
    );
    expect(() =>
      createSupabaseAutopilotReconciliation(withUnboundedObjective),
    ).toThrow(/malformed or unbounded/i);
    expect(() =>
      createSupabaseAutopilotReconciliation(withUnsafePath),
    ).toThrow(/malformed or unbounded/i);
  });

  test("production, unsupported, and ineligible plans remain blocked", () => {
    const production = createSupabaseAutopilotReconciliation(
      createPlan({ projectName: "Hajj Production" }),
    );
    const unsupported = createSupabaseAutopilotReconciliation(
      createPlan({
        local: {
          ...localInspection,
          framework: "unsupported",
        },
      }),
    );

    expect(production.status).toBe("blocked");
    expect(unsupported.status).toBe("blocked");
    expect(unsupported.proposedAdditiveChanges).toEqual([]);
  });

  test("canApply is always false and malformed output is rejected", () => {
    const result = createSupabaseAutopilotReconciliation(createPlan());
    const malformed = refingerprint(result, (copy) => {
      copy.canApply = true;
    });

    expect(result.canApply).toBe(false);
    expect(result.nothingAppliedStatement).toMatch(/nothing was applied/i);
    expect(validateSupabaseAutopilotReconciliation(result)).toEqual({
      valid: true,
      errors: [],
    });
    expect(
      validateSupabaseAutopilotReconciliation(malformed).errors,
    ).toContain("A reconciliation result can never be applied.");
  });
});
