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
    visualDirection: "Inferred default",
    visualDirectionGuidance:
      "use the inferred app-type visual direction unless the user selected a visual direction option",
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

const VISUAL_DIRECTION_PRESETS = Object.freeze({
  inferredDefault: {
    label: "Inferred default",
    guidance:
      "use the inferred app-type visual direction; avoid sameness by varying palette, surface treatment, card rhythm, and typography within the inferred app structure",
  },
  lightAiry: {
    label: "Light / airy",
    visualMood: "bright, calm, and spacious",
    themeMode: "light",
    accentPalette:
      "soft sky, mist, pearl, and one clear accent; avoid default green unless the request strongly supports it",
    typographyFeel: "clean modern",
    backgroundTreatment:
      "white or off-white layered surfaces with subtle gradients, gentle dividers, and generous breathing room",
    cardStyle: "light elevated cards with soft borders",
    density: "spacious",
    guidance:
      "make the app feel open, clear, and premium without becoming a plain white/green default",
  },
  darkPremium: {
    label: "Dark / premium",
    visualMood: "premium, focused, and cinematic",
    themeMode: "dark",
    accentPalette:
      "deep neutral surfaces with restrained gold, violet, blue, or emerald accents selected to fit the request",
    typographyFeel: "premium modern",
    backgroundTreatment:
      "dark layered background with subtle glow, soft gradients, or rich panels; keep contrast high",
    cardStyle: "dark elevated cards with crisp borders and restrained glow",
    density: "balanced",
    guidance:
      "create a polished dark app that feels intentional and readable, not a generic cyan glass dashboard",
  },
  colourfulPlayful: {
    label: "Colourful / playful",
    visualMood: "friendly, energetic, and playful",
    themeMode: "light or mixed",
    accentPalette:
      "confident multi-colour accents such as coral, yellow, teal, purple, and blue over controlled neutral surfaces",
    typographyFeel: "rounded friendly",
    backgroundTreatment:
      "soft colour fields, playful gradients, badges, and section accents while preserving readability",
    cardStyle: "rounded lively cards with colourful status treatments",
    density: "balanced",
    guidance:
      "use colour to make the app distinctive and approachable without turning every section into a rainbow",
  },
  minimalProfessional: {
    label: "Minimal / professional",
    visualMood: "quiet, precise, and trustworthy",
    themeMode: "light or high-contrast neutral",
    accentPalette:
      "black, white, slate, stone, and one restrained accent; avoid decorative gradients unless useful",
    typographyFeel: "crisp professional",
    backgroundTreatment:
      "clean neutral surface with strong spacing, typography hierarchy, and subtle borders",
    cardStyle: "minimal cards, rows, or panels with sharp hierarchy",
    density: "compact",
    guidance:
      "make the app feel serious and efficient through layout, spacing, and hierarchy rather than decoration",
  },
  warmEditorial: {
    label: "Warm / editorial",
    visualMood: "warm, thoughtful, and crafted",
    themeMode: "warm light",
    accentPalette:
      "cream, parchment, clay, terracotta, olive, ink, and one warm accent",
    typographyFeel: "editorial",
    backgroundTreatment:
      "warm paper-like surfaces, soft section contrast, editorial spacing, and human-friendly cards",
    cardStyle: "warm paper cards or editorial panels",
    density: "balanced",
    guidance:
      "make the app feel crafted and welcoming without losing app/tool clarity",
  },
  highContrastDashboard: {
    label: "High-contrast dashboard",
    visualMood: "operational, sharp, and data-forward",
    themeMode: "dark or high-contrast professional",
    accentPalette:
      "high-contrast neutral surfaces with blue, cyan, amber, red, and green status accents",
    typographyFeel: "technical professional",
    backgroundTreatment:
      "plain high-contrast dashboard surface or dark operational cockpit with readable panels",
    cardStyle: "compact metric cards, dense panels, and clear status rows",
    density: "compact",
    dataDensity: "high",
    guidance:
      "prioritize scanability, status, metrics, and workflow clarity; avoid decorative effects that reduce readability",
  },
});

