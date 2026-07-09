// src/components/project-memory-panel.jsx
import { useState } from "react";
import {
  getProjectMemory,
  setProjectMemory,
  saveProjectMemoryForCurrentRoot,
} from "../lib/fs";

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function previewText(value, expanded, limit = 260) {
  const text = String(value || "").trim();
  if (expanded || text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}…`;
}

function isLongText(value, limit = 260) {
  return String(value || "").trim().length > limit;
}

const inputClass =
  "w-full border border-zinc-800 rounded p-2 mt-1 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500";

const smallButtonClass =
  "px-2 py-0.5 border border-zinc-700 rounded text-xs bg-zinc-900 hover:bg-zinc-800";

const removeButtonClass =
  "shrink-0 px-2 py-0.5 border border-zinc-800 rounded text-xs text-zinc-400 hover:text-red-200 hover:border-red-900 hover:bg-red-950/30";

const cardClass =
  "rounded border border-zinc-800 bg-zinc-900/60 p-2 shadow-sm";

export default function ProjectMemoryPanel() {
  const [memory, setLocalMemory] = useState(() => clone(getProjectMemory()));
  const [anchorText, setAnchorText] = useState("");
  const [decisionText, setDecisionText] = useState("");
  const [workingPath, setWorkingPath] = useState("");
  const [expandedAnchors, setExpandedAnchors] = useState({});
  const [expandedDecisions, setExpandedDecisions] = useState({});

  function sync(next) {
    setLocalMemory(next);
    setProjectMemory(next);

    // Don’t let save errors crash the UI
    Promise.resolve(saveProjectMemoryForCurrentRoot()).catch((err) => {
      console.error("[kforge] saveProjectMemory failed:", err);
    });
  }

  function toggleAnchor(id) {
    setExpandedAnchors((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function toggleDecision(id) {
    setExpandedDecisions((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  // ---- Anchors ----
  function addAnchor() {
    if (!anchorText.trim()) return;
    const next = clone(memory);
    next.anchors.push({
      id: `a_${Date.now()}`,
      content: anchorText.trim(),
    });
    setAnchorText("");
    sync(next);
  }

  function removeAnchor(id) {
    const next = clone(memory);
    next.anchors = next.anchors.filter((a) => a.id !== id);
    sync(next);
  }

  // ---- Decisions ----
  function addDecision() {
    if (!decisionText.trim()) return;
    const next = clone(memory);
    next.decisions.push({
      id: `d_${Date.now()}`,
      status: "proposed",
      text: decisionText.trim(),
      created_at: new Date().toISOString(),
    });
    setDecisionText("");
    sync(next);
  }

  function approveDecision(id) {
    const next = clone(memory);
    const d = next.decisions.find((x) => x.id === id);
    if (d) {
      d.status = "approved";
      d.approved_at = new Date().toISOString();
    }
    sync(next);
  }

  function removeDecision(id) {
    const next = clone(memory);
    next.decisions = next.decisions.filter((d) => d.id !== id);
    sync(next);
  }

  // ---- Working Set ----
  function addWorkingSet() {
    if (!workingPath.trim()) return;
    const next = clone(memory);
    next.working_set.push({
      path: workingPath.trim(),
      added_at: new Date().toISOString(),
    });
    setWorkingPath("");
    sync(next);
  }

  function removeWorkingSet(path) {
    const next = clone(memory);
    next.working_set = next.working_set.filter((w) => w.path !== path);
    sync(next);
  }

  const anchors = Array.isArray(memory.anchors) ? memory.anchors : [];
  const decisions = Array.isArray(memory.decisions) ? memory.decisions : [];
  const workingSet = Array.isArray(memory.working_set)
    ? memory.working_set
    : [];

  return (
    <div className="h-full min-h-0 overflow-y-auto p-3 text-sm space-y-5 border-t border-zinc-800 bg-zinc-950">
      <div>
        <h3 className="font-semibold">Project Memory</h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          Project notes that KForge can include as context during AI-assisted work.
        </p>
      </div>

      {/* Anchors */}
      <section>
        <div className="font-medium">Anchors</div>
        <textarea
          className={inputClass}
          rows={3}
          value={anchorText}
          onChange={(e) => setAnchorText(e.target.value)}
          placeholder="Pin important context…"
        />
        <button className={`mt-1 ${smallButtonClass}`} onClick={addAnchor}>
          Add anchor
        </button>

        <div className="mt-3 space-y-2">
          {anchors.length === 0 ? (
            <div className="rounded border border-dashed border-zinc-800 p-2 text-xs text-zinc-500">
              No anchors yet.
            </div>
          ) : (
            anchors.map((a) => {
              const expanded = !!expandedAnchors[a.id];
              const long = isLongText(a.content);

              return (
                <div key={a.id} className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="whitespace-pre-wrap break-words leading-relaxed text-zinc-100">
                        {previewText(a.content, expanded)}
                      </div>

                      {long ? (
                        <button
                          className="mt-2 text-xs text-emerald-300 hover:text-emerald-200"
                          onClick={() => toggleAnchor(a.id)}
                        >
                          {expanded ? "Show less" : "Show more"}
                        </button>
                      ) : null}
                    </div>

                    <button
                      className={removeButtonClass}
                      onClick={() => removeAnchor(a.id)}
                      title="Remove anchor"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Decisions */}
      <section>
        <div className="font-medium">Decisions</div>
        <textarea
          className={inputClass}
          rows={2}
          value={decisionText}
          onChange={(e) => setDecisionText(e.target.value)}
          placeholder="Architectural decision…"
        />
        <button
          className={`mt-1 ${smallButtonClass}`}
          onClick={addDecision}
        >
          Propose
        </button>

        <div className="mt-3 space-y-2">
          {decisions.length === 0 ? (
            <div className="rounded border border-dashed border-zinc-800 p-2 text-xs text-zinc-500">
              No decisions yet.
            </div>
          ) : (
            decisions.map((d) => {
              const expanded = !!expandedDecisions[d.id];
              const long = isLongText(d.text);

              return (
                <div key={d.id} className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
                        {d.status}
                      </div>

                      <div className="whitespace-pre-wrap break-words leading-relaxed text-zinc-100">
                        {previewText(d.text, expanded)}
                      </div>

                      {long ? (
                        <button
                          className="mt-2 text-xs text-emerald-300 hover:text-emerald-200"
                          onClick={() => toggleDecision(d.id)}
                        >
                          {expanded ? "Show less" : "Show more"}
                        </button>
                      ) : null}
                    </div>

                    <div className="shrink-0 space-x-1">
                      {d.status !== "approved" && (
                        <button
                          className={smallButtonClass}
                          onClick={() => approveDecision(d.id)}
                          title="Approve decision"
                        >
                          ✔
                        </button>
                      )}
                      <button
                        className={removeButtonClass}
                        onClick={() => removeDecision(d.id)}
                        title="Remove decision"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Working Set */}
      <section>
        <div className="font-medium">Working Set</div>
        <input
          className={inputClass}
          value={workingPath}
          onChange={(e) => setWorkingPath(e.target.value)}
          placeholder="src/components/foo.jsx"
        />
        <button
          className={`mt-1 ${smallButtonClass}`}
          onClick={addWorkingSet}
        >
          Add file
        </button>

        <div className="mt-3 space-y-2">
          {workingSet.length === 0 ? (
            <div className="rounded border border-dashed border-zinc-800 p-2 text-xs text-zinc-500">
              No working-set files yet.
            </div>
          ) : (
            workingSet.map((w) => (
              <div key={w.path} className={cardClass}>
                <div className="flex items-start justify-between gap-3">
                  <code className="min-w-0 break-all text-xs text-emerald-200">
                    {w.path}
                  </code>
                  <button
                    className={removeButtonClass}
                    onClick={() => removeWorkingSet(w.path)}
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
