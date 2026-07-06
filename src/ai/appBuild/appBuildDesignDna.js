function normalizeGoal(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hasSignal(text = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
}

function createBaseDna(originalGoal = "") {
  return {
    originalGoal: String(originalGoal || "").trim(),
    primarySurface: "mixed workspace",
    layoutComposition: "balanced split workspace",
    interactionStyle: "card-heavy with clear item actions",
    navigationStyle: "top toolbar",
    dataDensity: "medium",
    density: "balanced",
    cardStyle: "soft paper cards",
    headerStructure: "compact operational header",
    visualMood: "professional",
    themeMode: "light",
    accentPalette: "neutral surfaces with one request-fitting accent",
    typographyFeel: "professional",
    backgroundTreatment: "soft neutral surface",
    deviceFeel: "responsive web tool",
    avoidStyle:
      "do not reuse a dark glass cyan-blue dashboard unless the inferred request genuinely needs a technical/data-heavy cockpit",
  };
}

const SIGNALS = {
  technicalData: [
    /\b(data|dashboard|analytics|metrics?|kpi|report|table|spreadsheet|grid|database|inventory|watchlist|holdings|portfolio|market|crypto|stock|trading|finance|financial|revenue|profit|loss|fleet|monitoring|logs?)\b/,
  ],
  calculationTool: [
    /\b(calculator|calculate|converter|conversion|estimate|estimator|quote|pricing|invoice|budget|mortgage|loan|payment|rate|tax|cost|amortization)\b/,
  ],
  progressWellness: [
    /\b(fitness|workout|exercise|training|habit|streak|health|wellness|water|sleep|mood|meal|food|nutrition|calorie|macro|diet|recovery|mobility|cardio|strength)\b/,
  ],
  planning: [
    /\b(planner|plan|schedule|calendar|booking|appointment|reservation|itinerary|timeline|agenda|daily|weekly|monthly|task|study|revision|lesson|session|subject|exam)\b/,
  ],
  marketing: [
    /\b(landing|website|homepage|marketing|brand|business|lead|signup|sales|hero|benefits|service page|portfolio site)\b/,
  ],
  editorContent: [
    /\b(editor|document|notes?|writing|draft|blog|post|publish|content|cms|journal)\b/,
  ],
  commerce: [
    /\b(shop|store|marketplace|product|catalog|cart|checkout|order|orders|ecommerce|e-commerce)\b/,
  ],
};

function applyTechnicalDataDna(dna) {
  return {
    ...dna,
    primarySurface: "data dashboard",
    layoutComposition: "dense dashboard with summary strip, table/list workspace, and detail panels",
    interactionStyle: "table-heavy with compact data cards and item-level controls",
    navigationStyle: "top toolbar or sidebar",
    dataDensity: "high",
    density: "compact",
    cardStyle: "compact data cards and table rows",
    headerStructure: "compact operational header",
    visualMood: "technical and serious",
    themeMode: "dark or high-contrast professional",
    accentPalette: "blue, green, cyan, and status accents over neutral technical surfaces",
    typographyFeel: "technical",
    backgroundTreatment: "dark technical or plain high-contrast surface",
    deviceFeel: "desktop app",
    avoidStyle:
      "a dark technical/data cockpit is acceptable here, but avoid decorative glass if it reduces readability",
  };
}

function applyCalculationToolDna(dna) {
  return {
    ...dna,
    primarySurface: "calculator/tool",
    layoutComposition: "input panel beside result cards, breakdown, and optional table/chart",
    interactionStyle: "form-heavy with immediate result summaries",
    navigationStyle: "none or compact top toolbar",
    dataDensity: "medium",
    density: "compact",
    cardStyle: "clear result cards",
    headerStructure: "tool header with actions",
    visualMood: "trustworthy and professional",
    themeMode: "light or mixed",
    accentPalette: "blue, green, and neutral finance/tool accents",
    typographyFeel: "professional",
    backgroundTreatment: "plain surface or soft neutral gradient",
    deviceFeel: "responsive web tool",
  };
}

function applyProgressWellnessDna(dna) {
  return {
    ...dna,
    primarySurface: "tracker/progress board",
    layoutComposition: "today-first progress board with habit cards, streak lane, and activity log",
    interactionStyle: "card-heavy with quick completion controls",
    navigationStyle: "tabs or compact top toolbar",
    dataDensity: "medium",
    density: "balanced",
    cardStyle: "warm progress cards and rounded habit rows",
    headerStructure: "friendly operational header with compact actions",
    visualMood: "energetic, healthy, and encouraging",
    themeMode: "warm light",
    accentPalette: "fresh green, warm orange, cream, and soft neutral accents",
    typographyFeel: "rounded friendly",
    backgroundTreatment: "soft warm gradient or light neutral surface",
    deviceFeel: "responsive web tool or mobile app feel",
    avoidStyle:
      "avoid dark glass/cyan-blue finance dashboard styling; prefer warm light progress/tracker visuals",
  };
}

function applyPlanningDna(dna) {
  return {
    ...dna,
    primarySurface: "planner",
    layoutComposition: "timeline or board-first planner with upcoming items and progress summaries",
    interactionStyle: "calendar/list/card-heavy",
    navigationStyle: "tabs, sidebar, or compact toolbar",
    dataDensity: "medium",
    density: "balanced",
    cardStyle: "soft paper cards or timeline cards",
    headerStructure: "compact operational header",
    visualMood: "calm and organized",
    themeMode: "light",
    accentPalette: "soft blue, lavender, cream, and muted status accents",
    typographyFeel: "calm academic or professional",
    backgroundTreatment: "soft neutral surface",
    deviceFeel: "responsive web tool",
  };
}

function applyMarketingDna(dna) {
  return {
    ...dna,
    primarySurface: "landing page",
    layoutComposition: "hero plus benefits, proof, and focused conversion/wizard section",
    interactionStyle: "hero/card/form-heavy",
    navigationStyle: "top toolbar",
    dataDensity: "low",
    density: "spacious",
    cardStyle: "bold blocks",
    headerStructure: "hero-first marketing header",
    visualMood: "bright professional",
    themeMode: "light",
    accentPalette: "brand accent with high-contrast neutral sections",
    typographyFeel: "bold editorial",
    backgroundTreatment: "subtle gradient or clean marketing surface",
    deviceFeel: "marketing site",
  };
}

function applyEditorContentDna(dna) {
  return {
    ...dna,
    primarySurface: "editor",
    layoutComposition: "split editor workspace with content list and focused writing/preview pane",
    interactionStyle: "split-pane editor with feed/list support",
    navigationStyle: "split pane",
    dataDensity: "medium",
    density: "balanced",
    cardStyle: "soft paper cards",
    headerStructure: "tool header with actions",
    visualMood: "editorial and calm",
    themeMode: "light",
    accentPalette: "ink, paper, and one muted accent",
    typographyFeel: "editorial",
    backgroundTreatment: "paper texture or plain writing surface",
    deviceFeel: "desktop app",
  };
}

function applyCommerceDna(dna) {
  return {
    ...dna,
    primarySurface: "marketplace/catalog",
    layoutComposition: "catalog grid or order table with filters, item cards, and checkout/order summary",
    interactionStyle: "card-heavy with filter/list controls",
    navigationStyle: "top toolbar or sidebar",
    dataDensity: "medium",
    density: "balanced",
    cardStyle: "product cards or table rows",
    headerStructure: "compact operational header",
    visualMood: "professional",
    themeMode: "light",
    accentPalette: "brand accent with clear price/status contrast",
    typographyFeel: "professional",
    backgroundTreatment: "plain surface",
    deviceFeel: "responsive web tool",
  };
}

export function inferAppBuildDesignDna(originalGoal = "") {
  const text = normalizeGoal(originalGoal);
  let dna = createBaseDna(originalGoal);

  const technicalData = hasSignal(text, SIGNALS.technicalData);
  const calculationTool = hasSignal(text, SIGNALS.calculationTool);
  const progressWellness = hasSignal(text, SIGNALS.progressWellness);
  const planning = hasSignal(text, SIGNALS.planning);
  const marketing = hasSignal(text, SIGNALS.marketing);
  const editorContent = hasSignal(text, SIGNALS.editorContent);
  const commerce = hasSignal(text, SIGNALS.commerce);

  if (technicalData) dna = applyTechnicalDataDna(dna);
  if (calculationTool) dna = applyCalculationToolDna(dna);
  if (planning && !technicalData) dna = applyPlanningDna(dna);
  if (progressWellness) dna = applyProgressWellnessDna(dna);
  if (marketing) dna = applyMarketingDna(dna);
  if (editorContent) dna = applyEditorContentDna(dna);
  if (commerce) dna = applyCommerceDna(dna);

  return dna;
}

export function buildAppBuildDesignDnaPrompt(originalGoal = "") {
  const dna = inferAppBuildDesignDna(originalGoal);

  return (
    "Inferred Design DNA for this app:\n" +
    `- primary surface: ${dna.primarySurface}\n` +
    `- layout composition: ${dna.layoutComposition}\n` +
    `- interaction style: ${dna.interactionStyle}\n` +
    `- navigation style: ${dna.navigationStyle}\n` +
    `- data density: ${dna.dataDensity}\n` +
    `- density: ${dna.density}\n` +
    `- card style: ${dna.cardStyle}\n` +
    `- header structure: ${dna.headerStructure}\n` +
    `- visual mood: ${dna.visualMood}\n` +
    `- theme mode: ${dna.themeMode}\n` +
    `- accent palette direction: ${dna.accentPalette}\n` +
    `- typography feel: ${dna.typographyFeel}\n` +
    `- background treatment: ${dna.backgroundTreatment}\n` +
    `- device feel: ${dna.deviceFeel}\n` +
    `- anti-sameness guard: ${dna.avoidStyle}\n` +
    "- responsive fit guard: prevent page-level horizontal scrolling. Top-level shells must use width: min(100%, ...), max-width: calc(100vw - safe padding), box-sizing: border-box, and overflow-x: hidden only as a last-resort page safeguard. Do not make the app shell wider than the viewport.\n" +
    "- responsive grid guard: CSS grids must use minmax(0, 1fr), wrap summary cards at medium widths, and avoid fixed multi-column layouts that exceed the viewport. Header/toolbars must wrap instead of pushing content off-screen.\n" +
    "- table fit guard: wide tables/data grids must live inside an inner scroll container with max-width: 100%; overflow-x: auto; the page itself must not get the horizontal scrollbar.\n" +
    "- Use these concrete design values as direction, not as a fixed generated template.\n" +
    "- The app must still be built from the inspected project evidence and the user's request.\n" +
    "- Do not output a separate design report unless asked."
  );
}
