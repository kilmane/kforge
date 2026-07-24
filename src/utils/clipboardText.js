const SENSITIVE_FIELD_RE =
  /(?:api[_-]?key|secret|token|password|passwd|pwd|credential|private[_-]?key|access[_-]?key|auth|(?:^|[_-])key(?:$|[_-]))/i;

function padTimePart(value) {
  return String(value).padStart(2, "0");
}

export function formatClipboardTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    padTimePart(date.getHours()),
    padTimePart(date.getMinutes()),
    padTimePart(date.getSeconds()),
  ].join(":");
}

export function redactSensitiveText(value) {
  let text = String(value ?? "");

  text = text.replace(
    /(^|\n)(\s*(?:export\s+|set\s+)?)([A-Za-z][A-Za-z0-9_.-]*)(\s*=\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\r\n]*)/g,
    (match, lineStart, prefix, name, separator) =>
      SENSITIVE_FIELD_RE.test(name)
        ? `${lineStart}${prefix}${name}${separator}[REDACTED]`
        : match,
  );

  text = text.replace(
    /(["']?)([A-Za-z][A-Za-z0-9_.-]*)\1(\s*:\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^,}\r\n]+)/g,
    (match, quote, name, separator) =>
      SENSITIVE_FIELD_RE.test(name)
        ? `${quote}${name}${quote}${separator}[REDACTED]`
        : match,
  );

  text = text.replace(
    /(--([A-Za-z0-9_.-]+)(?:=|\s+))(?:"[^"\s]*"|'[^'\s]*'|\S+)/g,
    (match, prefix, name) =>
      SENSITIVE_FIELD_RE.test(name) ? `${prefix}[REDACTED]` : match,
  );

  text = text.replace(
    /(authorization\s*:\s*(?:bearer|basic)\s+)\S+/gi,
    "$1[REDACTED]",
  );

  text = text.replace(
    /((?:(?:api|access|private|secret|anon)\s+)?(?:key|token|password|credential)\s*(?:is|:|=)\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|\S+)/gi,
    "$1[REDACTED]",
  );

  text = text.replace(
    /(https?:\/\/[^/\s:@]+:)[^@\s/]+(@)/gi,
    "$1[REDACTED]$2",
  );

  text = text.replace(
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    "[REDACTED PRIVATE KEY]",
  );

  const knownSecretPatterns = [
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{8,}\b/g,
    /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{8,}\b/g,
    /\bgh[pousr]_[A-Za-z0-9]{8,}\b/g,
    /\bgithub_pat_[A-Za-z0-9_]{8,}\b/g,
    /\bxox[baprs]-[A-Za-z0-9-]{8,}\b/g,
    /\bnpm_[A-Za-z0-9]{8,}\b/g,
    /\bAKIA[A-Z0-9]{16}\b/g,
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  ];

  knownSecretPatterns.forEach((pattern) => {
    text = text.replace(pattern, "[REDACTED]");
  });

  return text;
}

export function formatLogEntriesForClipboard(entries) {
  if (!Array.isArray(entries)) return "";

  return entries
    .filter(Boolean)
    .map((entry) => {
      const line = String(entry?.line ?? "").trimEnd();
      if (!line.trim()) return "";

      if (entry?.kind === "separator") {
        return line;
      }

      const timestamp = formatClipboardTimestamp(entry?.ts);
      return timestamp ? `[${timestamp}] ${line}` : line;
    })
    .filter(Boolean)
    .join("\n");
}

export function formatTranscriptForClipboard(messages) {
  if (!Array.isArray(messages)) return "";

  return messages
    .filter(Boolean)
    .map((message) => {
      const content = String(message?.content ?? "").trimEnd();
      if (!content.trim()) return "";

      const role = String(message?.role || "system").toLowerCase();
      const roleLabel =
        role === "user" ? "YOU" : role === "assistant" || role === "ai"
          ? "ASSISTANT"
          : role.toUpperCase();
      const timestamp = formatClipboardTimestamp(message?.ts);
      const heading = timestamp
        ? `[${timestamp}] ${roleLabel}`
        : roleLabel;

      return `${heading}\n${content}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
