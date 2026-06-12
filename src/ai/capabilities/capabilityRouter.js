import { KFORGE_SERVICE_WORKFLOWS } from "./kforgeServiceWorkflows";

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text, values = []) {
  return values.some((value) => text.includes(value));
}

function hasWord(text, word) {
  return new RegExp(`\\b${word}\\b`, "i").test(text);
}

function hasAnyWord(text, words = []) {
  return words.some((word) => hasWord(text, word));
}

function buildServiceTrigger(serviceId, overrides = {}) {
  const workflow = KFORGE_SERVICE_WORKFLOWS?.[serviceId] || {};
  const route = workflow.route || overrides.serviceRouteLabel || "Services";
  const label = workflow.name || overrides.serviceLabel || serviceId;

  return {
    service: serviceId,
    serviceLabel: label,
    serviceRouteLabel: route.replaceAll("->", "→"),
    openLabel: overrides.openLabel || `Open ${label} service now`,
    wordingLabel: overrides.wordingLabel || label,
  };
}

function hasManualBypassIntent(text) {
  return hasAny(text, [
    "manual",
    "manually",
    "manual steps",
    "just explain",
    "explain manually",
    "give me the commands",
    "don't use kforge",
    "do not use kforge",
    "without kforge",
    "bypass kforge",
  ]);
}

function hasDeferredOrPlanningIntent(text) {
  return (
    hasAny(text, [
      "later",
      "eventually",
      "in the future",
      "future",
      "not now",
      "after the frontend",
      "after frontend",
      "plan for",
      "plan to",
      "planning",
      "blueprint",
      "roadmap",
    ]) ||
    /\b(will|would|should)\s+(need|use|have)\b/.test(text)
  );
}

function hasBroaderAppPlanningShape(text) {
  return (
    hasAnyWord(text, [
      "build",
      "create",
      "make",
      "develop",
      "design",
      "plan",
      "blueprint",
      "roadmap",
      "architecture",
      "scaffold",
      "implement",
    ]) ||
    hasAny(text, [
      "i want to build",
      "i need to build",
      "help me build",
      "build me",
      "app called",
      "full-stack app",
      "serious app",
    ])
  );
}

function hasServiceActionShape(text) {
  return (
    hasAnyWord(text, [
      "add",
      "use",
      "connect",
      "configure",
      "setup",
      "enable",
      "integrate",
      "incorporate",
      "include",
      "install",
      "check",
      "debug",
      "fix",
      "troubleshoot",
      "open",
      "show",
      "launch",
    ]) ||
    /\bset\s+up\b/.test(text) ||
    /\bcan\s+(my|the|this)?\s*(app|project|site|website)?\s*(use|have|connect)\b/.test(text) ||
    /\bis\s+it\s+possible\s+to\s+have\b/.test(text) ||
    /\bhow\s+do\s+i\s+(connect|add|use|set\s+up|configure|integrate)\b/.test(text)
  );
}

function getAiServiceCapability(text) {
  const mentionsAi =
    hasAnyWord(text, [
      "ai",
      "openai",
      "llm",
      "chatbot",
      "assistant",
      "embedding",
      "embeddings",
    ]) || hasAny(text, ["artificial intelligence", "text generation", "image generation"]);

  if (!mentionsAi) return null;

  if (hasDeferredOrPlanningIntent(text)) {
    return {
      kind: "feature_blueprint",
      confidence: "medium",
      source: "capability_router_ai_deferred_plan",
    };
  }

  if (hasServiceActionShape(text)) {
    return {
      kind: "openai_service",
      confidence: hasWord(text, "openai") ? "high" : "medium",
      source: "capability_router_ai_service",
    };
  }

  return {
    kind: "ambiguous_service_trigger",
    confidence: "medium",
    source: "capability_router_ai_confirmation",
    serviceTrigger: buildServiceTrigger("openai", {
      openLabel: "Use Services → AI → OpenAI",
      wordingLabel: hasWord(text, "openai") ? "OpenAI" : "AI",
    }),
  };
}

function getSupabaseCapability(text) {
  if (!hasWord(text, "supabase")) return null;

  if (hasDeferredOrPlanningIntent(text) && hasBroaderAppPlanningShape(text)) {
    return {
      kind: "feature_blueprint",
      confidence: "medium",
      source: "capability_router_supabase_deferred_plan",
    };
  }

  const serviceAction = hasServiceActionShape(text);

  return {
    kind: serviceAction ? "supabase_service" : "ambiguous_service_trigger",
    confidence: serviceAction ? "high" : "medium",
    source: serviceAction
      ? "capability_router_supabase_service"
      : "capability_router_supabase_confirmation",
    serviceTrigger: buildServiceTrigger("supabase", {
      openLabel: "Open Backend service now",
      wordingLabel: "Backend/Supabase",
    }),
  };
}

function getPaymentsCapability(text) {
  const mentionsPayments =
    hasWord(text, "stripe") ||
    hasAnyWord(text, [
      "payment",
      "payments",
      "checkout",
      "billing",
      "subscription",
      "subscriptions",
    ]);

  if (!mentionsPayments) return null;

  const payrollContext = hasAnyWord(text, [
    "employee",
    "employees",
    "payroll",
    "salary",
    "salaries",
    "wage",
    "wages",
    "tax",
    "taxes",
    "deductions",
    "payslip",
    "payslips",
  ]);

  if (payrollContext && !hasWord(text, "stripe")) return null;

  if (hasDeferredOrPlanningIntent(text)) {
    return {
      kind: "feature_blueprint",
      confidence: "medium",
      source: "capability_router_payments_deferred_plan",
    };
  }

  const serviceAction = hasServiceActionShape(text);

  return {
    kind: serviceAction ? "stripe_service" : "ambiguous_service_trigger",
    confidence: serviceAction ? "high" : "medium",
    source: serviceAction
      ? "capability_router_stripe_service"
      : "capability_router_stripe_confirmation",
    serviceTrigger: buildServiceTrigger("stripe"),
  };
}

function getDeployCapability(text) {
  const mentionsDeploy =
    hasAnyWord(text, [
      "deploy",
      "deployment",
      "publish",
      "host",
      "hosting",
      "vercel",
      "netlify",
    ]) || hasAny(text, ["go live", "make it live", "make this live", "put it online"]);

  if (!mentionsDeploy) return null;

  if (hasDeferredOrPlanningIntent(text)) {
    return {
      kind: "feature_blueprint",
      confidence: "medium",
      source: "capability_router_deploy_deferred_plan",
    };
  }

  return {
    kind: "deploy_service",
    confidence: "high",
    source: "capability_router_deploy_service",
  };
}

export function getCapabilityRouteDecision(text = "", options = {}) {
  const s = normalizeText(text);
  if (!s) return null;
  if (hasManualBypassIntent(s)) return null;

  const projectOpen = Boolean(options.projectOpen);
  const emptyProjectFolder = Boolean(options.emptyProjectFolder);

  if (!projectOpen || emptyProjectFolder) return null;

  const checks = [
    getAiServiceCapability,
    getSupabaseCapability,
    getPaymentsCapability,
    getDeployCapability,
  ];

  for (const check of checks) {
    const result = check(s);
    if (result) return result;
  }

  return null;
}
