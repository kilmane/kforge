// src/brains/project-memory.js

const nowIso = () => new Date().toISOString();

export const memoryRelPath = ".kforge/project-memory.json";
export const memoryDirRelPath = ".kforge";

export const defaultMemoryV1 = () => ({
  version: 1,
  updated_at: nowIso(),
  anchors: [],
  decisions: [],
  working_set: [],
});

// ------------------------
// Minimal coercion / validation (v1)
// ------------------------
function coerceMemoryV1(input) {
  if (!input || input.version !== 1) return defaultMemoryV1();

  const anchors = Array.isArray(input.anchors) ? input.anchors : [];
  const decisions = Array.isArray(input.decisions) ? input.decisions : [];
  const workingSet = Array.isArray(input.working_set) ? input.working_set : [];

  return {
    version: 1,
    updated_at:
      typeof input.updated_at === "string" ? input.updated_at : nowIso(),

    anchors: anchors.map((a) => ({
      id: String(a?.id ?? ""),
      title: a?.title ? String(a.title) : undefined,
      content: String(a?.content ?? ""),
      source: a?.source,
    })),

    decisions: decisions.map((d) => ({
      id: String(d?.id ?? ""),
      status:
        d?.status === "approved" ||
        d?.status === "deprecated" ||
        d?.status === "proposed"
          ? d.status
          : "proposed",
      text: String(d?.text ?? ""),
      created_at: typeof d?.created_at === "string" ? d.created_at : nowIso(),
      approved_at:
        typeof d?.approved_at === "string" ? d.approved_at : undefined,
    })),

    working_set: workingSet
      .map((w) => ({
        path: String(w?.path ?? ""),
        note: w?.note ? String(w.note) : undefined,
        added_at: typeof w?.added_at === "string" ? w.added_at : nowIso(),
      }))
      .filter((w) => w.path),
  };
}

// ------------------------
// Load
// ------------------------
export async function loadProjectMemory(projectRootAbs, fs) {
  try {
    const fileAbs = await fs.absJoin(projectRootAbs, memoryRelPath);

    const ok = await fs.exists(fileAbs);
    if (!ok) return defaultMemoryV1();

    const raw = await fs.readTextFile(fileAbs);
    const parsed = JSON.parse(raw);
    return coerceMemoryV1(parsed);
  } catch {
    return defaultMemoryV1();
  }
}

// ------------------------
// Save
// ------------------------
export async function saveProjectMemory(projectRootAbs, fs, memory) {
  const dirAbs = await fs.absJoin(projectRootAbs, memoryDirRelPath);
  const fileAbs = await fs.absJoin(projectRootAbs, memoryRelPath);

  const toWrite = {
    ...memory,
    version: 1,
    updated_at: nowIso(),
  };

  await fs.mkdir(dirAbs);
  await fs.writeTextFile(fileAbs, JSON.stringify(toWrite, null, 2));
}
