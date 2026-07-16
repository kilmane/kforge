import {
  collectInteractivePreservationSignals,
  shouldBlockInteractiveCapabilityLoss,
} from "./writePreservationGuard";

const existingComponent = `
import { useState } from "react";

export default function JourneyApp() {
  const [prepItems, setPrepItems] = useState([]);
  const [packingItems, setPackingItems] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [contacts, setContacts] = useState([]);
  const [contactDraft, setContactDraft] = useState({ name: "", phone: "" });
  const [filter, setFilter] = useState("all");

  function handlePrepToggle(id) {
    setPrepItems(prepItems.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  }

  function handlePackingToggle(id) {
    setPackingItems(packingItems.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  }

  const handleNoteChange = (event) => {
    setNoteText(event.target.value);
  };

  const handleContactChange = (event) => {
    setContactDraft({ ...contactDraft, [event.target.name]: event.target.value });
  };

  const handleContactSubmit = (event) => {
    event.preventDefault();
    setContacts([...contacts, contactDraft]);
    setContactDraft({ name: "", phone: "" });
  };

  const handleResetAll = () => {
    setPrepItems([]);
    setPackingItems([]);
    setNoteText("");
    setContacts([]);
    setFilter("all");
  };

  return (
    <main className="app-shell journey-shell">
      <header className="app-header calm-header">
        <div className="title-block">
          <h1 className="app-title">Journey companion</h1>
          <p className="app-subtitle">Private planning space</p>
        </div>
        <button className="reset-button secondary-action" onClick={handleResetAll}>Reset</button>
      </header>

      <section className="checklist-panel preparation-panel">
        {prepItems.map((item) => (
          <label className="check-row prep-row" key={item.id}>
            <input type="checkbox" name="prep" checked={item.done} onChange={() => handlePrepToggle(item.id)} />
            <span className="check-label">{item.label}</span>
          </label>
        ))}
      </section>

      <section className="checklist-panel packing-panel">
        {packingItems.map((item) => (
          <label className="check-row packing-row" key={item.id}>
            <input type="checkbox" name="packing" checked={item.done} onChange={() => handlePackingToggle(item.id)} />
            <span className="check-label">{item.label}</span>
          </label>
        ))}
      </section>

      <section className="notes-panel">
        <textarea className="notes-input" name="notes" value={noteText} onChange={handleNoteChange} />
        <select className="filter-select" name="filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All</option>
          <option value="open">Open</option>
        </select>
      </section>

      <form className="contact-form emergency-form" onSubmit={handleContactSubmit}>
        <input className="contact-input" type="text" name="name" value={contactDraft.name} onChange={handleContactChange} />
        <input className="contact-input" type="tel" name="phone" value={contactDraft.phone} onChange={handleContactChange} />
        <button className="add-button primary-action" type="submit">Add</button>
      </form>
    </main>
  );
}
`;

const destructiveReplacement = `
import { useState } from "react";

const staticStages = [
  "Arrive with patience and clarity",
  "Move through each stage with calm",
  "Reflect after each milestone",
];

export default function JourneyApp() {
  const [selectedStage, setSelectedStage] = useState(0);

  return (
    <main className="guide-page serene-layout">
      <header className="guide-hero">
        <p className="guide-eyebrow">Companion</p>
        <h1 className="guide-title">Ritual journey</h1>
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
`.padEnd(existingComponent.length + 40, "\n// calm filler text to keep replacement length similar");

const additiveEdit = existingComponent.replace(
  "</main>",
  `
      <aside className="new-guidance-panel">
        <button className="new-guidance-button" type="button" onClick={handleResetAll}>Review plan</button>
      </aside>
    </main>`,
);

function replaceAllText(text, replacements) {
  return replacements.reduce(
    (nextText, [from, to]) => nextText.split(from).join(to),
    text,
  );
}

const renamedRefactor = replaceAllText(existingComponent, [
  ["prepItems", "firstList"],
  ["setPrepItems", "setFirstList"],
  ["packingItems", "secondList"],
  ["setPackingItems", "setSecondList"],
  ["noteText", "memoText"],
  ["setNoteText", "setMemoText"],
  ["contacts", "people"],
  ["setContacts", "setPeople"],
  ["contactDraft", "personDraft"],
  ["setContactDraft", "setPersonDraft"],
  ["filter", "viewMode"],
  ["setFilter", "setViewMode"],
  ["handlePrepToggle", "toggleFirstRow"],
  ["handlePackingToggle", "toggleSecondRow"],
  ["handleNoteChange", "updateMemoText"],
  ["handleContactChange", "updatePersonDraft"],
  ["handleContactSubmit", "submitPersonDraft"],
  ["handleResetAll", "resetWorkspace"],
]);

