const DEFAULT_APP_BUILD_INSPECTION_QUEUE = [
  "package.json",
  "src/App.jsx",
  "src/App.js",
  "src/main.jsx",
  "src/App.css",
  "src/index.css",
];

export const APP_BUILD_JOB_STATUS = Object.freeze({
  CREATED: "created",
  INSPECTION_PENDING: "inspection_pending",
  INSPECTION_COMPLETE: "inspection_complete",
  IMPLEMENTATION_PROMPT_READY: "implementation_prompt_ready",
  BLOCKED: "blocked",
});

function createAppBuildJobId() {
  return `app_build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePath(path = "") {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

function normalizePathKey(path = "") {
  return normalizePath(path).toLowerCase();
}

function uniqueNormalizedPaths(paths = []) {
  const seen = new Set();
  const out = [];

  for (const item of Array.isArray(paths) ? paths : []) {
    const path = normalizePath(item);
    const key = normalizePathKey(path);
    if (!path || seen.has(key)) continue;

    seen.add(key);
    out.push(path);
  }

  return out;
}

function sanitizeEvidenceText(value = "", maxChars = 8000) {
  const text = String(value || "");
  if (text.length <= maxChars) return text;

  return (
    text.slice(0, maxChars) +
    `\n\n[truncated: ${text.length - maxChars} additional characters omitted]`
  );
}

function getInspectionItems(job = {}) {
  return Array.isArray(job.inspections) ? job.inspections : [];
}

function getInspectionPathKeySet(job = {}) {
  return new Set(
    getInspectionItems(job)
      .map((item) => normalizePathKey(item?.path))
      .filter(Boolean),
  );
}

function deriveStatus(job = {}) {
  if (job.status === APP_BUILD_JOB_STATUS.BLOCKED) {
    return APP_BUILD_JOB_STATUS.BLOCKED;
  }

  return isAppBuildInspectionComplete(job)
    ? APP_BUILD_JOB_STATUS.INSPECTION_COMPLETE
    : APP_BUILD_JOB_STATUS.INSPECTION_PENDING;
}

export function createAppBuildJob(seed = {}) {
  const originalGoal = String(seed.originalGoal || "").trim();
  const inspectionQueue = uniqueNormalizedPaths(
    Array.isArray(seed.inspectionQueue) && seed.inspectionQueue.length > 0
      ? seed.inspectionQueue
      : DEFAULT_APP_BUILD_INSPECTION_QUEUE,
  );

  const job = {
    jobId: String(seed.jobId || "").trim() || createAppBuildJobId(),
    originalGoal,
    detectedTemplateName: String(seed.detectedTemplateName || "").trim(),
    detectedKind: String(seed.detectedKind || "").trim(),
    status: seed.status || APP_BUILD_JOB_STATUS.CREATED,
    createdAt: Number(seed.createdAt || Date.now()),
    updatedAt: Number(seed.updatedAt || Date.now()),
    inspectionQueue,
    inspections: Array.isArray(seed.inspections) ? seed.inspections : [],
  };

  return {
    ...job,
    status: deriveStatus(job),
  };
}

export function getAppBuildInspectionQueue(job = {}) {
  const current = createAppBuildJob(job);
  const seen = getInspectionPathKeySet(current);

  return current.inspectionQueue.filter((path) => {
    const key = normalizePathKey(path);
    return key && !seen.has(key);
  });
}

export function rememberAppBuildInspectionResult(
  job = {},
  { path = "", ok = false, result = "", error = "" } = {},
) {
  const current = createAppBuildJob(job);
  const cleanPath = normalizePath(path);
  if (!cleanPath) return current;

  const key = normalizePathKey(cleanPath);
  const nextInspection = {
    path: cleanPath,
    ok: !!ok,
    result: ok ? sanitizeEvidenceText(result) : "",
    error: ok ? "" : String(error || "Read failed").trim(),
    inspectedAt: Date.now(),
  };

  const inspections = [
    ...getInspectionItems(current).filter(
      (item) => normalizePathKey(item?.path) !== key,
    ),
    nextInspection,
  ];

  const nextJob = {
    ...current,
    inspections,
    updatedAt: Date.now(),
  };

  return {
    ...nextJob,
    status: deriveStatus(nextJob),
  };
}

export function isAppBuildInspectionComplete(job = {}) {
  const current = {
    ...job,
    inspectionQueue:
      Array.isArray(job.inspectionQueue) && job.inspectionQueue.length > 0
        ? job.inspectionQueue
        : DEFAULT_APP_BUILD_INSPECTION_QUEUE,
  };
  const seen = getInspectionPathKeySet(current);

  return current.inspectionQueue.every((path) => {
    const key = normalizePathKey(path);
    return !key || seen.has(key);
  });
}

export function getAppBuildSuccessfulInspectedPaths(job = {}) {
  return uniqueNormalizedPaths(
    getInspectionItems(job)
      .filter((item) => item?.ok)
      .map((item) => item.path),
  );
}

export function summarizeAppBuildInspection(job = {}) {
  const current = createAppBuildJob(job);
  const inspections = getInspectionItems(current);
  const okItems = inspections.filter((item) => item?.ok);
  const missingItems = inspections.filter((item) => !item?.ok);

  const lines = [
    "App-build startup inspection:",
    "",
    okItems.length > 0
      ? "Read successfully:\n- " + okItems.map((item) => item.path).join("\n- ")
      : "Read successfully: none yet",
    "",
    missingItems.length > 0
      ? "Missing or unreadable:\n- " +
        missingItems
          .map((item) =>
            item.error ? `${item.path} — ${item.error}` : item.path,
          )
          .join("\n- ")
      : "Missing or unreadable: none recorded",
  ];

  return lines.join("\n");
}

export function buildAppBuildImplementationPrompt(job = {}) {
  const current = createAppBuildJob(job);
  const inspections = getInspectionItems(current);
  const evidence = inspections
    .map((item) => {
      if (!item?.ok) {
        return `### ${item.path}\nUnreadable or missing: ${item.error || "Read failed"}`;
      }

      return `### ${item.path}\n${sanitizeEvidenceText(item.result, 12000)}`;
    })
    .join("\n\n");

  return (
    "Start a controlled app-build implementation from inspected project evidence.\n\n" +
    `Original app request:\n${current.originalGoal}\n\n` +
    "Rules:\n" +
    "- Treat this as a broad frontend app-build job, not a tiny wording edit.\n" +
    "- Use the inspected evidence below; do not repeat broad discovery.\n" +
    "- Preserve the existing project stack and local build simplicity.\n" +
    "- Emit exactly one valid fenced ```tool``` block next.\n" +
    "- Request one write_file tool call for one inspected source/style file that advances the next safe app-build step.\n" +
    "- Do not present the app as complete after a markup/source write if the coherent polished UI still needs a style/CSS pass.\n" +
    "- If JSX/HTML introduces className/layout hooks that are not already styled by inspected CSS, the next app-build step must target the relevant inspected CSS/style file.\n" +
    "- For polished dark, vibrant, glass, gradient, or image-backed layouts, ensure hero titles, headings, labels, controls, and card text have explicit high-contrast colors against their immediate backgrounds; do not rely on starter/global heading defaults.\n" +
    "- For app dashboards, use compact functional headers: make the app name/title the primary header identity; slogans or motivational lines should be smaller supporting text or omitted, not the largest visual element. Keep nearby key metrics/actions, then the main workflow; avoid long sentence-style hero headlines, giant marketing copy, viewport-scaled typography, negative tracking, or tall hero blocks unless the original request explicitly asks for a landing page.\n" +
    "- Compose the first screen as a usable app view: keep the core interactive workflow, key controls, and requested summary/progress/streak widgets visible or clearly reachable without making the hero the whole experience.\n" +
    "- Preserve requested visual summary widgets such as streaks, progress, totals, charts, or status cards when polishing layout or styles; make them visually rich but compact, and do not drop them to simplify the page.\n" +
    "- Summary, streak, progress, total, and status metrics must be truthfully derived from user-managed data, or clearly labeled as demo/sample data; do not use fake non-zero defaults such as minimum streaks or inflated progress for a clean user state.\n" +
    "- If user-managed data is empty, derived metrics should normally show zero, neutral, or empty-state values instead of fake activity.\n" +
    "- If list items have status, completion, stage, priority, progress, or workflow state, provide visible item-level controls to update those states, and make summaries/progress respond to those updates.\n" +
    "- For data-entry apps, include a form-only clear/reset control near the submit action when useful, and keep it separate from app-data reset: form clear/reset should only clear current input fields, while app-data clear/reset should clear user-managed app data and reset visible derived metrics.\n" +
    "- Important destructive app-data reset actions should be visible and understandable, preferably in a top-level toolbar/header or near app-level summaries, but styled as secondary/destructive rather than the primary positive action.\n" +
    "- Basic add/create/edit flows must be usable: valid submits should update visible state, required fields should be obvious, date/number/select fields should have sensible defaults when useful, and blocked submits should show simple inline feedback instead of silently doing nothing.\n" +
    "- If sample/demo data is used, keep it separate from user-managed state, clearly label it as demo data, or provide a prominent clear/reset demo-data action.\n" +
    "- write_file content must be the complete full file text, not a fragment, placeholder, or abbreviated patch.\n" +
    "- Do not claim Preview, build, tests, deployment, or service setup unless evidence exists.\n\n" +
    "Inspected project evidence:\n\n" +
    (evidence || "(No inspected evidence was captured.)")
  );
}