import React, { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("../serviceRunner", () => ({
  supabaseAutopilotPlanInspection: jest.fn(),
  supabaseAutopilotPrepareMigrationApproval: jest.fn(),
  supabaseAutopilotApplyApprovedMigration: jest.fn(),
}));

import SupabasePlanningPanel from "./SupabasePlanningPanel.jsx";

const project = {
  name: "Hajj Development",
  reference: "abcdefghijklmnopqrst",
};

const inspection = {
  local: {
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

describe("SupabasePlanningPanel", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
    jest.restoreAllMocks();
  });

  test("cannot start until a verified read-only project exists", () => {
    const inspectPlanning = jest.fn();
    act(() => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={null}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
        />,
      );
    });

    const button = findButton("Create read-only plan");
    expect(button.disabled).toBe(true);
    expect(container.textContent).toMatch(/Connect and verify/i);
    expect(inspectPlanning).not.toHaveBeenCalled();
  });

  test("starts an external read-only planning request once after the project is verified", async () => {
    const inspectPlanning = jest.fn().mockResolvedValue(inspection);
    const onWorkflowRequestHandled = jest.fn();
    const workflowRequest = {
      id: "workspace-request-test-1",
      workflow: "supabase_autopilot",
      mode: "planning_read_only",
      objective: "Add sign-in and save each user's Hajj progress.",
    };

    act(() => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={null}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
          workflowRequest={workflowRequest}
          onWorkflowRequestHandled={onWorkflowRequestHandled}
        />,
      );
    });

    expect(inspectPlanning).not.toHaveBeenCalled();
    expect(onWorkflowRequestHandled).not.toHaveBeenCalled();

    await act(async () => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={project}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
          workflowRequest={workflowRequest}
          onWorkflowRequestHandled={onWorkflowRequestHandled}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(inspectPlanning).toHaveBeenCalledTimes(1);
    expect(inspectPlanning).toHaveBeenCalledWith(
      project.reference,
      "D:\\hajj",
    );
    expect(onWorkflowRequestHandled).toHaveBeenCalledTimes(1);
    expect(onWorkflowRequestHandled).toHaveBeenCalledWith(
      workflowRequest.id,
    );
    expect(
      container.querySelector('[aria-label="Supabase feature objective"]').value,
    ).toBe(workflowRequest.objective);
    expect(
      container.querySelector('[aria-label="Supabase implementation plan"]'),
    ).toBeTruthy();

    await act(async () => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={project}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
          workflowRequest={workflowRequest}
          onWorkflowRequestHandled={onWorkflowRequestHandled}
        />,
      );
      await Promise.resolve();
    });

    expect(inspectPlanning).toHaveBeenCalledTimes(1);
    expect(onWorkflowRequestHandled).toHaveBeenCalledTimes(1);
  });

  test("shows loading, a validated plan, and keeps ineligible planning read-only", async () => {
    let resolveInspection;
    const inspectPlanning = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveInspection = resolve;
        }),
    );
    act(() => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={project}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
        />,
      );
    });
    setObjective("Add sign-in and save each user's Hajj progress.");

    await act(async () => {
      findButton("Create read-only plan").dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });
    expect(container.textContent).toMatch(/Inspecting read-only/);
    expect(inspectPlanning).toHaveBeenCalledWith(
      "abcdefghijklmnopqrst",
      "D:\\hajj",
    );

    await act(async () => {
      resolveInspection(inspection);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      container.querySelector('[aria-label="Supabase implementation plan"]'),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '[aria-label="Migration reconciliation planning only"]',
      ),
    ).toBeTruthy();
    expect(container.textContent).toMatch(/No database or application changes were made/);
    expect(container.textContent).toMatch(/SQL has not been executed/);
    expect(container.textContent).toMatch(/Review-only SQL draft/);
    expect(container.textContent).toMatch(/Managed migration name/);
    expect(container.textContent).toMatch(/Mutation unavailable/i);
    expect(container.textContent).toMatch(/Technical details/);
    expect(container.textContent).toMatch(/Plan ID/);
    expect(container.textContent).not.toMatch(/\bApprove\b/);
    expect(container.textContent).not.toMatch(/\bApply\b/);
    expect(container.textContent).not.toMatch(/Run migration/);
    expect(
      Array.from(container.querySelectorAll("button")).map(
        (button) => button.textContent,
      ),
    ).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\b(?:apply|run|execute)\b/i),
      ]),
    );
  });

  test("requires exact approval and invokes mutation at most once", async () => {
    const inspectPlanning = jest.fn().mockResolvedValue(inspection);
    const prepareMigrationApproval = jest.fn((request) => ({
      approvalToken: "approval-1-1111111122222222",
      projectReference: project.reference,
      migrationName: request.reconciliation.proposedMigration.name,
      reconciliationFingerprint: request.reconciliation.fingerprint,
    }));
    let rejectApply;
    const applyApprovedMigration = jest.fn(
      () =>
        new Promise((resolve, reject) => {
          rejectApply = reject;
        }),
    );
    act(() => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={project}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
          prepareMigrationApproval={prepareMigrationApproval}
          applyApprovedMigration={applyApprovedMigration}
        />,
      );
    });
    setObjective("Add a notes table.");
    await clickButton("Create read-only plan");

    expect(findButton("Approve this exact migration").disabled).toBe(true);
    act(() => {
      container
        .querySelector(
          '[aria-label="Confirm development-only Supabase project"]',
        )
        .click();
    });
    await clickButton("Approve this exact migration");
    expect(prepareMigrationApproval).toHaveBeenCalledTimes(1);
    expect(prepareMigrationApproval.mock.calls[0][0]).not.toHaveProperty(
      "sql",
    );

    await act(async () => {
      const apply = findButton("Apply approved migration");
      apply.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      apply.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });
    expect(applyApprovedMigration).toHaveBeenCalledTimes(1);
    expect(applyApprovedMigration).toHaveBeenCalledWith(
      "approval-1-1111111122222222",
    );

    await act(async () => {
      rejectApply(new Error("provider rejected request"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.textContent).toMatch(/Database state may be uncertain/i);
    expect(findButton("Apply approved migration")).toBeUndefined();
    expect(applyApprovedMigration).toHaveBeenCalledTimes(1);
  });

  test("uses fresh read-only inspection and verifies name plus structure", async () => {
    let managedMigrationName = "";
    const inspectPlanning = jest
      .fn()
      .mockResolvedValueOnce(inspection)
      .mockImplementationOnce(() => ({
        ...inspection,
        remote: {
          ...inspection.remote,
          tables: [
            {
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
            },
          ],
          migrations: [
            {
              version: "20991231235959",
              name: managedMigrationName,
            },
          ],
        },
      }));
    const prepareMigrationApproval = jest.fn((request) => {
      managedMigrationName =
        request.reconciliation.proposedMigration.name;
      return {
        approvalToken: "approval-2-3333333344444444",
        projectReference: project.reference,
        migrationName: managedMigrationName,
        reconciliationFingerprint: request.reconciliation.fingerprint,
      };
    });
    const applyApprovedMigration = jest.fn().mockResolvedValue({
      status: "applied-awaiting-verification",
    });
    act(() => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={project}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
          prepareMigrationApproval={prepareMigrationApproval}
          applyApprovedMigration={applyApprovedMigration}
          onStartAppWiring={jest.fn()}
        />,
      );
    });
    setObjective("Add a notes table.");
    await clickButton("Create read-only plan");
    act(() => {
      container
        .querySelector(
          '[aria-label="Confirm development-only Supabase project"]',
        )
        .click();
    });
    await clickButton("Approve this exact migration");
    expect(findButton("Start controlled app wiring")).toBeUndefined();
    await clickButton("Apply approved migration");

    expect(inspectPlanning).toHaveBeenCalledTimes(2);
    expect(container.textContent).toMatch(
      /Verified by fresh read-only migration metadata/i,
    );
    expect(container.textContent).toMatch(
      /Supabase-assigned version 20991231235959/i,
    );
    expect(findButton("Start controlled app wiring")).toBeTruthy();
    expect(applyApprovedMigration).toHaveBeenCalledTimes(1);
  });

  test("project switch invalidates a prepared approval", async () => {
    const inspectPlanning = jest.fn().mockResolvedValue(inspection);
    const prepareMigrationApproval = jest.fn((request) => ({
      approvalToken: "approval-3-5555555566666666",
      projectReference: project.reference,
      migrationName: request.reconciliation.proposedMigration.name,
      reconciliationFingerprint: request.reconciliation.fingerprint,
    }));
    act(() => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={project}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
          prepareMigrationApproval={prepareMigrationApproval}
        />,
      );
    });
    setObjective("Add a notes table.");
    await clickButton("Create read-only plan");
    act(() => {
      container
        .querySelector(
          '[aria-label="Confirm development-only Supabase project"]',
        )
        .click();
    });
    await clickButton("Approve this exact migration");
    expect(findButton("Apply approved migration")).toBeTruthy();

    await act(async () => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={{
            name: "Other Development",
            reference: "zyxwvutsrqponmlkjihg",
          }}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
          prepareMigrationApproval={prepareMigrationApproval}
        />,
      );
      await Promise.resolve();
    });

    expect(findButton("Apply approved migration")).toBeUndefined();
    expect(
      container.querySelector('[aria-label="Supabase implementation plan"]'),
    ).toBeNull();
  });

  test("shows a bounded safe error and no stale plan", async () => {
    const inspectPlanning = jest
      .fn()
      .mockRejectedValue(new Error(`Remote failed\n${"x".repeat(900)}`));
    act(() => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={project}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
        />,
      );
    });
    setObjective("Add a notes table.");

    await act(async () => {
      findButton("Create read-only plan").dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]').textContent).toHaveLength(
      700,
    );
    expect(
      container.querySelector('[aria-label="Supabase implementation plan"]'),
    ).toBeNull();
  });

  test("clears stale reconciliation when the objective or project changes", async () => {
    const inspectPlanning = jest.fn().mockResolvedValue(inspection);
    act(() => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={project}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
        />,
      );
    });
    setObjective("Add a notes table.");

    await act(async () => {
      findButton("Create read-only plan").dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(
      container.querySelector(
        '[aria-label="Migration reconciliation planning only"]',
      ),
    ).toBeTruthy();

    setObjective("Add a different notes table.");
    expect(
      container.querySelector(
        '[aria-label="Migration reconciliation planning only"]',
      ),
    ).toBeNull();

    await act(async () => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={null}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
        />,
      );
      await Promise.resolve();
    });
    expect(
      container.querySelector('[aria-label="Supabase implementation plan"]'),
    ).toBeNull();
  });

  test("ignores a late inspection result after the selected project changes", async () => {
    let resolveInspection;
    const inspectPlanning = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveInspection = resolve;
        }),
    );
    act(() => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={project}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
        />,
      );
    });
    setObjective("Add a notes table.");
    await act(async () => {
      findButton("Create read-only plan").dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    await act(async () => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={{
            name: "Other Development",
            reference: "zyxwvutsrqponmlkjihg",
          }}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
        />,
      );
      await Promise.resolve();
      resolveInspection(inspection);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      container.querySelector('[aria-label="Supabase implementation plan"]'),
    ).toBeNull();
  });

  test("rejects malformed reconciliation output rather than rendering it", async () => {
    const inspectPlanning = jest.fn().mockResolvedValue(inspection);
    const reconcilePlan = jest.fn(() => ({
      canApply: true,
      executionStatus: "applied",
    }));
    act(() => {
      root.render(
        <SupabasePlanningPanel
          verifiedProject={project}
          projectPath={"D:\\hajj"}
          inspectPlanning={inspectPlanning}
          reconcilePlan={reconcilePlan}
        />,
      );
    });
    setObjective("Add a notes table.");

    await act(async () => {
      findButton("Create read-only plan").dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]').textContent).toMatch(
      /Reconciliation validation failed/i,
    );
    expect(
      container.querySelector(
        '[aria-label="Migration reconciliation planning only"]',
      ),
    ).toBeNull();
  });

  function findButton(text) {
    return Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === text,
    );
  }

  async function clickButton(text) {
    await act(async () => {
      findButton(text).dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  function setObjective(value) {
    const textarea = container.querySelector("textarea");
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      ).set;
      setter.call(textarea, value);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
});
