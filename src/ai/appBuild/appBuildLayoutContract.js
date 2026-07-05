function normalizeGoal(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(value = "") {
  return normalizeGoal(value).toLowerCase();
}

function pickContract(goal = "") {
  const text = normalizeSearchText(goal);

  if (/\b(booking|appointment|reservation|schedule|scheduling|calendar|client|customer|service|slot|availability)\b/.test(text)) {
    return {
      archetype: "calendar-first scheduling / schedule-board",
      mainSurface:
        "The main source write must include a real primary schedule surface before generic lists/forms dominate.",
      structures:
        "Acceptable structural class names include schedule-board, calendar-grid, appointment-lane, slot-grid, availability-grid, or day-timeline.",
      support:
        "Stats, forms, and lists are allowed only as supporting panels around the scheduling surface.",
    };
  }

  if (/\b(fitness|habit|streak|workout|health|water|mood|sleep|tracker|tracking)\b/.test(text)) {
    return {
      archetype: "streak lanes / weekly habit grid / progress board",
      mainSurface:
        "The main source write must organize habits, workouts, or tracker entries around streak lanes, a weekly grid, or a progress board.",
      structures:
        "Useful structural class names include streak-lanes, weekly-habit-grid, progress-board, habit-row, or milestone-track.",
      support:
        "Forms and metric cards should support the tracking board rather than replacing it.",
    };
  }

  if (/\b(study|revision|revise|exam|flashcard|course|lesson|subject|student)\b/.test(text)) {
    return {
      archetype: "subject columns / revision queue / exam countdown board",
      mainSurface:
        "The main source write must organize study work around subject columns, a revision queue, or an exam countdown board.",
      structures:
        "Useful structural class names include subject-columns, revision-queue, exam-countdown-board, study-lane, or topic-card.",
      support:
        "Forms and stats should support the revision workflow rather than becoming the main layout.",
    };
  }

  if (/\b(quote|estimate|estimator|pricing|invoice|line item|line-item|builder|calculator)\b/.test(text)) {
    return {
      archetype: "split quote-builder / estimate summary / line-item builder",
      mainSurface:
        "The main source write must organize work around a split builder with line items and a visible result/summary panel.",
      structures:
        "Useful structural class names include quote-builder, line-item-builder, estimate-summary, pricing-panel, or result-panel.",
      support:
        "Metrics and controls should reinforce the builder/results workflow.",
    };
  }

  if (/\b(checklist|travel|trip|itinerary|packing|category|planner|plan)\b/.test(text)) {
    return {
      archetype: "category checklist / progress itinerary board",
      mainSurface:
        "The main source write must organize items around category checklist lanes or an itinerary/progress board.",
      structures:
        "Useful structural class names include category-checklist, itinerary-board, progress-itinerary, checklist-lane, or trip-stage.",
      support:
        "Forms and counters should support the board rather than becoming the entire app structure.",
    };
  }

  if (/\b(tool|calculator|converter|dashboard|cockpit|utility)\b/.test(text)) {
    return {
      archetype: "compact tool cockpit / results panel",
      mainSurface:
        "The main source write must organize controls and outputs around a compact tool cockpit with a clear results panel.",
      structures:
        "Useful structural class names include tool-cockpit, control-panel, results-panel, input-rail, or output-summary.",
      support:
        "Secondary lists or stats should support the tool interaction.",
    };
  }

  return {
    archetype: "split workspace / command panel / activity board",
    mainSurface:
      "The main source write must organize the requested workflow around a domain-specific workspace surface, not a generic hero/stat/form/list dashboard.",
    structures:
      "Useful structural class names include workspace-board, command-panel, activity-board, item-lane, or workflow-panel.",
    support:
      "Forms, stats, and lists should be supporting panels shaped by the requested workflow.",
  };
}

export function buildAppBuildLayoutContract(originalGoal = "") {
  const contract = pickContract(originalGoal);

  return (
    "layout contract:\n" +
    `- primary layout archetype: ${contract.archetype}.\n` +
    `- ${contract.mainSurface}\n` +
    `- ${contract.structures}\n` +
    `- ${contract.support}\n` +
    "- Do not use unrequested named demo records. Start user-managed data empty unless the user explicitly asks for demo/sample data.\n" +
    "- App-data reset must clear user-managed data and derived metrics to empty/neutral values; it must not restore seed records."
  );
}
