export const BUILT_IN_MODERN_REACT_STARTER_LABEL =
  "Use KForge built-in polished starter";

export const BUILT_IN_MODERN_REACT_STARTER_TARGET_PATHS = Object.freeze([
  "src/App.jsx",
  "src/App.css",
  "src/index.css",
]);

const APP_SHAPE = Object.freeze({
  PLANNER: "planner",
  TRACKER: "tracker",
  BOOKING_DASHBOARD: "booking_dashboard",
  TASK_MANAGER: "task_manager",
  CALCULATOR_TOOL: "calculator_tool",
  STUDY_HELPER: "study_helper",
  GENERIC_APP: "generic_app",
});

function normalizeGoal(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(value = "") {
  return normalizeGoal(value).toLowerCase();
}

function titleCase(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (match) => match.toUpperCase())
    .replace(/\bUi\b/g, "UI")
    .replace(/\bUx\b/g, "UX")
    .trim();
}

function cleanTitleCandidate(value = "") {
  return String(value || "")
    .replace(/[.?!].*$/g, "")
    .replace(/\b(with|that|where|which|using|use|for users?|to help)\b.*$/i, "")
    .replace(/\b(local state only|modern|polished|responsive|serious|app called)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractExplicitTitle(goal = "") {
  const raw = normalizeGoal(goal);

  const calledMatch = raw.match(/\bcalled\s+["“]?([^"”.,\n]{3,70})/i);
  if (calledMatch?.[1]) return cleanTitleCandidate(calledMatch[1]);

  const namedMatch = raw.match(/\bnamed\s+["“]?([^"”.,\n]{3,70})/i);
  if (namedMatch?.[1]) return cleanTitleCandidate(namedMatch[1]);

  return "";
}

function inferBuiltInModernReactStarterShape(goal = "") {
  const text = normalizeSearchText(goal);

  if (/\b(calorie|meal|nutrition|health|habit|fitness|water|mood|sleep|workout|tracker|tracking|track)\b/.test(text)) {
    return APP_SHAPE.TRACKER;
  }

  if (/\b(booking|appointment|reservation|schedule|customer|client|service business|salon|clinic)\b/.test(text)) {
    return APP_SHAPE.BOOKING_DASHBOARD;
  }

  if (/\b(budget|planner|plan|travel|trip|itinerary|expense|cost|saving|finance)\b/.test(text)) {
    return APP_SHAPE.PLANNER;
  }

  if (/\b(task|todo|to-do|project manager|kanban|sprint|deadline)\b/.test(text)) {
    return APP_SHAPE.TASK_MANAGER;
  }

  if (/\b(calculator|estimate|estimator|quote|pricing|mortgage|loan|converter|tool)\b/.test(text)) {
    return APP_SHAPE.CALCULATOR_TOOL;
  }

  if (/\b(study|learn|revision|flashcard|course|lesson|quiz|student)\b/.test(text)) {
    return APP_SHAPE.STUDY_HELPER;
  }

  return APP_SHAPE.GENERIC_APP;
}

function buildTitle(goal = "", shape = APP_SHAPE.GENERIC_APP) {
  const explicitTitle = extractExplicitTitle(goal);
  if (explicitTitle) return titleCase(explicitTitle);

  const text = normalizeSearchText(goal);

  if (shape === APP_SHAPE.PLANNER) {
    if (text.includes("travel") || text.includes("trip")) return "Travel Budget Planner";
    return "Smart Planning Dashboard";
  }

  if (shape === APP_SHAPE.TRACKER) {
    if (text.includes("calorie")) return "Calorie Tracker";
    if (text.includes("habit")) return "Habit Tracker";
    return "Daily Progress Tracker";
  }

  if (shape === APP_SHAPE.BOOKING_DASHBOARD) return "Booking Dashboard";
  if (shape === APP_SHAPE.TASK_MANAGER) return "Project Task Manager";
  if (shape === APP_SHAPE.CALCULATOR_TOOL) return "Smart Estimator";
  if (shape === APP_SHAPE.STUDY_HELPER) return "Study Helper";

  const cleaned = cleanTitleCandidate(
    goal
      .replace(/^\s*(build|create|make|generate|start)\s+(me\s+)?/i, "")
      .replace(/^\s*(an?|the)\s+/i, ""),
  );

  return cleaned ? titleCase(cleaned).slice(0, 54) : "Modern App Starter";
}

