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
    "- Request safe file writes through KForge tools only.\n" +
    "- Do not claim Preview, build, tests, deployment, or service setup unless evidence exists.\n\n" +
    "Inspected project evidence:\n\n" +
    (evidence || "(No inspected evidence was captured.)")
  );
}