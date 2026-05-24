export const APP_BRIEF_MODE = Object.freeze({
  FREE: "free",
  AI_ASSISTED: "ai_assisted",
});

export const APP_INTENT = Object.freeze({
  NEW_APP: "new_app",
  MODIFY_EXISTING_APP: "modify_existing_app",
  UNKNOWN: "unknown",
});

export const APP_CATEGORY = Object.freeze({
  STATIC_SITE: "static_site",
  INTERACTIVE_WEB_APP: "interactive_web_app",
  FULL_STACK_WEB_APP: "full_stack_web_app",
  MOBILE_APP: "mobile_app",
  UNKNOWN: "unknown",
});

export const STARTER_RECOMMENDATION = Object.freeze({
  VITE_REACT: "vite_react",
  STATIC_HTML: "static_html",
  NEXTJS: "nextjs",
  VITE_REACT_SUPABASE_LATER: "vite_react_supabase_later",
  EXPO: "expo",
  ASK_CLARIFYING_QUESTION: "ask_clarifying_question",
});

export const APP_BRIEF_CONFIDENCE = Object.freeze({
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
});

const EMPTY_APP_BRIEF = Object.freeze({
  mode: APP_BRIEF_MODE.FREE,
  intent: APP_INTENT.UNKNOWN,
  appGoal: "",
  appCategory: APP_CATEGORY.UNKNOWN,
  recommendedStarter: STARTER_RECOMMENDATION.ASK_CLARIFYING_QUESTION,
  confidence: APP_BRIEF_CONFIDENCE.LOW,
  reason: "The app goal is not clear enough to recommend a starter yet.",
  needsBackend: "unknown",
  needsDatabase: "unknown",
  needsAuth: "unknown",
  needsExternalApi: "unknown",
  nextAction: "ask_clarifying_question",
  question: "What kind of app do you want to build?",
});

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s/+.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAnyPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function cleanAppGoal(userText = "") {
  const raw = String(userText || "").trim();

  return raw
    .replace(/^\s*(please\s+)?(can\s+you\s+|could\s+you\s+|help\s+me\s+)\s*/i, "")
    .replace(
      /^\s*(i\s+need|need|i\s+want|want|i\s+would\s+like|would\s+like|i'd\s+like|looking\s+to|trying\s+to)\s+(to\s+)?/i,
      "",
    )
    .replace(
      /^\s*(build|create|make|generate|start|set\s+up)\s+(me\s+)?/i,
      "",
    )
    .replace(/^\s*(an?|the)\s+/i, "")
    .replace(/^\s*app\s+that\s+/i, "an app that ")
    .trim();
}

function isFolderOnlyStatus(text) {
  return (
    hasAnyPattern(text, [
      /\b(created|made|opened|open|ready|empty)\b.*\b(folder|project|directory)\b/,
      /\b(folder|project|directory)\b.*\b(created|made|opened|open|ready|empty)\b/,
    ]) &&
    !hasAnyPattern(text, [
      /\b(build|create|make|generate|app|website|site|page|dashboard|form|calculator|tracker|booking|landing|mobile)\b/,
    ])
  );
}

function normalizeFolderState(folderState = {}) {
  return {
    projectOpen: Boolean(folderState.projectOpen),
    emptyProjectFolder: Boolean(
      folderState.emptyProjectFolder || folderState.isEmptyProjectFolder,
    ),
    noProjectFolderOpen: Boolean(
      folderState.noProjectFolderOpen || folderState.projectOpen === false,
    ),
  };
}

function recommendationLabel(recommendedStarter) {
  if (recommendedStarter === STARTER_RECOMMENDATION.STATIC_HTML) {
    return "simple static HTML/CSS starter";
  }

  if (recommendedStarter === STARTER_RECOMMENDATION.NEXTJS) {
    return "Next.js";
  }

  if (recommendedStarter === STARTER_RECOMMENDATION.VITE_REACT_SUPABASE_LATER) {
    return "Vite + React first, then Supabase through Services later";
  }

  if (recommendedStarter === STARTER_RECOMMENDATION.EXPO) {
    return "Expo/mobile starter";
  }

  if (recommendedStarter === STARTER_RECOMMENDATION.VITE_REACT) {
    return "Vite + React";
  }

  return "ask one focused question first";
}

function buildModelAdviceForBrief() {
  return (
    "Model advice:\n\n" +
    "For this app, KForge recommends using a stronger model from the Provider/Model preset list.\n\n" +
    "Some models are better at harder coding tasks than others.\n\n" +
    "Use a stronger model for login, accounts, databases, mobile apps, full-stack apps, or complex builds.\n" +
    "Use a smaller model only for planning, simple questions, or light help.\n\n" +
    "Models marked as Weak / test only, or models you added yourself, are not recommended for automatic building because they may produce poor code.\n\n" +
    "KForge can help you get started for free by creating the right project template. No AI credits will be used.\n\n" +
    "KForge may recommend:\n" +
    "- Static HTML/CSS/JS for simple websites and landing pages.\n" +
    "- Vite + React for interactive web apps, dashboards, forms, and tools.\n" +
    "- Next.js for full-stack web apps, SEO-friendly sites, and apps with backend features.\n" +
    "- Vite + React first, then Supabase later for apps with login, accounts, saved data, or databases.\n" +
    "- Expo React Native for mobile apps.\n\n" +
    "To begin:\n" +
    "1. Open an empty project folder.\n" +
    "2. Click Preview → Generate.\n" +
    "3. Click Preview → Install.\n" +
    "4. Return to this chat to continue.\n\n" +
    "Notes:\n" +
    "- **Generate** creates the starter template for your project.\n" +
    "- **Install** adds the packages needed by that template.\n" +
    "- After Generate and Install are finished, return to this chat, so KForge can help you continue building your app.\n" +
    "- Or click the button below for the AI-assisted brief.\n\n"
  );
}
export function buildFreeAppBrief({ userText = "", folderState = {} } = {}) {
  const text = normalizeText(userText);
  const appGoal = cleanAppGoal(userText);
  const normalizedFolderState = normalizeFolderState(folderState);

  if (!text || isFolderOnlyStatus(text)) {
    return {
      ...EMPTY_APP_BRIEF,
      folderState: normalizedFolderState,
    };
  }

  const mobileSignals = hasAnyPattern(text, [
    /\b(mobile|phone|ios|android|expo|react native)\b/,
  ]);

  const staticSiteSignals = hasAnyPattern(text, [
    /\b(landing page|brochure|marketing page|portfolio|static site|one page|one-page|simple website)\b/,
  ]);

  const backendSignals = hasAnyPattern(text, [
    /\b(save|saved|store|stored|persist|persistence|database|backend|server|login|auth|account|accounts|user accounts|submissions|supabase)\b/,
  ]);

  const supabaseSignals = /\bsupabase\b/.test(text);

  const nextjsSignals = hasAnyPattern(text, [
    /\b(next\.?js|next js|full[-\s]?stack|server[-\s]?rendered|server[-\s]?side|seo|api routes?|backend features?)\b/,
  ]);

  const externalApiSignals = hasAnyPattern(text, [
    /\b(api|external data|external content|live data|live prices|fetch|fetches|search|find|finding|videos?|ai|artificial intelligence|recommend|recommendation|recommendations|suggest|suggestion|suggestions|menu suggestions|weather|crypto|prayer times)\b/,
  ]);

  const interactiveSignals = hasAnyPattern(text, [
    /\b(app|dashboard|form|calculator|calculate|convert|estimate|track|tracking|log|daily|planner|manager|admin|portal|cards|list|table|chart|ui|interface)\b/,
  ]);

  const likelyAppIntent = hasAnyPattern(text, [
    /\b(build|create|make|generate|start|set up|i need|i want|would like|looking to|trying to)\b/,
  ]);

  if (!likelyAppIntent && !interactiveSignals && !staticSiteSignals && !mobileSignals) {
    return {
      ...EMPTY_APP_BRIEF,
      appGoal,
      folderState: normalizedFolderState,
    };
  }

  if (mobileSignals) {
    return {
      mode: APP_BRIEF_MODE.FREE,
      intent: APP_INTENT.NEW_APP,
      appGoal,
      appCategory: APP_CATEGORY.MOBILE_APP,
      recommendedStarter: STARTER_RECOMMENDATION.EXPO,
      confidence: APP_BRIEF_CONFIDENCE.MEDIUM,
      reason:
        "This sounds mobile-first. A mobile/Expo starter is more suitable than a normal browser-only web starter when KForge supports that route.",
      needsBackend: backendSignals ? "maybe" : "unknown",
      needsDatabase: backendSignals ? "maybe" : "unknown",
      needsAuth: /\b(login|auth|account|accounts|user accounts)\b/.test(text)
        ? "maybe"
        : "unknown",
      needsExternalApi: externalApiSignals ? "maybe" : "unknown",
      nextAction: "recommend_mobile_or_clarify",
      question: null,
      folderState: normalizedFolderState,
    };
  }

  if (nextjsSignals && !supabaseSignals) {
    return {
      mode: APP_BRIEF_MODE.FREE,
      intent: APP_INTENT.NEW_APP,
      appGoal,
      appCategory: APP_CATEGORY.FULL_STACK_WEB_APP,
      recommendedStarter: STARTER_RECOMMENDATION.NEXTJS,
      confidence: APP_BRIEF_CONFIDENCE.HIGH,
      reason:
        "This sounds like a full-stack, SEO-friendly, server-rendered, or Next.js-style app. Next.js is the better starter when backend features, routing, or SEO are central to the app.",
      needsBackend: backendSignals ? "maybe" : "unknown",
      needsDatabase: backendSignals ? "maybe" : "unknown",
      needsAuth: /\b(login|auth|account|accounts|user accounts)\b/.test(text)
        ? "maybe"
        : "unknown",
      needsExternalApi: externalApiSignals ? "maybe" : "unknown",
      nextAction: "generate_nextjs_starter",
      question: null,
      folderState: normalizedFolderState,
    };
  }

  if (backendSignals) {
    return {
      mode: APP_BRIEF_MODE.FREE,
      intent: APP_INTENT.NEW_APP,
      appGoal,
      appCategory: APP_CATEGORY.FULL_STACK_WEB_APP,
      recommendedStarter: STARTER_RECOMMENDATION.VITE_REACT_SUPABASE_LATER,
      confidence: APP_BRIEF_CONFIDENCE.HIGH,
      reason:
        "The frontend can start as a Vite + React app, but saved data, accounts, auth, or persistence need a real backend/database later.",
      needsBackend: "yes",
      needsDatabase: "yes",
      needsAuth: /\b(login|auth|account|accounts|user accounts)\b/.test(text)
        ? "maybe"
        : "unknown",
      needsExternalApi: externalApiSignals ? "maybe" : "unknown",
      nextAction: "generate_frontend_then_services",
      question: null,
      folderState: normalizedFolderState,
    };
  }

  if (staticSiteSignals && !interactiveSignals) {
    return {
      mode: APP_BRIEF_MODE.FREE,
      intent: APP_INTENT.NEW_APP,
      appGoal,
      appCategory: APP_CATEGORY.STATIC_SITE,
      recommendedStarter: STARTER_RECOMMENDATION.STATIC_HTML,
      confidence: APP_BRIEF_CONFIDENCE.HIGH,
      reason:
        "This sounds like a mostly static brochure or marketing page without app state, login, dashboard, or saved data.",
      needsBackend: "no",
      needsDatabase: "no",
      needsAuth: "no",
      needsExternalApi: "no",
      nextAction: "generate_static_starter",
      question: null,
      folderState: normalizedFolderState,
    };
  }

  return {
    mode: APP_BRIEF_MODE.FREE,
    intent: APP_INTENT.NEW_APP,
    appGoal,
    appCategory: APP_CATEGORY.INTERACTIVE_WEB_APP,
    recommendedStarter: STARTER_RECOMMENDATION.VITE_REACT,
    confidence: interactiveSignals
      ? APP_BRIEF_CONFIDENCE.MEDIUM
      : APP_BRIEF_CONFIDENCE.LOW,
    reason:
      "This needs an interactive app starter because the request involves dynamic behaviour, app logic, user input, calculations, data display, external data, or generated results rather than a simple static page. KForge can refine the exact screens and integrations after the starter is generated.",
    needsBackend: "maybe",
    needsDatabase: "unknown",
    needsAuth: "unknown",
    needsExternalApi: externalApiSignals ? "maybe" : "unknown",
    nextAction: "generate_template",
    question: null,
    folderState: normalizedFolderState,
  };
}

export function renderStarterRecommendation(brief = EMPTY_APP_BRIEF, folderState = {}) {
  const finalFolderState = normalizeFolderState({
    ...(brief.folderState || {}),
    ...folderState,
  });

  if (
    brief.recommendedStarter ===
      STARTER_RECOMMENDATION.ASK_CLARIFYING_QUESTION ||
    brief.intent === APP_INTENT.UNKNOWN
  ) {
    if (finalFolderState.noProjectFolderOpen) {
      return (
        "No project folder is open yet.\n\n" +
        "Open or create a project folder in KForge first, then tell me what kind of app you want to build.\n\n" +
        "Examples:\n" +
        "- landing page or simple static site\n" +
        "- todo app, dashboard, form, calculator, or card/list UI\n" +
        "- database-backed app with Supabase\n" +
        "- mobile app"
      );
    }

    return (
      "Your project folder is empty, so there is no app to modify yet.\n\n" +
      "Tell me what you want to build, and I will recommend the right starter/template before we generate anything.\n\n" +
      "Examples:\n" +
      "- landing page or simple static site\n" +
      "- todo app, dashboard, form, calculator, or card/list UI\n" +
      "- database-backed app with Supabase\n" +
      "- mobile app"
    );
  }

  const goalLine = brief.appGoal
    ? `You want to build:\n${brief.appGoal}\n\n`
    : "";

  const modelAdvice = buildModelAdviceForBrief();

  const recommendation =
    `Recommended project template:\n${recommendationLabel(brief.recommendedStarter)}.\n\n` +
    `Why:\n${brief.reason}\n\n` +
    modelAdvice;


  if (finalFolderState.noProjectFolderOpen) {
    return (
      "No project folder is open yet.\n\n" +
      goalLine +
      recommendation
    );
  }

  if (finalFolderState.emptyProjectFolder) {
    return (
      "Your project folder is empty, so there is no app to modify yet.\n\n" +
      goalLine +
      recommendation
    );
  }

  return goalLine + recommendation;
}
