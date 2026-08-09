import React, { useEffect, useReducer } from "react";
import {
  supabaseAutopilotConnect,
  supabaseAutopilotDisconnect,
  supabaseAutopilotSelectProject,
  supabaseAutopilotStatus,
} from "../serviceRunner";
import {
  initialSupabaseConnectionState,
  supabaseConnectionReducer,
} from "./connectionState";
import SupabasePlanningPanel from "./SupabasePlanningPanel";

const actionStyle = {
  border: "1px solid rgba(244, 185, 66, 0.45)",
  background: "rgba(244, 185, 66, 0.12)",
  color: "#fde68a",
  borderRadius: "7px",
  padding: "7px 11px",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryActionStyle = {
  ...actionStyle,
  border: "1px solid #3f3f46",
  background: "rgba(24, 24, 27, 0.35)",
  color: "#d4d4d8",
};

export default function SupabaseConnectionPanel({ projectPath, onStartAppWiring }) {
  const [state, dispatch] = useReducer(
    supabaseConnectionReducer,
    initialSupabaseConnectionState,
  );
  const isBusy = ["checking", "connecting", "selecting", "disconnecting"].includes(
    state.phase,
  );

  useEffect(() => {
    let active = true;
    supabaseAutopilotStatus()
      .then((snapshot) => {
        if (active) dispatch({ type: "snapshot", snapshot });
      })
      .catch((error) => {
        if (active) dispatch({ type: "error", error });
      });
    return () => {
      active = false;
    };
  }, []);

  async function connect() {
    dispatch({ type: "begin", phase: "connecting" });
    try {
      dispatch({ type: "snapshot", snapshot: await supabaseAutopilotConnect() });
    } catch (error) {
      dispatch({ type: "error", error });
    }
  }

  async function selectProject() {
    if (!state.selectedProjectRef) return;
    dispatch({ type: "begin", phase: "selecting" });
    try {
      dispatch({
        type: "snapshot",
        snapshot: await supabaseAutopilotSelectProject(
          state.selectedProjectRef,
        ),
      });
    } catch (error) {
      dispatch({ type: "error", error });
    }
  }

  async function disconnect() {
    dispatch({ type: "begin", phase: "disconnecting" });
    try {
      dispatch({
        type: "snapshot",
        snapshot: await supabaseAutopilotDisconnect(),
      });
    } catch (error) {
      dispatch({ type: "error", error });
    }
  }

  const snapshot = state.snapshot;
  const project = snapshot?.project;

  return (
    <section
      aria-label="Supabase Autopilot connection"
      style={{
        display: "grid",
        gap: "10px",
        padding: "12px",
        border: "1px solid rgba(244, 185, 66, 0.28)",
        borderRadius: "9px",
        background: "rgba(39, 39, 42, 0.42)",
        color: "#e4e4e7",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 800 }}>
        Supabase Autopilot connection
      </div>

      {state.phase === "checking" ? (
        <div style={{ color: "#a1a1aa", fontSize: "12px" }}>
          Checking secure connection…
        </div>
      ) : null}

      {state.phase === "disconnected" ? (
        <>
          <div style={{ fontSize: "13px" }}>Not connected</div>
          <button
            type="button"
            style={actionStyle}
            onClick={connect}
            disabled={isBusy}
          >
            Connect Supabase
          </button>
        </>
      ) : null}

      {state.phase === "connecting" ? (
        <div style={{ color: "#a1a1aa", fontSize: "12px" }}>
          Opening Supabase authorization in your browser…
        </div>
      ) : null}

      {state.phase === "choose_project" ? (
        <>
          <div style={{ fontSize: "13px", fontWeight: 700 }}>
            Connected to Supabase
          </div>
          <label style={{ display: "grid", gap: "5px", fontSize: "12px" }}>
            <span>Choose a development project:</span>
            <select
              value={state.selectedProjectRef}
              onChange={(event) =>
                dispatch({
                  type: "select_project",
                  projectRef: event.target.value,
                })
              }
              disabled={isBusy || !snapshot?.projects?.length}
              style={{
                background: "#ffffff",
                color: "#000000",
                borderRadius: "6px",
                padding: "7px 9px",
              }}
            >
              {snapshot?.projects?.map((item) => (
                <option key={item.reference} value={item.reference}>
                  {item.name} ({item.reference})
                </option>
              ))}
            </select>
          </label>
          {!snapshot?.projects?.length ? (
            <div style={{ color: "#fca5a5", fontSize: "12px" }}>
              No Supabase projects were available for this authorization.
            </div>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button
              type="button"
              style={actionStyle}
              onClick={selectProject}
              disabled={isBusy || !state.selectedProjectRef}
            >
              Use this project
            </button>
            <button
              type="button"
              style={secondaryActionStyle}
              onClick={disconnect}
              disabled={isBusy}
            >
              Disconnect
            </button>
          </div>
        </>
      ) : null}

      {state.phase === "selecting" ? (
        <div style={{ color: "#a1a1aa", fontSize: "12px" }}>
          Verifying the project-scoped read-only connection…
        </div>
      ) : null}

      {state.phase === "connected_read_only" && project ? (
        <>
          <div style={{ color: "#86efac", fontSize: "13px", fontWeight: 800 }}>
            Connected read-only
          </div>
          <div style={{ display: "grid", gap: "3px", fontSize: "12px" }}>
            <div>Project: {project.name}</div>
            <div>Reference: {project.reference}</div>
          </div>
          <div style={{ color: "#a7f3d0", fontSize: "12px" }}>
            Read-only inspection connection verified.
          </div>
          <button
            type="button"
            style={secondaryActionStyle}
            onClick={disconnect}
            disabled={isBusy}
          >
            Disconnect
          </button>
        </>
      ) : null}

      {state.phase === "reconnect_required" ? (
        <>
          <div style={{ color: "#fca5a5", fontSize: "12px" }}>
            {snapshot?.message || "Supabase needs to be reconnected."}
          </div>
          <button
            type="button"
            style={secondaryActionStyle}
            onClick={disconnect}
            disabled={isBusy}
          >
            Disconnect
          </button>
        </>
      ) : null}

      {state.phase === "error" ? (
        <>
          <div role="alert" style={{ color: "#fca5a5", fontSize: "12px" }}>
            {state.error}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button
              type="button"
              style={actionStyle}
              onClick={connect}
              disabled={isBusy}
            >
              Reconnect
            </button>
            <button
              type="button"
              style={secondaryActionStyle}
              onClick={disconnect}
              disabled={isBusy}
            >
              Disconnect
            </button>
          </div>
        </>
      ) : null}

      {state.phase === "disconnecting" ? (
        <div style={{ color: "#a1a1aa", fontSize: "12px" }}>
          Removing stored Supabase credentials…
        </div>
      ) : null}

      <div style={{ color: "#a1a1aa", fontSize: "11px", lineHeight: 1.45 }}>
        This planning milestone does not modify the database or application.
      </div>

      <SupabasePlanningPanel
        key={`${project?.reference || "unverified"}:${projectPath || ""}`}
        verifiedProject={
          state.phase === "connected_read_only" ? project : null
        }
        projectPath={projectPath}
        onStartAppWiring={onStartAppWiring}
      />
    </section>
  );
}
