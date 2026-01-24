// src/ai/tools/handlers/search_in_file.js
import { openFile } from "../../../lib/fs";

function clampInt(n, lo, hi, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  const i = Math.trunc(x);
  return Math.max(lo, Math.min(hi, i));
}

function normalizeBool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return fallback;
}

export async function search_in_file(args = {}) {
  const path = String(args.path || "").trim();
  const query = String(args.query || "").trim();

  if (!path) throw new Error("search_in_file: missing required arg: path");
  if (!query) throw new Error("search_in_file: missing required arg: query");

  const isRegex = normalizeBool(args.isRegex, false);
  const caseSensitive = normalizeBool(args.caseSensitive, false);

  // context lines shown above/below each match
  const context = clampInt(args.context, 0, 3, 0);
  const maxMatches = clampInt(args.maxMatches, 1, 200, 50);

  const raw = await openFile(path);
  const text = String(raw ?? "");
  const lines = text.split(/\r?\n/);

  let re = null;
  if (isRegex) {
    try {
      re = new RegExp(query, caseSensitive ? "" : "i");
    } catch (e) {
      throw new Error(`search_in_file: invalid regex: ${e?.message || String(e)}`);
    }
  }

  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const matched = isRegex
      ? re.test(line)
      : caseSensitive
        ? line.includes(query)
        : line.toLowerCase().includes(query.toLowerCase());

    if (!matched) continue;

    const from = Math.max(0, i - context);
    const to = Math.min(lines.length - 1, i + context);

    const ctx = [];
    for (let j = from; j <= to; j++) {
      ctx.push({
        line: j + 1,
        text: lines[j] ?? "",
        isMatchLine: j === i
      });
    }

    hits.push({
      line: i + 1,
      text: line,
      context: ctx
    });

    if (hits.length >= maxMatches) break;
  }

  const summary =
    `Searched ${lines.length} lines in: ${path}\n` +
    `Query: ${query} (${isRegex ? "regex" : "text"}, ${caseSensitive ? "case-sensitive" : "case-insensitive"})\n` +
    `Matches: ${hits.length}${hits.length >= maxMatches ? ` (capped at ${maxMatches})` : ""}`;

  // Return as a compact string for transcript display (consistent with your other tools).
  // You can switch to structured JSON later if/when you add a richer results UI.
  const out = [summary];

  if (hits.length === 0) {
    out.push("\n(no matches)");
    return out.join("\n");
  }

  out.push("\n--- Matches ---");
  for (const h of hits) {
    out.push(`\nLine ${h.line}: ${h.text}`);
    if (context > 0 && Array.isArray(h.context)) {
      for (const c of h.context) {
        const prefix = c.isMatchLine ? ">" : " ";
        out.push(`${prefix} ${String(c.line).padStart(4, " ")} | ${c.text}`);
      }
    }
  }

  return out.join("\n");
}