function buildShapeConfig(goal = "") {
  const shape = inferBuiltInModernReactStarterShape(goal);
  const title = buildTitle(goal, shape);

  if (shape === APP_SHAPE.PLANNER) {
    return {
      shape,
      title,
      kicker: "Planning workspace",
      subtitle:
        "Plan a trip budget with clear categories, live totals, and a polished first working flow.",
      primaryAction: "Add budget item",
      itemNameLabel: "Budget item",
      itemNamePlaceholder: "e.g. Flights, hotel, emergency fund",
      valueKind: "money",
      unit: "£",
      goalLabel: "Total budget",
      defaultGoal: 2500,
      statusLabel: "Priority",
      statusOptions: ["Essential", "Flexible", "Nice to have"],
      fields: [
        { key: "name", label: "Item", type: "text", placeholder: "Flights" },
        { key: "category", label: "Category", type: "select", options: ["Flights", "Hotel", "Transport", "Food", "Activities", "Emergency"] },
        { key: "amount", label: "Amount", type: "number", placeholder: "450" },
        { key: "status", label: "Priority", type: "select", options: ["Essential", "Flexible", "Nice to have"] },
      ],
      seedItems: [
        { name: "Return flights", category: "Flights", amount: 620, status: "Essential" },
        { name: "Hotel stay", category: "Hotel", amount: 980, status: "Essential" },
        { name: "Food allowance", category: "Food", amount: 320, status: "Flexible" },
        { name: "Emergency buffer", category: "Emergency", amount: 300, status: "Essential" },
      ],
    };
  }

  if (shape === APP_SHAPE.TRACKER) {
    return {
      shape,
      title,
      kicker: "Daily tracker",
      subtitle:
        "Track entries, monitor progress against a goal, and keep the day under control.",
      primaryAction: "Add entry",
      itemNameLabel: "Meal or habit",
      itemNamePlaceholder: "e.g. Breakfast bowl",
      valueKind: "calories",
      unit: "kcal",
      goalLabel: "Daily goal",
      defaultGoal: 2200,
      statusLabel: "Type",
      statusOptions: ["Breakfast", "Lunch", "Dinner", "Snack"],
      fields: [
        { key: "name", label: "Entry", type: "text", placeholder: "Breakfast bowl" },
        { key: "category", label: "Type", type: "select", options: ["Breakfast", "Lunch", "Dinner", "Snack"] },
        { key: "amount", label: "Calories", type: "number", placeholder: "420" },
        { key: "note", label: "Note", type: "text", placeholder: "High protein" },
      ],
      seedItems: [
        { name: "Breakfast bowl", category: "Breakfast", amount: 420, note: "High protein" },
        { name: "Chicken wrap", category: "Lunch", amount: 610, note: "Balanced" },
        { name: "Fruit snack", category: "Snack", amount: 140, note: "Light" },
      ],
    };
  }

  if (shape === APP_SHAPE.BOOKING_DASHBOARD) {
    return {
      shape,
      title,
      kicker: "Business dashboard",
      subtitle:
        "Manage customer bookings with status cards, upcoming appointments, and a clean service workflow.",
      primaryAction: "Add booking",
      itemNameLabel: "Customer",
      itemNamePlaceholder: "e.g. Aisha Khan",
      valueKind: "count",
      unit: "",
      goalLabel: "Weekly target",
      defaultGoal: 20,
      statusLabel: "Status",
      statusOptions: ["Confirmed", "Pending", "Completed"],
      fields: [
        { key: "name", label: "Customer", type: "text", placeholder: "Aisha Khan" },
        { key: "category", label: "Service", type: "select", options: ["Consultation", "Repair", "Design session", "Follow-up"] },
        { key: "date", label: "Date", type: "date" },
        { key: "status", label: "Status", type: "select", options: ["Confirmed", "Pending", "Completed"] },
      ],
      seedItems: [
        { name: "Aisha Khan", category: "Consultation", date: "2026-06-18", status: "Confirmed" },
        { name: "Daniel Reed", category: "Repair", date: "2026-06-19", status: "Pending" },
        { name: "Maya Lewis", category: "Design session", date: "2026-06-20", status: "Confirmed" },
      ],
    };
  }

  if (shape === APP_SHAPE.TASK_MANAGER) {
    return {
      shape,
      title,
      kicker: "Work command centre",
      subtitle:
        "Organise tasks, priorities, and progress in a crisp responsive project workspace.",
      primaryAction: "Add task",
      itemNameLabel: "Task",
      itemNamePlaceholder: "e.g. Design landing page",
      valueKind: "count",
      unit: "",
      goalLabel: "Sprint target",
      defaultGoal: 8,
      statusLabel: "Status",
      statusOptions: ["Todo", "In progress", "Done"],
      fields: [
        { key: "name", label: "Task", type: "text", placeholder: "Design landing page" },
        { key: "category", label: "Area", type: "select", options: ["Design", "Build", "Content", "Testing"] },
        { key: "status", label: "Status", type: "select", options: ["Todo", "In progress", "Done"] },
        { key: "note", label: "Note", type: "text", placeholder: "What matters most?" },
      ],
      seedItems: [
        { name: "Create app shell", category: "Build", status: "Done", note: "Base layout ready" },
        { name: "Polish dashboard", category: "Design", status: "In progress", note: "Cards and spacing" },
        { name: "Preview checklist", category: "Testing", status: "Todo", note: "Check responsive states" },
      ],
    };
  }

  if (shape === APP_SHAPE.CALCULATOR_TOOL) {
    return {
      shape,
      title,
      kicker: "Smart tool",
      subtitle:
        "Estimate values quickly with a polished control panel, live totals, and saved scenarios.",
      primaryAction: "Save scenario",
      itemNameLabel: "Scenario",
      itemNamePlaceholder: "e.g. Standard package",
      valueKind: "money",
      unit: "£",
      goalLabel: "Target value",
      defaultGoal: 1000,
      statusLabel: "Confidence",
      statusOptions: ["Low", "Medium", "High"],
      fields: [
        { key: "name", label: "Scenario", type: "text", placeholder: "Standard package" },
        { key: "category", label: "Type", type: "select", options: ["Basic", "Standard", "Premium", "Custom"] },
        { key: "amount", label: "Value", type: "number", placeholder: "350" },
        { key: "status", label: "Confidence", type: "select", options: ["Low", "Medium", "High"] },
      ],
      seedItems: [
        { name: "Starter option", category: "Basic", amount: 250, status: "High" },
        { name: "Growth option", category: "Standard", amount: 520, status: "Medium" },
        { name: "Premium option", category: "Premium", amount: 880, status: "Medium" },
      ],
    };
  }

  if (shape === APP_SHAPE.STUDY_HELPER) {
    return {
      shape,
      title,
      kicker: "Learning workspace",
      subtitle:
        "Plan study sessions, track topics, and keep revision progress visible.",
      primaryAction: "Add study item",
      itemNameLabel: "Topic",
      itemNamePlaceholder: "e.g. Algebra revision",
      valueKind: "count",
      unit: "",
      goalLabel: "Topic target",
      defaultGoal: 10,
      statusLabel: "Progress",
      statusOptions: ["New", "Learning", "Confident"],
      fields: [
        { key: "name", label: "Topic", type: "text", placeholder: "Algebra revision" },
        { key: "category", label: "Subject", type: "select", options: ["Maths", "Science", "Writing", "Languages"] },
        { key: "status", label: "Progress", type: "select", options: ["New", "Learning", "Confident"] },
        { key: "note", label: "Focus", type: "text", placeholder: "What to revise next?" },
      ],
      seedItems: [
        { name: "Formula practice", category: "Maths", status: "Learning", note: "Repeat weak areas" },
        { name: "Key definitions", category: "Science", status: "Confident", note: "Quick recap" },
        { name: "Essay plan", category: "Writing", status: "New", note: "Outline first" },
      ],
    };
  }

  return {
    shape,
    title,
    kicker: "Modern starter",
    subtitle:
      "A polished local-state app starter with forms, cards, summary metrics, and responsive layout.",
    primaryAction: "Add item",
    itemNameLabel: "Item",
    itemNamePlaceholder: "e.g. First milestone",
    valueKind: "count",
    unit: "",
    goalLabel: "Target",
    defaultGoal: 10,
    statusLabel: "Status",
    statusOptions: ["New", "Active", "Done"],
    fields: [
      { key: "name", label: "Name", type: "text", placeholder: "First milestone" },
      { key: "category", label: "Category", type: "select", options: ["Core", "Design", "Operations", "Follow-up"] },
      { key: "status", label: "Status", type: "select", options: ["New", "Active", "Done"] },
      { key: "note", label: "Note", type: "text", placeholder: "What should happen next?" },
    ],
    seedItems: [
      { name: "Create first flow", category: "Core", status: "Active", note: "Working local state" },
      { name: "Polish interface", category: "Design", status: "Done", note: "Modern responsive cards" },
      { name: "Preview checklist", category: "Follow-up", status: "New", note: "Run Preview next" },
    ],
  };
}

