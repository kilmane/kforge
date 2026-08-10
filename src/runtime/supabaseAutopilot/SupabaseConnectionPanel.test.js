import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";

jest.mock("../serviceRunner", () => ({
  supabaseAutopilotStatus: jest.fn(),
  supabaseAutopilotConnect: jest.fn(),
  supabaseAutopilotDisconnect: jest.fn(),
  supabaseAutopilotSelectProject: jest.fn(),
  supabaseAutopilotPlanInspection: jest.fn(),
  supabaseAutopilotPrepareMigrationApproval: jest.fn(),
  supabaseAutopilotApplyApprovedMigration: jest.fn(),
}));

import {
  supabaseAutopilotPlanInspection,
  supabaseAutopilotSelectProject,
  supabaseAutopilotStatus,
} from "../serviceRunner";
import SupabaseConnectionPanel from "./SupabaseConnectionPanel.jsx";

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

describe("SupabaseConnectionPanel workflow continuation", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    supabaseAutopilotStatus.mockResolvedValue({
      status: "choose_project",
      message: "",
      organizations: [],
      projects: [project],
      project: null,
    });

    supabaseAutopilotSelectProject.mockResolvedValue({
      status: "connected_read_only",
      message: "",
      organizations: [],
      projects: [project],
      project,
    });

    supabaseAutopilotPlanInspection.mockResolvedValue(inspection);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
    jest.clearAllMocks();
  });

  test("auto-starts the queued read-only plan after Use this project verifies the connection", async () => {
    function RealWorkspaceParent() {
      const [workflowRequest, setWorkflowRequest] = useState({
        id: "workspace-request-connection-integration",
        workspace: "services",
        provider: "supabase",
        workflow: "supabase_autopilot",
        mode: "planning_read_only",
        objective: "Add sign-in and save each user's Hajj progress.",
      });

      return (
        <SupabaseConnectionPanel
          projectPath={"D:\\hajj"}
          workflowRequest={workflowRequest}
          onWorkflowRequestHandled={(requestId) => {
            setWorkflowRequest((current) =>
              String(current?.id || "") === String(requestId || "")
                ? null
                : current,
            );
          }}
        />
      );
    }

    await act(async () => {
      root.render(
        <React.StrictMode>
          <RealWorkspaceParent />
        </React.StrictMode>,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toMatch(/Connected to Supabase/i);
    expect(findButton("Use this project")).toBeTruthy();
    expect(supabaseAutopilotPlanInspection).not.toHaveBeenCalled();

    await act(async () => {
      findButton("Use this project").dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(supabaseAutopilotSelectProject).toHaveBeenCalledTimes(1);
    expect(supabaseAutopilotSelectProject).toHaveBeenCalledWith(
      project.reference,
    );
    expect(container.textContent).toMatch(/Connected read-only/i);
    expect(supabaseAutopilotPlanInspection).toHaveBeenCalledTimes(1);
    expect(supabaseAutopilotPlanInspection).toHaveBeenCalledWith(
      project.reference,
      "D:\\hajj",
    );
    expect(
      container.querySelector('[aria-label="Supabase feature objective"]').value,
    ).toBe("Add sign-in and save each user's Hajj progress.");
    expect(
      container.querySelector('[aria-label="Supabase implementation plan"]'),
    ).toBeTruthy();
  });

  function findButton(text) {
    return Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === text,
    );
  }
});