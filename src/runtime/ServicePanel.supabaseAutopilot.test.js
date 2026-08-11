import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";

jest.mock("./previewRunner", () => ({
  previewDetectTemplates: jest.fn(),
}));

jest.mock("./serviceRunner", () => ({
  detectGithubRepo: jest.fn(),
  githubOpenRepo: jest.fn(),
  githubPull: jest.fn(),
  githubPush: jest.fn(),
  openExternalUrl: jest.fn(),
  runServiceSetup: jest.fn(),
  stripeCreateEnvFile: jest.fn(),
  openaiCreateEnvFile: jest.fn(),
  openaiInstallSdk: jest.fn(),
  openaiCreateClientFile: jest.fn(),
  subscribeServiceLogs: jest.fn(),
  subscribeServiceStatus: jest.fn(),
  supabaseCreateClientFile: jest.fn(),
  supabaseCreateEnvFile: jest.fn(),
  supabaseCreateInsertExample: jest.fn(),
  supabaseCreateQueryHelper: jest.fn(),
  supabaseCreateReadExample: jest.fn(),
  supabaseInstallClient: jest.fn(),
  supabaseQuickConnect: jest.fn(),
  openaiCreateExample: jest.fn(),
  supabaseAutopilotStatus: jest.fn(),
  supabaseAutopilotConnect: jest.fn(),
  supabaseAutopilotDisconnect: jest.fn(),
  supabaseAutopilotSelectProject: jest.fn(),
  supabaseAutopilotPlanInspection: jest.fn(),
  supabaseAutopilotPrepareMigrationApproval: jest.fn(),
  supabaseAutopilotApplyApprovedMigration: jest.fn(),
}));

import { previewDetectTemplates } from "./previewRunner";
import {
  detectGithubRepo,
  subscribeServiceLogs,
  subscribeServiceStatus,
  supabaseAutopilotPlanInspection,
  supabaseAutopilotStatus,
} from "./serviceRunner";
import ServicePanel from "./ServicePanel.jsx";

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

beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = jest.fn();
});
describe("ServicePanel Supabase Autopilot workflow handoff", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    previewDetectTemplates.mockResolvedValue(null);
    detectGithubRepo.mockResolvedValue({
      isRepo: false,
      hasRemote: false,
      remoteUrl: "",
    });
    subscribeServiceLogs.mockResolvedValue(() => {});
    subscribeServiceStatus.mockResolvedValue(() => {});

    supabaseAutopilotStatus.mockResolvedValue({
      status: "connected_read_only",
      message: "",
      organizations: [],
      projects: [],
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

  test("switches from the default provider and auto-starts a restored Supabase workflow request", async () => {
    function RealWorkspaceParent() {
      const [workspaceRequest, setWorkspaceRequest] = useState({
        id: "workspace-request-service-panel-integration",
        workspace: "services",
        provider: "supabase",
        workflow: "supabase_autopilot",
        mode: "planning_read_only",
        objective: "Add sign-in and save each user's Hajj progress.",
      });

      return (
        <ServicePanel
          projectPath={"D:\\hajj"}
          workspaceRequest={workspaceRequest}
          onWorkspaceRequestHandled={(requestId) => {
            setWorkspaceRequest((current) =>
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
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

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

  test("auto-starts after Services is unmounted and remounted with persisted Supabase state", async () => {
    await act(async () => {
      root.render(
        <React.StrictMode>
          <ServicePanel
            projectPath={"D:\\hajj"}
            workspaceRequest={null}
          />
        </React.StrictMode>,
      );

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const supabaseButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Supabase"),
    );

    expect(supabaseButton).toBeTruthy();

    await act(async () => {
      supabaseButton.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toMatch(/Connected read-only/i);

    await act(async () => {
      root.unmount();
    });

    container.remove();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    function RemountedWorkspaceParent() {
      const [workspaceRequest, setWorkspaceRequest] = useState({
        id: "workspace-request-remounted-services",
        workspace: "services",
        provider: "supabase",
        workflow: "supabase_autopilot",
        mode: "planning_read_only",
        objective: "Add sign-in and save each user's Hajj progress.",
      });

      return (
        <ServicePanel
          projectPath={"D:\\hajj"}
          workspaceRequest={workspaceRequest}
          onWorkspaceRequestHandled={(requestId) => {
            setWorkspaceRequest((current) =>
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
          <RemountedWorkspaceParent />
        </React.StrictMode>,
      );

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

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
});