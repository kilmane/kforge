import { TextEncoder } from "util";
import { getProjectRoot, openFile, resolvePathWithinProject } from "../../../lib/fs";
import { preflightToolHandler } from "./index";

jest.mock("../../../lib/fs", () => ({
  getProjectRoot: jest.fn(),
  makeDir: jest.fn(),
  openFile: jest.fn(),
  readFolderTree: jest.fn(),
  resolvePathWithinProject: jest.fn(),
  saveFile: jest.fn(),
}));

globalThis.TextEncoder = globalThis.TextEncoder || TextEncoder;

const existingInteractiveComponent = `
import { useState } from "react";

export default function PlannerApp() {
  const [firstItems, setFirstItems] = useState([]);
  const [secondItems, setSecondItems] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [people, setPeople] = useState([]);
  const [personDraft, setPersonDraft] = useState({ name: "", phone: "" });
  const [viewMode, setViewMode] = useState("all");

  function toggleFirstItem(id) {
    setFirstItems(firstItems.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  }

  function toggleSecondItem(id) {
    setSecondItems(secondItems.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  }

  const updateNoteText = (event) => {
    setNoteText(event.target.value);
  };

  const updatePersonDraft = (event) => {
    setPersonDraft({ ...personDraft, [event.target.name]: event.target.value });
  };

  const submitPersonDraft = (event) => {
    event.preventDefault();
    setPeople([...people, personDraft]);
    setPersonDraft({ name: "", phone: "" });
  };

  const resetWorkspace = () => {
    setFirstItems([]);
    setSecondItems([]);
    setNoteText("");
    setPeople([]);
    setViewMode("all");
  };

  return (
    <main className="app-shell planning-shell">
      <header className="app-header calm-header">
        <div className="title-block">
          <h1 className="app-title">Planner</h1>
          <p className="app-subtitle">Private planning space</p>
        </div>
        <button className="reset-button secondary-action" onClick={resetWorkspace}>Reset</button>
      </header>

      <section className="checklist-panel first-panel">
        {firstItems.map((item) => (
          <label className="check-row first-row" key={item.id}>
            <input type="checkbox" name="first" checked={item.done} onChange={() => toggleFirstItem(item.id)} />
            <span className="check-label">{item.label}</span>
          </label>
        ))}
      </section>

      <section className="checklist-panel second-panel">
        {secondItems.map((item) => (
          <label className="check-row second-row" key={item.id}>
            <input type="checkbox" name="second" checked={item.done} onChange={() => toggleSecondItem(item.id)} />
            <span className="check-label">{item.label}</span>
          </label>
        ))}
      </section>

      <section className="notes-panel">
        <textarea className="notes-input" name="notes" value={noteText} onChange={updateNoteText} />
        <select className="filter-select" name="filter" value={viewMode} onChange={(event) => setViewMode(event.target.value)}>
          <option value="all">All</option>
          <option value="open">Open</option>
        </select>
      </section>

      <form className="contact-form people-form" onSubmit={submitPersonDraft}>
        <input className="contact-input" type="text" name="name" value={personDraft.name} onChange={updatePersonDraft} />
        <input className="contact-input" type="tel" name="phone" value={personDraft.phone} onChange={updatePersonDraft} />
        <button className="add-button primary-action" type="submit">Add</button>
      </form>
    </main>
  );
}
`;

const destructiveReplacement = `
import { useState } from "react";

const staticStages = [
  "Review the plan",
  "Move through each stage",
  "Complete the milestone",
];

export default function PlannerApp() {
  const [selectedStage, setSelectedStage] = useState(0);

  return (
    <main className="guide-page serene-layout">
      <header className="guide-hero">
        <p className="guide-eyebrow">Companion</p>
        <h1 className="guide-title">Planner</h1>
        <p className="guide-copy">A quiet overview for each stage with simple reminders and separate completion.</p>
      </header>
      <section className="stage-navigation">
        {staticStages.map((stage, index) => (
          <button
            className={\`stage-pill \${selectedStage === index ? "active-stage" : ""}\`}
            key={stage}
            onClick={() => setSelectedStage(index)}
          >
            {stage}
          </button>
        ))}
      </section>
      <section className="guidance-card">
        <h2 className="guidance-title">{staticStages[selectedStage]}</h2>
        <p className="guidance-text">Read the guidance, mark the stage complete, and continue when ready.</p>
      </section>
      <section className="completion-card">
        <button className="complete-button">Mark complete</button>
      </section>
    </main>
  );
}
`.padEnd(
  existingInteractiveComponent.length + 30,
  "\n// filler text that keeps the replacement close to the original size",
);

const additiveReplacement = existingInteractiveComponent.replace(
  "</main>",
  `
      <aside className="new-guidance-panel">
        <button className="new-guidance-button" type="button" onClick={resetWorkspace}>Review plan</button>
      </aside>
    </main>`,
);

const viteStarter = `
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
`;

function setupExistingFile(content) {
  getProjectRoot.mockReturnValue("D:/workspace/project");
  resolvePathWithinProject.mockImplementation((path) =>
    String(path || "").startsWith("D:/")
      ? String(path)
      : `D:/workspace/project/${String(path || "").replace(/\\/g, "/")}`,
  );
  openFile.mockResolvedValue(content);
}

beforeEach(() => {
  jest.clearAllMocks();
  setupExistingFile(existingInteractiveComponent);
});

test("preflight rejects a similar-size replacement that removes several interactive capabilities", async () => {
  const result = await preflightToolHandler("write_file", {
    path: "src/App.jsx",
    content: destructiveReplacement,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/remove several existing app capabilities/i);
});

test("preflight allows an additive replacement preserving existing structures", async () => {
  const result = await preflightToolHandler("write_file", {
    path: "src/App.jsx",
    content: additiveReplacement,
  });

  expect(result.ok).toBe(true);
});

test("preflight does not apply the preservation gate to recognised Vite React starter content", async () => {
  setupExistingFile(viteStarter);

  const result = await preflightToolHandler("write_file", {
    path: "src/App.jsx",
    content: destructiveReplacement,
  });

  expect(result.ok).toBe(true);
});

test("preflight leaves non-write tools unaffected", async () => {
  const result = await preflightToolHandler("read_file", {
    path: "src/App.jsx",
  });

  expect(result).toEqual({
    ok: true,
    toolName: "read_file",
    args: { path: "src/App.jsx" },
  });
  expect(openFile).not.toHaveBeenCalled();
});
