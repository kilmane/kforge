import { createSupabaseAutopilotPlan } from "../../ai/supabaseAutopilot/planSchema";
import { createSupabaseAutopilotReconciliation } from "../../ai/supabaseAutopilot/reconciliationSchema";
import {
  canApplyPreparedSupabaseApproval,
  createSupabaseMutationApprovalRequest,
  getSupabaseMutationEligibility,
  initialSupabaseMutationState,
  supabaseMutationReducer,
  validatePreparedSupabaseApproval,
  verifySupabaseMutationResult,
} from "./mutationState";

const project = Object.freeze({
  name: "Hajj Development",
  reference: "abcdefghijklmnopqrst",
});

const local = Object.freeze({
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
});

function featureTable(overrides = {}) {
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

function plan({
  projectName = project.name,
  projectReference = project.reference,
  tables = [],
  migrations = [],
  objective = "Add a notes table.",
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

function additiveReconciliation() {
  return createSupabaseAutopilotReconciliation(plan());
}

function approvalFor(reconciliation, overrides = {}) {
  return {
    approvalToken: "approval-1-1111111122222222",
    projectReference: project.reference,
    migrationName: reconciliation.proposedMigration.name,
    reconciliationFingerprint: reconciliation.fingerprint,
    ...overrides,
  };
}

describe("Supabase approved mutation state contract", () => {
  test("invalid mutation state transitions are ignored", () => {
    expect(
      supabaseMutationReducer(initialSupabaseMutationState, {
        type: "applying",
      }),
    ).toBe(initialSupabaseMutationState);
    expect(
      supabaseMutationReducer(initialSupabaseMutationState, {
        type: "verified",
      }),
    ).toBe(initialSupabaseMutationState);
  });

  test("requires a valid current reconciliation and exact development confirmation", () => {
    const reconciliation = additiveReconciliation();

    expect(
      getSupabaseMutationEligibility({
        reconciliation: null,
        verifiedProject: project,
      }).eligible,
    ).toBe(false);
    expect(() =>
      createSupabaseMutationApprovalRequest({
        reconciliation,
        verifiedProject: project,
        confirmedDevelopmentProjectReference: "",
      }),
    ).toThrow(/development-only confirmation/i);
    expect(() =>
      createSupabaseMutationApprovalRequest({
        reconciliation,
        verifiedProject: project,
        confirmedDevelopmentProjectReference: "another-project",
      }),
    ).toThrow(/exact project/i);

    const request = createSupabaseMutationApprovalRequest({
      reconciliation,
      verifiedProject: project,
      confirmedDevelopmentProjectReference: project.reference,
    });
    expect(request).toEqual({
      reconciliation,
      confirmedDevelopmentProjectReference: project.reference,
    });
    expect(request).not.toHaveProperty("sql");
  });

  test("production and unknown development eligibility fail closed", () => {
    const productionProject = {
      ...project,
      name: "Hajj Production",
    };
    const productionReconciliation =
      createSupabaseAutopilotReconciliation(
        plan({ projectName: productionProject.name }),
      );

    expect(
      getSupabaseMutationEligibility({
        reconciliation: productionReconciliation,
        verifiedProject: productionProject,
      }),
    ).toEqual(
      expect.objectContaining({
        eligible: false,
        reason: expect.stringMatching(/production|live/i),
      }),
    );
    expect(() =>
      createSupabaseMutationApprovalRequest({
        reconciliation: additiveReconciliation(),
        verifiedProject: project,
      }),
    ).toThrow(/development-only confirmation/i);
  });

  test("manual review, conflict, already-satisfied, and empty SQL never become eligible", () => {
    const manualReview = createSupabaseAutopilotReconciliation(
      plan({
        objective: "Add sign-in and save each user's Hajj progress.",
      }),
    );
    const conflict = createSupabaseAutopilotReconciliation(
      plan({
        tables: [
          featureTable({
            columns: [
              {
                name: "id",
                dataType: "text",
                nullable: false,
                unique: false,
              },
              featureTable().columns[1],
            ],
          }),
        ],
      }),
    );
    const alreadySatisfied = createSupabaseAutopilotReconciliation(
      plan({ tables: [featureTable()] }),
    );

    for (const reconciliation of [
      manualReview,
      conflict,
      alreadySatisfied,
    ]) {
      expect(
        getSupabaseMutationEligibility({
          reconciliation,
          verifiedProject: project,
        }).eligible,
      ).toBe(false);
    }
    expect(alreadySatisfied.sqlDraft).toBe("");
  });

  test("approval binds project, reconciliation fingerprint, and managed name", () => {
    const reconciliation = additiveReconciliation();
    const approval = approvalFor(reconciliation);
    const approvedState = {
      phase: "approved",
      approval,
      error: "",
      message: "",
    };

    expect(
      validatePreparedSupabaseApproval(approval, reconciliation, project),
    ).toBe(true);
    expect(
      canApplyPreparedSupabaseApproval(
        approvedState,
        reconciliation,
        project,
      ),
    ).toBe(true);
    expect(
      validatePreparedSupabaseApproval(
        { ...approval, projectReference: "another-project" },
        reconciliation,
        project,
      ),
    ).toBe(false);
    expect(
      validatePreparedSupabaseApproval(
        { ...approval, reconciliationFingerprint: "fnv1a64-0000000000000000" },
        reconciliation,
        project,
      ),
    ).toBe(false);
    expect(
      validatePreparedSupabaseApproval(
        { ...approval, migrationName: "supabase_autopilot_000000000000" },
        reconciliation,
        project,
      ),
    ).toBe(false);
    expect(
      canApplyPreparedSupabaseApproval(
        approvedState,
        reconciliation,
        { ...project, reference: "another-project" },
      ),
    ).toBe(false);
  });

  test("changed SQL or reconciliation cannot reuse approval or inject arbitrary SQL", () => {
    const reconciliation = additiveReconciliation();
    const changed = JSON.parse(JSON.stringify(reconciliation));
    changed.sqlDraft += "\nDROP TABLE public.feature_records;";

    expect(
      getSupabaseMutationEligibility({
        reconciliation: changed,
        verifiedProject: project,
      }).eligible,
    ).toBe(false);
    expect(
      validatePreparedSupabaseApproval(
        approvalFor(reconciliation),
        changed,
        project,
      ),
    ).toBe(false);
    expect(changed.sqlDraft).toMatch(/\bDROP\b/);
  });

  test("one approval is consumed when applying and failures never restore it", () => {
    const reconciliation = additiveReconciliation();
    const available = supabaseMutationReducer(
      initialSupabaseMutationState,
      {
        type: "reconciliation_available",
      },
    );
    const preparing = supabaseMutationReducer(available, {
      type: "approval_begin",
    });
    const approved = supabaseMutationReducer(preparing, {
      type: "approved",
      approval: approvalFor(reconciliation),
    });
    const applying = supabaseMutationReducer(approved, {
      type: "applying",
    });
    const failed = supabaseMutationReducer(applying, {
      type: "failed",
      error: "provider rejected request",
    });

    expect(applying).toEqual(
      expect.objectContaining({ phase: "applying", approval: null }),
    );
    expect(failed).toEqual(
      expect.objectContaining({
        phase: "failed",
        approval: null,
        message: expect.stringMatching(/fresh read-only plan/i),
      }),
    );
    expect(
      canApplyPreparedSupabaseApproval(
        failed,
        reconciliation,
        project,
      ),
    ).toBe(false);
  });

  test("successful mutation remains awaiting verification until both checks pass", () => {
    const reconciliation = additiveReconciliation();
    const available = supabaseMutationReducer(
      initialSupabaseMutationState,
      { type: "reconciliation_available" },
    );
    const preparing = supabaseMutationReducer(available, {
      type: "approval_begin",
    });
    const approved = supabaseMutationReducer(preparing, {
      type: "approved",
      approval: approvalFor(reconciliation),
    });
    const applying = supabaseMutationReducer(approved, {
      type: "applying",
    });
    const applied = supabaseMutationReducer(applying, { type: "applied" });
    const expectedMigrationName = reconciliation.proposedMigration.name;

    expect(applied.phase).toBe("applied-awaiting-verification");
    expect(
      verifySupabaseMutationResult({
        plan: plan({
          migrations: [
            {
              version: "20260807123456",
              name: expectedMigrationName,
            },
          ],
        }),
        reconciliation: createSupabaseAutopilotReconciliation(
          plan({
            migrations: [
              {
                version: "20260807123456",
                name: expectedMigrationName,
              },
            ],
          }),
        ),
        expectedProjectReference: project.reference,
        expectedMigrationName,
      }).eligible,
    ).toBe(false);
  });

  test("schema match alone and migration-name match alone cannot verify", () => {
    const reconciliation = additiveReconciliation();
    const expectedMigrationName = reconciliation.proposedMigration.name;
    const schemaOnlyPlan = plan({ tables: [featureTable()] });
    const nameOnlyPlan = plan({
      migrations: [
        {
          version: "20260807123456",
          name: expectedMigrationName,
        },
      ],
    });

    expect(
      verifySupabaseMutationResult({
        plan: schemaOnlyPlan,
        reconciliation:
          createSupabaseAutopilotReconciliation(schemaOnlyPlan),
        expectedProjectReference: project.reference,
        expectedMigrationName,
      }).eligible,
    ).toBe(false);
    expect(
      verifySupabaseMutationResult({
        plan: nameOnlyPlan,
        reconciliation:
          createSupabaseAutopilotReconciliation(nameOnlyPlan),
        expectedProjectReference: project.reference,
        expectedMigrationName,
      }).eligible,
    ).toBe(false);
  });

  test("fresh schema plus exactly one managed name verifies under any provider version", () => {
    const reconciliation = additiveReconciliation();
    const expectedMigrationName = reconciliation.proposedMigration.name;
    const freshPlan = plan({
      tables: [featureTable()],
      migrations: [
        {
          version: "20991231235959",
          name: expectedMigrationName,
        },
      ],
    });
    const result = verifySupabaseMutationResult({
      plan: freshPlan,
      reconciliation: createSupabaseAutopilotReconciliation(freshPlan),
      expectedProjectReference: project.reference,
      expectedMigrationName,
    });

    expect(result).toEqual({
      eligible: true,
      reason: "",
      providerVersion: "20991231235959",
    });
  });

  test("duplicate managed-name metadata and incompatible structure fail closed", () => {
    const reconciliation = additiveReconciliation();
    const expectedMigrationName = reconciliation.proposedMigration.name;
    const duplicatePlan = plan({
      tables: [featureTable()],
      migrations: [
        { version: "20260807123456", name: expectedMigrationName },
        { version: "20260807123457", name: expectedMigrationName },
      ],
    });
    const incompatiblePlan = plan({
      tables: [
        featureTable({
          columns: [
            {
              name: "id",
              dataType: "text",
              nullable: false,
              unique: false,
            },
            featureTable().columns[1],
          ],
        }),
      ],
      migrations: [
        { version: "20260807123456", name: expectedMigrationName },
      ],
    });

    expect(
      verifySupabaseMutationResult({
        plan: duplicatePlan,
        reconciliation:
          createSupabaseAutopilotReconciliation(duplicatePlan),
        expectedProjectReference: project.reference,
        expectedMigrationName,
      }).eligible,
    ).toBe(false);
    expect(
      verifySupabaseMutationResult({
        plan: incompatiblePlan,
        reconciliation:
          createSupabaseAutopilotReconciliation(incompatiblePlan),
        expectedProjectReference: project.reference,
        expectedMigrationName,
      }).eligible,
    ).toBe(false);
  });

  test("failed verification is never reported as verified and rejects unsafe state", () => {
    const verificationPending = {
      ...initialSupabaseMutationState,
      phase: "applied-awaiting-verification",
    };
    const verificationFailed = supabaseMutationReducer(
      verificationPending,
      {
        type: "verification_failed",
        error: "schema still missing",
      },
    );
    const unsafe = JSON.parse(JSON.stringify(additiveReconciliation()));
    unsafe.service_role_key = "sb_secret_not_allowed";
    unsafe.rows = [{ private: "data" }];

    expect(verificationFailed.phase).toBe("verification-failed");
    expect(verificationFailed.phase).not.toBe("verified");
    expect(
      getSupabaseMutationEligibility({
        reconciliation: unsafe,
        verifiedProject: project,
      }).eligible,
    ).toBe(false);
    const secretFailure = supabaseMutationReducer(
      { ...initialSupabaseMutationState, phase: "applying" },
      {
        type: "failed",
        error:
          "access_token=must-not-persist sb_secret_abcdefghijkl postgres://user:password@example.test/db",
      },
    );
    expect(secretFailure.error).not.toMatch(
      /must-not-persist|sb_secret_|password@example/,
    );
  });
});