function buildEmptyForm(fields = []) {
  return fields.reduce((form, field) => {
    if (field.type === "number") {
      form[field.key] = "";
      return form;
    }

    if (field.type === "select") {
      form[field.key] = field.options?.[0] || "";
      return form;
    }

    form[field.key] = "";
    return form;
  }, {});
}

function buildAppJsx(config) {
  const finalConfig = {
    ...config,
    emptyForm: buildEmptyForm(config.fields),
  };

  const configJson = JSON.stringify(finalConfig, null, 2);

  return `import { useMemo, useState } from "react";
import "./App.css";

const STARTER_CONFIG = ${configJson};

function formatMetric(value, config = STARTER_CONFIG) {
  const numeric = Number(value || 0);

  if (config.valueKind === "money") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(numeric);
  }

  if (config.valueKind === "calories") {
    return numeric.toLocaleString("en-GB") + " kcal";
  }

  return numeric.toLocaleString("en-GB");
}

function getStatusClass(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function App() {
  const [items, setItems] = useState(STARTER_CONFIG.seedItems);
  const [form, setForm] = useState(STARTER_CONFIG.emptyForm);
  const [goal, setGoal] = useState(STARTER_CONFIG.defaultGoal);

  const numberField = STARTER_CONFIG.fields.find((field) => field.type === "number");
  const statusField = STARTER_CONFIG.fields.find((field) => field.key === "status");
  const categoryField = STARTER_CONFIG.fields.find((field) => field.key === "category");

  const stats = useMemo(() => {
    const totalValue = numberField
      ? items.reduce((sum, item) => sum + Number(item[numberField.key] || 0), 0)
      : items.length;

    const completedCount = items.filter((item) =>
      ["done", "completed", "confirmed", "confident", "essential", "high"].includes(
        String(item.status || "").toLowerCase(),
      ),
    ).length;

    const categoryCount = new Set(
      items.map((item) => String(item.category || "General")).filter(Boolean),
    ).size;

    const remaining = Math.max(Number(goal || 0) - totalValue, 0);
    const progress = Number(goal || 0) > 0
      ? Math.min(Math.round((totalValue / Number(goal || 1)) * 100), 100)
      : 0;

    return {
      totalValue,
      completedCount,
      categoryCount,
      remaining,
      progress,
    };
  }, [items, goal, numberField]);

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function addItem(event) {
    event.preventDefault();

    const name = String(form.name || "").trim();
    if (!name) return;

    const nextItem = {
      ...form,
      id: crypto.randomUUID(),
      name,
    };

    if (numberField) {
      nextItem[numberField.key] = Number(form[numberField.key] || 0);
    }

    setItems((current) => [nextItem, ...current]);
    setForm(STARTER_CONFIG.emptyForm);
  }

  function removeItem(id, index) {
    setItems((current) =>
      current.filter((item, itemIndex) => (item.id || itemIndex) !== (id || index)),
    );
  }

  function cycleStatus(id, index) {
    if (!statusField || !Array.isArray(statusField.options)) return;

    setItems((current) =>
      current.map((item, itemIndex) => {
        if ((item.id || itemIndex) !== (id || index)) return item;

        const currentIndex = statusField.options.indexOf(item.status);
        const nextStatus = statusField.options[(currentIndex + 1) % statusField.options.length];

        return {
          ...item,
          status: nextStatus,
        };
      }),
    );
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">{STARTER_CONFIG.kicker}</span>
          <h1>{STARTER_CONFIG.title}</h1>
          <p>{STARTER_CONFIG.subtitle}</p>
        </div>

        <div className="hero-panel">
          <span className="hero-panel-label">{STARTER_CONFIG.goalLabel}</span>
          <label className="goal-input">
            <span>{STARTER_CONFIG.unit || "Target"}</span>
            <input
              type="number"
              min="0"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
            />
          </label>
          <div className="progress-track" aria-label="Goal progress">
            <span style={{ width: stats.progress + "%" }} />
          </div>
          <strong>{stats.progress}% of target</strong>
        </div>
      </section>

      <section className="stats-grid" aria-label="App summary">
        <article className="stat-card">
          <span>Total</span>
          <strong>{formatMetric(stats.totalValue)}</strong>
          <small>{numberField ? "Live total from entries" : "Items added"}</small>
        </article>
        <article className="stat-card">
          <span>Remaining</span>
          <strong>{formatMetric(stats.remaining)}</strong>
          <small>Against current target</small>
        </article>
        <article className="stat-card">
          <span>{statusField ? "Strong status" : "Progress"}</span>
          <strong>{stats.completedCount}</strong>
          <small>Items marked important or complete</small>
        </article>
        <article className="stat-card">
          <span>{categoryField ? "Categories" : "Entries"}</span>
          <strong>{categoryField ? stats.categoryCount : items.length}</strong>
          <small>Organised across the app</small>
        </article>
      </section>

      <section className="workspace-grid">
        <form className="control-card" onSubmit={addItem}>
          <div>
            <span className="eyebrow">Control panel</span>
            <h2>{STARTER_CONFIG.primaryAction}</h2>
          </div>

          <div className="form-grid">
            {STARTER_CONFIG.fields.map((field) => (
              <label key={field.key}>
                <span>{field.label}</span>

                {field.type === "select" ? (
                  <select
                    value={form[field.key] || ""}
                    onChange={(event) => updateForm(field.key, event.target.value)}
                  >
                    {(field.options || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || "text"}
                    min={field.type === "number" ? "0" : undefined}
                    value={form[field.key] || ""}
                    placeholder={field.placeholder || ""}
                    onChange={(event) => updateForm(field.key, event.target.value)}
                  />
                )}
              </label>
            ))}
          </div>

          <button className="primary-button" type="submit">
            {STARTER_CONFIG.primaryAction}
          </button>
        </form>

        <section className="list-card">
          <div className="list-header">
            <div>
              <span className="eyebrow">Live local state</span>
              <h2>Current items</h2>
            </div>
            <strong>{items.length} active</strong>
          </div>

          {items.length === 0 ? (
            <div className="empty-state">
              <strong>No items yet</strong>
              <p>Add the first item to start seeing live totals and progress.</p>
            </div>
          ) : (
            <div className="item-list">
              {items.map((item, index) => (
                <article className="item-card" key={item.id || index}>
                  <div>
                    <h3>{item.name}</h3>
                    <p>
                      {item.category || "General"}
                      {item.date ? " • " + item.date : ""}
                      {item.note ? " • " + item.note : ""}
                    </p>
                  </div>

                  <div className="item-actions">
                    {numberField ? (
                      <strong>{formatMetric(item[numberField.key])}</strong>
                    ) : null}

                    {statusField ? (
                      <button
                        className={"status-pill " + getStatusClass(item.status)}
                        type="button"
                        onClick={() => cycleStatus(item.id, index)}
                      >
                        {item.status}
                      </button>
                    ) : null}

                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => removeItem(item.id, index)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;
`;
}

