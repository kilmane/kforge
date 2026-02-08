// src/brains/project-memory.ts

export type ProjectMemoryV1 = {
  version: 1;
  updated_at: string;
  anchors: Array<{
    id: string;
    title?: string;
    content: string;
    source?: {
      type: "chat";
      turn_id?: string;
      created_at?: string;
    };
  }>;
  decisions: Array<{
    id: string;
    status: "proposed" | "approved" | "deprecated";
    text: string;
    created_at: string;
    approved_at?: string;
  }>;
  working_set: Array<{
    path: string;
    note?: string;
    added_at: string;
  }>;
};

export type FsAdapter = {
  readTextFile: (absPath: string) => Promise<string>;
  writeTextFile: (absPath: string, contents: string) => Promise<void>;
  mkdir: (absDirPath: string) => Promise<void>;
  exists: (absPath: string) => Promise<boolean>;
  absJoin: (rootAbs: string, rel: string) => Promise<string>;
};

const nowIso = () => new Date().toISOString();

export const memoryRelPath = ".kforge/project-memory.json";
export const memoryDirRelPath = ".kforge";

export const defaultMemoryV1 = (): ProjectMemoryV1 => ({
  version: 1,
  updated_at: nowIso(),
  anchors: [],
  decisions: [],
  working_set: [],
});

// ------------------------
// Minimal coercion / validation (v1)
// ------------------------
function coerceMemoryV1(input: any): ProjectMemoryV1 {
  if (!input || input.version !== 1) {
    return defaultMemoryV1();
  }

  const anchors = Array.isArray(input.anchors) ? input.anchors : [];
  const decisions = Array.isArray(input.decisions) ? input.decisions : [];
  const workingSet = Array.isArray(input.working_set) ? input.working_set : [];

  return {
    version: 1,
    updated_at:
      typeof input.updated_at === "string" ? input.updated_at : nowIso(),

    anchors: anchors.map((a: any) => ({
      id: String(a.id ?? ""),
      title: a.title ? String(a.title) : undefined,
      content: String(a.content ?? ""),
      source: a.source,
    })),

    decisions: decisions.map((d: any) => ({
      id: String(d.id ?? ""),
      status:
        d.status === "approved" ||
        d.status === "deprecated" ||
        d.status === "proposed"
          ? d.status
          : "proposed",
      text: String(d.text ?? ""),
      created_at: typeof d.created_at === "string" ? d.created_at : nowIso(),
      approved_at:
        typeof d.approved_at === "string" ? d.approved_at : undefined,
    })),

    working_set: workingSet
      .map((w: any) => ({
        path: String(w.path ?? ""),
        note: w.note ? String(w.note) : undefined,
        added_at: typeof w.added_at === "string" ? w.added_at : nowIso(),
      }))
      .filter((w: any) => w.path),
  };
}

// ------------------------
// Load
// ------------------------
export async function loadProjectMemory(
  projectRootAbs: string,
  fs: FsAdapter,
): Promise<ProjectMemoryV1> {
  try {
    const fileAbs = await fs.absJoin(projectRootAbs, memoryRelPath);

    const exists = await fs.exists(fileAbs);
    if (!exists) {
      return defaultMemoryV1();
    }

    const raw = await fs.readTextFile(fileAbs);
    const parsed = JSON.parse(raw);
    return coerceMemoryV1(parsed);
  } catch {
    // Calm failure: never break the app
    return defaultMemoryV1();
  }
}

// ------------------------
// Save
// ------------------------
export async function saveProjectMemory(
  projectRootAbs: string,
  fs: FsAdapter,
  memory: ProjectMemoryV1,
): Promise<void> {
  const dirAbs = await fs.absJoin(projectRootAbs, memoryDirRelPath);
  const fileAbs = await fs.absJoin(projectRootAbs, memoryRelPath);

  const toWrite: ProjectMemoryV1 = {
    ...memory,
    version: 1,
    updated_at: nowIso(),
  };

  await fs.mkdir(dirAbs);
  await fs.writeTextFile(fileAbs, JSON.stringify(toWrite, null, 2));
}
