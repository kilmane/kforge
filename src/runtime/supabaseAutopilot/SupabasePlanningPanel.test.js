import React, { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("../serviceRunner", () => ({
  supabaseAutopilotPlanInspection: jest.fn(),
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

  test("shows loading, a validated plan, details, and no mutation action", async () => {
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
    expect(container.textContent).toMatch(
      /Migration application is unavailable until a later milestone/,
    );
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
    expect(
      findButton("Implementation is not available in this milestone").disabled,
    ).toBe(true);
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