const inlineCallbackRefactor = replaceAllText(existingComponent, [
  ["onClick={handleResetAll}", "onClick={() => handleResetAll()}"],
  ["onChange={handleNoteChange}", "onChange={(event) => handleNoteChange(event)}"],
  ["onChange={handleContactChange}", "onChange={(event) => handleContactChange(event)}"],
  ["onSubmit={handleContactSubmit}", "onSubmit={(event) => handleContactSubmit(event)}"],
]);

const renamedFormAttributes = replaceAllText(existingComponent, [
  ['name="prep"', 'name="first-checklist"'],
  ['name="packing"', 'name="second-checklist"'],
  ['name="notes"', 'name="private-notes"'],
  ['name="filter"', 'id="view-mode"'],
  ['name="name"', 'id="contact-name"'],
  ['name="phone"', 'id="contact-phone"'],
]);

test("collectInteractivePreservationSignals extracts generic React signals", () => {
  const signals = collectInteractivePreservationSignals(existingComponent);

  expect(signals.stateSetters.length).toBeGreaterThanOrEqual(5);
  expect(signals.namedFunctions.length).toBeGreaterThanOrEqual(4);
  expect(signals.eventBindings.length).toBeGreaterThanOrEqual(5);
  expect(signals.formControls.length).toBeGreaterThanOrEqual(5);
  expect(signals.classNameTokens.length).toBeGreaterThanOrEqual(8);
  expect(signals.eventBindings.every((eventName) => !eventName.includes(":"))).toBe(
    true,
  );
  expect(signals.formControls).toContain("input:checkbox");
  expect(signals.formControls).toContain("textarea:default");
  expect(signals.formControls).toContain("select:default");
  expect(signals.formControls.every((control) => !control.includes(":prep"))).toBe(
    true,
  );
});

test("blocks a substantial same-size replacement that removes several interactive capabilities", () => {
  const result = shouldBlockInteractiveCapabilityLoss({
    path: "src/App.jsx",
    existingContent: existingComponent,
    nextContent: destructiveReplacement,
  });

  expect(result).toMatch(/proposed full-file replacement appears to remove several existing app capabilities/i);
});

test("allows renaming all setters and handlers when counts and UI structure remain", () => {
  const result = shouldBlockInteractiveCapabilityLoss({
    path: "src/App.jsx",
    existingContent: existingComponent,
    nextContent: renamedRefactor,
  });

  expect(result).toBe("");
});

test("allows replacing named event callbacks with equivalent inline callbacks", () => {
  const result = shouldBlockInteractiveCapabilityLoss({
    path: "src/App.jsx",
    existingContent: existingComponent,
    nextContent: inlineCallbackRefactor,
  });

  expect(result).toBe("");
});

test("allows changing form name and id attributes when control types remain", () => {
  const result = shouldBlockInteractiveCapabilityLoss({
    path: "src/App.jsx",
    existingContent: existingComponent,
    nextContent: renamedFormAttributes,
  });

  expect(result).toBe("");
});

test("allows an additive edit that keeps existing structures", () => {
  const result = shouldBlockInteractiveCapabilityLoss({
    path: "src/App.jsx",
    existingContent: existingComponent,
    nextContent: additiveEdit,
  });

  expect(result).toBe("");
});

test("ignores non-script files", () => {
  const result = shouldBlockInteractiveCapabilityLoss({
    path: "src/App.css",
    existingContent: existingComponent,
    nextContent: destructiveReplacement,
  });

  expect(result).toBe("");
});

test("allows a change losing only one minor signal", () => {
  const minorLoss = existingComponent.replace(
    '<select className="filter-select" name="filter" value={filter} onChange={(event) => setFilter(event.target.value)}>',
    '<div className="filter-select">',
  ).replace("</select>", "</div>");

  const result = shouldBlockInteractiveCapabilityLoss({
    path: "src/App.jsx",
    existingContent: existingComponent,
    nextContent: minorLoss,
  });

  expect(result).toBe("");
});