function buildAppCss() {
  return `:root {
  color: #f8fafc;
  background: #0f172a;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.28), transparent 34rem),
    radial-gradient(circle at 85% 15%, rgba(168, 85, 247, 0.3), transparent 30rem),
    linear-gradient(135deg, #020617 0%, #111827 45%, #1e1b4b 100%);
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 48px 0;
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 24px;
  align-items: stretch;
  padding: 28px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 34px;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.84), rgba(30, 41, 59, 0.62)),
    linear-gradient(135deg, rgba(14, 165, 233, 0.22), rgba(168, 85, 247, 0.16));
  box-shadow: 0 28px 80px rgba(2, 6, 23, 0.42);
  backdrop-filter: blur(18px);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 260px;
}

.eyebrow {
  display: inline-flex;
  width: fit-content;
  margin-bottom: 14px;
  padding: 7px 12px;
  border: 1px solid rgba(125, 211, 252, 0.3);
  border-radius: 999px;
  color: #bae6fd;
  background: rgba(14, 165, 233, 0.12);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  max-width: 760px;
  margin-bottom: 16px;
  font-size: clamp(2.6rem, 8vw, 5.8rem);
  line-height: 0.9;
  letter-spacing: -0.08em;
}

h2 {
  margin-bottom: 0;
  font-size: clamp(1.35rem, 3vw, 2rem);
  letter-spacing: -0.04em;
}

h3 {
  margin-bottom: 8px;
  color: #ffffff;
}

p {
  max-width: 720px;
  color: #cbd5e1;
  font-size: 1.05rem;
  line-height: 1.7;
}

.hero-panel,
.stat-card,
.control-card,
.list-card {
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 24px 70px rgba(2, 6, 23, 0.28);
  backdrop-filter: blur(16px);
}

.hero-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
  padding: 24px;
  border-radius: 28px;
}

.hero-panel-label,
.stat-card span,
label span {
  color: #94a3b8;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.goal-input {
  display: grid;
  gap: 8px;
}

.goal-input input,
.form-grid input,
.form-grid select {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 16px;
  color: #f8fafc;
  background: rgba(2, 6, 23, 0.5);
  outline: none;
  padding: 13px 14px;
}

.goal-input input:focus,
.form-grid input:focus,
.form-grid select:focus {
  border-color: rgba(56, 189, 248, 0.7);
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.12);
}

.progress-track {
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #22d3ee, #a78bfa, #f472b6);
  transition: width 220ms ease;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin: 22px 0;
}

.stat-card {
  min-height: 148px;
  padding: 22px;
  border-radius: 26px;
}

.stat-card strong {
  display: block;
  margin: 12px 0 8px;
  font-size: clamp(1.8rem, 5vw, 3rem);
  letter-spacing: -0.06em;
}

.stat-card small {
  color: #94a3b8;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.control-card,
.list-card {
  border-radius: 30px;
  padding: 24px;
}

.control-card {
  position: sticky;
  top: 24px;
}

.form-grid {
  display: grid;
  gap: 14px;
  margin: 24px 0;
}

.form-grid label {
  display: grid;
  gap: 8px;
}

.primary-button,
.ghost-button,
.status-pill {
  border: 0;
  border-radius: 999px;
  font-weight: 800;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.primary-button {
  width: 100%;
  padding: 15px 18px;
  color: #020617;
  background: linear-gradient(135deg, #67e8f9, #c084fc, #f9a8d4);
  box-shadow: 0 18px 40px rgba(34, 211, 238, 0.22);
}

.primary-button:hover,
.ghost-button:hover,
.status-pill:hover {
  transform: translateY(-1px);
}

.list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.list-header strong {
  padding: 8px 12px;
  border-radius: 999px;
  color: #e0f2fe;
  background: rgba(14, 165, 233, 0.14);
}

.item-list {
  display: grid;
  gap: 14px;
}

.item-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 24px;
  background: rgba(2, 6, 23, 0.34);
}

.item-card p {
  margin-bottom: 0;
  color: #94a3b8;
  font-size: 0.95rem;
}

.item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
}

.item-actions strong {
  color: #fef3c7;
}

.status-pill {
  padding: 9px 12px;
  color: #e0f2fe;
  background: rgba(14, 165, 233, 0.18);
}

.status-pill.essential,
.status-pill.confirmed,
.status-pill.done,
.status-pill.completed,
.status-pill.confident,
.status-pill.high {
  color: #dcfce7;
  background: rgba(34, 197, 94, 0.2);
}

.status-pill.pending,
.status-pill.in-progress,
.status-pill.learning,
.status-pill.medium,
.status-pill.flexible {
  color: #fef9c3;
  background: rgba(234, 179, 8, 0.2);
}

.status-pill.nice-to-have,
.status-pill.todo,
.status-pill.new,
.status-pill.low {
  color: #fee2e2;
  background: rgba(244, 63, 94, 0.2);
}

.ghost-button {
  padding: 9px 12px;
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.65);
}

.empty-state {
  padding: 28px;
  border: 1px dashed rgba(148, 163, 184, 0.28);
  border-radius: 24px;
  text-align: center;
  background: rgba(15, 23, 42, 0.42);
}

.empty-state p {
  margin: 8px auto 0;
}

@media (max-width: 920px) {
  .hero-card,
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .hero-copy {
    min-height: auto;
  }

  .control-card {
    position: static;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .app-shell {
    width: min(100% - 20px, 1180px);
    padding: 24px 0;
  }

  .hero-card,
  .control-card,
  .list-card {
    border-radius: 24px;
    padding: 18px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .item-card {
    grid-template-columns: 1fr;
  }

  .item-actions {
    justify-content: flex-start;
  }
}
`;
}

