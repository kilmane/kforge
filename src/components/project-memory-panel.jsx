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

export default function ProjectMemoryPanel() {
  const [memory, setLocalMemory] = useState(() => clone(getProjectMemory()));
  const [anchorText, setAnchorText] = useState("");
  const [decisionText, setDecisionText] = useState("");
  const [workingPath, setWorkingPath] = useState("");

  function sync(next) {
    setLocalMemory(next);
    setProjectMemory(next);

    // Don’t let save errors crash the UI
    Promise.resolve(saveProjectMemoryForCurrentRoot()).catch((err) => {
      console.error("[kforge] saveProjectMemory failed:", err);
    });
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

  return (
    <div className="p-2 text-sm space-y-4 border-t">
      <h3 className="font-semibold">Project Memory</h3>

      {/* Anchors */}
      <section>
        <div className="font-medium">Anchors</div>
        <textarea
          className="w-full border border-zinc-800 rounded p-2 mt-1 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
          rows={2}
          value={anchorText}
          onChange={(e) => setAnchorText(e.target.value)}
          placeholder="Pin important context…"
        />
        <button className="mt-1 px-2 py-0.5 border rounded" onClick={addAnchor}>
          Add anchor
        </button>

        <ul className="mt-2 space-y-1">
          {memory.anchors.map((a) => (
            <li key={a.id} className="flex justify-between gap-2">
              <span className="truncate">{a.content}</span>
              <button onClick={() => removeAnchor(a.id)}>✕</button>
            </li>
          ))}
        </ul>
      </section>

      {/* Decisions */}
      <section>
        <div className="font-medium">Decisions</div>
        <input
          className="w-full border border-zinc-800 rounded p-2 mt-1 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
          value={decisionText}
          onChange={(e) => setDecisionText(e.target.value)}
          placeholder="Architectural decision…"
        />
        <button
          className="mt-1 px-2 py-0.5 border rounded"
          onClick={addDecision}
        >
          Propose
        </button>

        <ul className="mt-2 space-y-1">
          {memory.decisions.map((d) => (
            <li key={d.id} className="flex justify-between gap-2">
              <span>
                [{d.status}] {d.text}
              </span>
              <span className="space-x-1">
                {d.status !== "approved" && (
                  <button onClick={() => approveDecision(d.id)}>✔</button>
                )}
                <button onClick={() => removeDecision(d.id)}>✕</button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Working Set */}
      <section>
        <div className="font-medium">Working Set</div>
        <input
          className="w-full border border-zinc-800 rounded p-2 mt-1 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
          value={workingPath}
          onChange={(e) => setWorkingPath(e.target.value)}
          placeholder="src/components/foo.jsx"
        />
        <button
          className="mt-1 px-2 py-0.5 border rounded"
          onClick={addWorkingSet}
        >
          Add file
        </button>

        <ul className="mt-2 space-y-1">
          {memory.working_set.map((w) => (
            <li key={w.path} className="flex justify-between gap-2">
              <span>{w.path}</span>
              <button onClick={() => removeWorkingSet(w.path)}>✕</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