const VISUAL_DIRECTION_SIGNALS = [
  {
    key: "lightAiry",
    patterns: [
      /\bkforge visual direction:\s*light\s*\/\s*airy\b/,
      /\blight\s*\/\s*airy\b/,
      /\blight airy\b/,
      /\bairy\b/,
    ],
  },
  {
    key: "darkPremium",
    patterns: [
      /\bkforge visual direction:\s*dark\s*\/\s*premium\b/,
      /\bdark\s*\/\s*premium\b/,
      /\bdark premium\b/,
      /\bpremium dark\b/,
    ],
  },
  {
    key: "colourfulPlayful",
    patterns: [
      /\bkforge visual direction:\s*colou?rful\s*\/\s*playful\b/,
      /\bcolou?rful\s*\/\s*playful\b/,
      /\bcolou?rful playful\b/,
      /\bplayful\b/,
    ],
  },
  {
    key: "minimalProfessional",
    patterns: [
      /\bkforge visual direction:\s*minimal\s*\/\s*professional\b/,
      /\bminimal\s*\/\s*professional\b/,
      /\bminimal professional\b/,
      /\bprofessional minimal\b/,
    ],
  },
  {
    key: "warmEditorial",
    patterns: [
      /\bkforge visual direction:\s*warm\s*\/\s*editorial\b/,
      /\bwarm\s*\/\s*editorial\b/,
      /\bwarm editorial\b/,
      /\beditorial\b/,
    ],
  },
  {
    key: "highContrastDashboard",
    patterns: [
      /\bkforge visual direction:\s*high-?contrast dashboard\b/,
      /\bhigh-?contrast dashboard\b/,
      /\bhigh contrast\b/,
      /\boperational dashboard\b/,
    ],
  },
];

function inferVisualDirection(text = "") {
  if (/\bkforge visual direction:\s*use inferred default\b/.test(text)) {
    return VISUAL_DIRECTION_PRESETS.inferredDefault;
  }

  const matchedSignal = VISUAL_DIRECTION_SIGNALS.find((signal) =>
    hasSignal(text, signal.patterns),
  );

  return matchedSignal
    ? VISUAL_DIRECTION_PRESETS[matchedSignal.key]
    : VISUAL_DIRECTION_PRESETS.inferredDefault;
}

function applyVisualDirectionDna(dna, visualDirectionPreset) {
  const preset = visualDirectionPreset || VISUAL_DIRECTION_PRESETS.inferredDefault;

  if (preset === VISUAL_DIRECTION_PRESETS.inferredDefault) {
    return {
      ...dna,
      visualDirection: preset.label,
      visualDirectionGuidance: preset.guidance,
    };
  }

  return {
    ...dna,
    visualDirection: preset.label,
    visualDirectionGuidance: preset.guidance,
    visualMood: preset.visualMood || dna.visualMood,
    themeMode: preset.themeMode || dna.themeMode,
    accentPalette: preset.accentPalette || dna.accentPalette,
    typographyFeel: preset.typographyFeel || dna.typographyFeel,
    backgroundTreatment: preset.backgroundTreatment || dna.backgroundTreatment,
    cardStyle: preset.cardStyle || dna.cardStyle,
    density: preset.density || dna.density,
    dataDensity: preset.dataDensity || dna.dataDensity,
    avoidStyle:
      `${dna.avoidStyle}; selected visual direction is ${preset.label}, so do not fall back to the usual light/green polished default unless that direction explicitly supports it`,
  };
}

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
  const visualDirection = inferVisualDirection(text);

  if (technicalData) dna = applyTechnicalDataDna(dna);
  if (calculationTool) dna = applyCalculationToolDna(dna);
  if (planning && !technicalData) dna = applyPlanningDna(dna);
  if (progressWellness) dna = applyProgressWellnessDna(dna);
  if (marketing) dna = applyMarketingDna(dna);
  if (editorContent) dna = applyEditorContentDna(dna);
  if (commerce) dna = applyCommerceDna(dna);

  dna = applyVisualDirectionDna(dna, visualDirection);

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
    `- selected visual direction: ${dna.visualDirection}\n` +
    `- visual mood: ${dna.visualMood}\n` +
    `- theme mode: ${dna.themeMode}\n` +
    `- accent palette direction: ${dna.accentPalette}\n` +
    `- typography feel: ${dna.typographyFeel}\n` +
    `- background treatment: ${dna.backgroundTreatment}\n` +
    `- device feel: ${dna.deviceFeel}\n` +
    `- visual direction guidance: ${dna.visualDirectionGuidance}\n` +
    `- anti-sameness guard: ${dna.avoidStyle}\n` +
    "- Visual direction is not a fixed app template. It may guide palette, luminance, card treatment, background treatment, typography feel, and density, but it must not replace the inferred app structure, data model, required workflows, or inspected project evidence.\n" +
    "- responsive fit guard: prevent page-level horizontal scrolling. Top-level shells must use width: min(100%, ...), max-width: calc(100vw - safe padding), box-sizing: border-box, and overflow-x: hidden only as a last-resort page safeguard. Do not make the app shell wider than the viewport.\n" +
    "- responsive grid guard: CSS grids must use minmax(0, 1fr), wrap summary cards at medium widths, and avoid fixed multi-column layouts that exceed the viewport. Header/toolbars must wrap instead of pushing content off-screen.\n" +
    "- table fit guard: wide tables/data grids must live inside an inner scroll container with max-width: 100%; overflow-x: auto; the page itself must not get the horizontal scrollbar.\n" +
    "- Use these concrete design values as direction, not as a fixed generated template.\n" +
    "- The app must still be built from the inspected project evidence and the user's request.\n" +
    "- Do not output a separate design report unless asked."
  );
}