function buildIndexCss() {
  return `html {
  min-width: 320px;
  min-height: 100%;
  scroll-behavior: smooth;
}

body {
  min-height: 100%;
}

#root {
  min-height: 100vh;
}

a {
  color: inherit;
}
`;
}

export function canUseBuiltInModernReactStarterImplementation({
  goal = "",
  inspectedPaths = [],
  projectTemplateInfo = null,
} = {}) {
  const normalizedGoal = normalizeSearchText(goal);
  const normalizedPaths = (Array.isArray(inspectedPaths) ? inspectedPaths : [])
    .map((path) => String(path || "").replace(/\\/g, "/").toLowerCase())
    .filter(Boolean);

  const hasReactEvidence =
    normalizedPaths.some((path) =>
      ["src/app.jsx", "src/app.tsx", "src/main.jsx", "src/main.tsx", "package.json"].includes(path),
    ) ||
    String(projectTemplateInfo?.detectedTemplate?.name || "")
      .toLowerCase()
      .includes("vite") ||
    String(projectTemplateInfo?.kind || "")
      .toLowerCase()
      .includes("vite");

  const hasBackendOnlySignals =
    /\b(api only|backend only|server only|database schema only|supabase setup|stripe setup|auth setup)\b/.test(
      normalizedGoal,
    );

  if (!normalizedGoal) {
    return {
      ok: false,
      reason: "No app goal is available for the built-in starter.",
    };
  }

  if (hasBackendOnlySignals) {
    return {
      ok: false,
      reason:
        "This looks like backend/service setup rather than a local-state React starter.",
    };
  }

  if (!hasReactEvidence) {
    return {
      ok: false,
      reason:
        "KForge needs React/Vite-style inspection evidence before using this starter.",
    };
  }

  return {
    ok: true,
    reason: "Suitable for a local-state React/Vite starter implementation.",
  };
}

export function buildBuiltInModernReactStarterImplementation(goal = "") {
  const appGoal = normalizeGoal(goal);
  const config = buildShapeConfig(appGoal);

  return {
    ok: true,
    kind: "built_in_modern_react_starter",
    shape: config.shape,
    title: config.title,
    appGoal,
    changedPaths: [...BUILT_IN_MODERN_REACT_STARTER_TARGET_PATHS],
    files: [
      {
        path: "src/App.jsx",
        content: buildAppJsx(config),
      },
      {
        path: "src/App.css",
        content: buildAppCss(config),
      },
      {
        path: "src/index.css",
        content: buildIndexCss(config),
      },
    ],
  };
}

export { APP_SHAPE };
