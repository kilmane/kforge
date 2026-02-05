// src/ai/remotePresets.js
// Phase 3.8 (v0): fetch + validate + cache remote presets safely.
// Phase 3.13: automatic refresh strategy + preserve v1 fields (cost/usage) for UI tags.
// v0 schema per entry: { id: string, tier: string, note?: string }
// v1-ish remote entries may include: { id, usage, cost, note, ... } (we preserve cost/usage)
// Top-level schema expected: { providers: { [providerId]: Array<entry> }, updated_at?: string }

const REMOTE_PRESETS_URL = "https://kilmane.github.io/kforge/presets.json";

// Cache (frontend localStorage). Keep simple + silent.
const CACHE_KEY_V0 = "kforge.remote_presets.v0";
const CACHE_SCHEMA_VERSION = "v0";

function isPlainObject(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function safeLocalStorage() {
  try {
    if (typeof window === "undefined") return null;
    if (!window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseIsoMs(s) {
  const t = Date.parse(typeof s === "string" ? s : "");
  return Number.isFinite(t) ? t : 0;
}

/**
 * Normalize a single entry.
 * - Requires id + (tier OR usage) (compat: usage -> tier)
 * - Preserves optional v1 fields (usage, cost) for UI tags.
 */
function normalizeEntry(raw) {
  if (!isPlainObject(raw)) return null;

  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const tierRaw =
    (typeof raw.tier === "string" && raw.tier.trim()) ||
    (typeof raw.usage === "string" && raw.usage.trim()) ||
    "";
  const tier = tierRaw;

  const note =
    typeof raw.note === "string" && raw.note.trim().length > 0
      ? raw.note.trim()
      : undefined;

  const usage =
    typeof raw.usage === "string" && raw.usage.trim().length > 0
      ? raw.usage.trim()
      : undefined;

  const cost =
    typeof raw.cost === "string" && raw.cost.trim().length > 0
      ? raw.cost.trim()
      : undefined;

  if (!id || !tier) return null;

  // Preserve v1 fields for Phase 3.13 UI.
  const out = { id, tier };
  if (note) out.note = note;
  if (usage) out.usage = usage;
  if (cost) out.cost = cost;
  return out;
}

/**
 * Validate the remote JSON payload.
 * Returns: { providers: Record<string, Array<entry>>, updated_at?: string }
 * where entry is at least {id,tier} and may include {note,usage,cost}.
 * Returns null if invalid/unusable.
 */
export function validateRemotePresetsV0(payload) {
  if (!isPlainObject(payload)) return null;
  if (!isPlainObject(payload.providers)) return null;

  const outProviders = {};
  for (const [providerId, arr] of Object.entries(payload.providers)) {
    if (typeof providerId !== "string" || providerId.trim() === "") continue;
    if (!Array.isArray(arr)) continue;

    const cleaned = [];
    for (const item of arr) {
      const entry = normalizeEntry(item);
      if (entry) cleaned.push(entry);
    }

    // Only keep providers that have at least 1 valid entry.
    if (cleaned.length > 0) outProviders[providerId] = cleaned;
  }

  if (Object.keys(outProviders).length === 0) return null;

  const updated_at =
    typeof payload.updated_at === "string" && payload.updated_at.trim()
      ? payload.updated_at.trim()
      : undefined;

  return updated_at
    ? { providers: outProviders, updated_at }
    : { providers: outProviders };
}

/**
 * Fetch remote presets with a timeout. Never throws.
 * Returns validated object from validateRemotePresetsV0(), or null.
 */
export async function fetchRemotePresetsV0({
  url = REMOTE_PRESETS_URL,
  timeoutMs = 2500,
} = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const json = await res.json();
    return validateRemotePresetsV0(json);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Load cached presets (v0) from localStorage. Never throws.
 * Returns: { providers, updated_at?, cached_at } or null.
 */
export function loadCachedRemotePresetsV0() {
  const ls = safeLocalStorage();
  if (!ls) return null;

  try {
    const raw = ls.getItem(CACHE_KEY_V0);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) return null;
    if (parsed.schema_version !== CACHE_SCHEMA_VERSION) return null;
    if (!parsed.payload) return null;

    const validated = validateRemotePresetsV0(parsed.payload);
    if (!validated) return null;

    const cached_at =
      typeof parsed.cached_at === "string" && parsed.cached_at.trim()
        ? parsed.cached_at.trim()
        : undefined;

    return cached_at
      ? { ...validated, cached_at }
      : { ...validated, cached_at: null };
  } catch {
    return null;
  }
}

/**
 * Save validated presets (v0) to localStorage. Never throws.
 */
export function saveCachedRemotePresetsV0(validatedPresets) {
  const ls = safeLocalStorage();
  if (!ls) return;

  try {
    // Only cache validated structure.
    const payload = validateRemotePresetsV0(validatedPresets);
    if (!payload) return;

    const record = {
      schema_version: CACHE_SCHEMA_VERSION,
      cached_at: new Date().toISOString(),
      payload,
    };

    ls.setItem(CACHE_KEY_V0, JSON.stringify(record));
  } catch {
    // Silent by design.
  }
}

function shouldReplaceCache({ cached, fresh }) {
  // If no cache, take fresh.
  if (!cached) return true;
  if (!fresh) return false;

  const cachedMs = parseIsoMs(cached.updated_at);
  const freshMs = parseIsoMs(fresh.updated_at);

  // If fresh has no updated_at, keep cache (prevents thrash).
  if (!freshMs) return false;

  // If cache has no updated_at but fresh does, prefer fresh.
  if (!cachedMs && freshMs) return true;

  // Replace only if remote is newer.
  return freshMs > cachedMs;
}

/**
 * Preferred helper for Phase 3.8/3.13 wiring:
 * - load cache first (fast)
 * - try remote fetch (fast timeout)
 * - if remote valid + newer(updated_at): cache + return remote
 * - else: return cached (if valid)
 * - else: return null (caller falls back to compiled presets)
 *
 * Notes:
 * - This eliminates manual cache clears for users (Option A).
 * - In dev, we append a cache-busting ts= to dodge GH Pages/CDN caching during testing.
 */
export async function fetchRemotePresetsV0WithCache(opts = {}) {
  const cached = loadCachedRemotePresetsV0();

  const isDev =
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "development";

  const url =
    opts.url ||
    (isDev ? `${REMOTE_PRESETS_URL}?ts=${Date.now()}` : REMOTE_PRESETS_URL);

  const fresh = await fetchRemotePresetsV0({ ...opts, url });

  if (fresh && shouldReplaceCache({ cached, fresh })) {
    saveCachedRemotePresetsV0(fresh);
    return { ...fresh, cached_at: new Date().toISOString() };
  }

  // If fresh exists but is older (or missing updated_at), keep cache if present.
  if (cached) return cached;

  // No cache available: if we got a valid fresh payload (but chose not to replace),
  // return it anyway. (This case mainly happens when fresh has no updated_at.)
  if (fresh) {
    saveCachedRemotePresetsV0(fresh);
    return { ...fresh, cached_at: new Date().toISOString() };
  }

  return null;
}

export const REMOTE_PRESETS = {
  url: REMOTE_PRESETS_URL,
  version: "v0",
  cacheKey: CACHE_KEY_V0,
};
