function normalizeText(value = "") {
  return String(value || "").toLowerCase();
}

function escapeRegExp(value = "") {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isLikelySourcePath(path = "") {
  return /\.(jsx?|tsx?|html)$/i.test(String(path || "").trim());
}

function userRequestedDemoData(goal = "") {
  return /\b(demo|sample|starter data|example data|seed(?:ed)? data|mock data)\b/i.test(
    String(goal || ""),
  );
}

function isBookingSchedulingGoal(goal = "") {
  return /\b(booking|appointment|reservation|schedule|scheduling|calendar|client|customer|slot|availability)\b/i.test(
    String(goal || ""),
  );
}

function isLikelyFormIdentifier(name = "") {
  return /\b(form|fields?|input|draft|filter|search|query)\b/i.test(String(name || ""));
}

function isLikelyFormSetter(name = "") {
  return /\bset(?:Form|Fields?|Input|Draft|Filter|Search|Query)\b/.test(
    String(name || ""),
  );
}

function isLikelyAppDataSetter(name = "") {
  return /\bset(?:Appointments?|Bookings?|Reservations?|Schedules?|Events?|Clients?|Customers?|Records?|Items?|Rows?|Tasks?|Data)\b/.test(
    String(name || ""),
  );
}

function isIdentifierAssignedEmptyArray(source = "", identifier = "") {
  const id = escapeRegExp(identifier);
  return new RegExp(
    `\\b(?:const|let|var)\\s+${id}\\s*=\\s*\\[\\s*\\]\\s*[;,]`,
  ).test(String(source || ""));
}

function getArrayInitializerBody(source = "", identifier = "") {
  const id = escapeRegExp(identifier);
  const re = new RegExp(
    `\\b(?:const|let|var)\\s+${id}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*[;,]`,
  );
  const match = re.exec(String(source || ""));
  return match ? String(match[1] || "") : "";
}

function detectUnrequestedNamedDemoRecords(content = "") {
  const source = String(content || "");
  const seedArrayRe =
    /\b(?:initial|seed|sample|demo)[A-Za-z0-9_$]*\s*=\s*\[([\s\S]*?)\]\s*[;,]/gi;
  let match;

  while ((match = seedArrayRe.exec(source)) !== null) {
    const arrayBody = String(match[1] || "");
    if (!arrayBody.trim()) continue;

    const objectRecords = arrayBody.match(/\{[\s\S]*?\}/g) || [];
    if (objectRecords.length < 2) continue;

    const hasPersonField =
      /\b(clientName|customerName|patientName|guestName|attendeeName|contactName|client|customer|patient|guest)\b/.test(
        arrayBody,
      );
    if (!hasPersonField) continue;

    const twoWordNames =
      arrayBody.match(/["'`][A-Z][a-z]+ [A-Z][a-z]+["'`]/g) || [];

    if (twoWordNames.length >= 2) return true;
  }

  return false;
}

function detectAppDataResetRestoresSeed(content = "") {
  const source = String(content || "");
  const resetHandlerRe =
    /\b(?:(?:const|let|var)\s+)?(?:function\s+)?(?:handle|on)?(?:reset|clear)[A-Za-z0-9_$]*\s*(?:=\s*)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*{|{)/gi;
  let match;

  while ((match = resetHandlerRe.exec(source)) !== null) {
    const block = source.slice(match.index, match.index + 1600);
    const setterRe =
      /\b(set[A-Z][A-Za-z0-9_$]*)\s*\(\s*((?:initial|seed|sample|demo)[A-Za-z0-9_$]*)\s*\)/g;
    let setterMatch;

    while ((setterMatch = setterRe.exec(block)) !== null) {
      const setterName = String(setterMatch[1] || "");
      const stateIdentifier = String(setterMatch[2] || "");

      // Resetting an empty form/draft object, for example setForm(initialForm),
      // is valid. The app-data rule is only about restoring user-managed records.
      if (isLikelyFormSetter(setterName) || isLikelyFormIdentifier(stateIdentifier)) {
        continue;
      }

      // Resetting app data to an explicitly empty array is valid.
      if (isIdentifierAssignedEmptyArray(source, stateIdentifier)) {
        continue;
      }

      const arrayBody = getArrayInitializerBody(source, stateIdentifier);
      const restoresRecordArray =
        /\{[\s\S]*?\}/.test(arrayBody) ||
        /\b(clientName|customerName|patientName|guestName|booking|appointment|reservation|serviceType|status|date|time)\b/.test(
          arrayBody,
        );

      if (restoresRecordArray) return true;

      // Seed/sample/demo data identifiers are unsafe for app data even if the
      // initializer shape is hard to prove from a partial model output.
      if (
        /^(seed|sample|demo)/i.test(stateIdentifier) &&
        isLikelyAppDataSetter(setterName)
      ) {
        return true;
      }
    }
  }

  return false;
}

function detectGenericBookingDashboardInsteadOfScheduleSurface(content = "") {
  const source = String(content || "");
  const text = normalizeText(source);

  const hasStrongScheduleSurface =
    /\b(schedule[-_\s]?board|calendar[-_\s]?grid|day[-_\s]?timeline|time[-_\s]?grid|slot[-_\s]?grid|appointment[-_\s]?lane|timeline[-_\s]?panel|agenda[-_\s]?board|availability[-_\s]?grid)\b/.test(
      text,
    );

  const genericPieces = [
    /\bstat(?:s|istic)?[-_\s]?(?:card|grid|panel|item)s?\b/.test(text),
    /\b(form|booking[-_\s]?form|appointment[-_\s]?form)\b/.test(text),
    /\b(list[-_\s]?panel|appointments?[-_\s]?grid|appointments?[-_\s]?list|booking[-_\s]?list|upcoming[-_\s]?list)\b/.test(
      text,
    ),
  ].filter(Boolean).length;

  return genericPieces >= 2 && !hasStrongScheduleSurface;
}

export function evaluateAppBuildQualityGate({
  originalGoal = "",
  toolCall = {},
} = {}) {
  const name = String(toolCall?.name || "").trim();
  const args = toolCall?.args || {};
  const path = String(args?.path || "").trim();
  const content = String(args?.content || "");

  if (name !== "write_file") return { ok: true };
  if (!isLikelySourcePath(path)) return { ok: true };
  if (!isBookingSchedulingGoal(originalGoal)) return { ok: true };

  if (
    !userRequestedDemoData(originalGoal) &&
    detectUnrequestedNamedDemoRecords(content)
  ) {
    return {
      ok: false,
      reason:
        "KForge blocked this app-build write before approval because it introduces unrequested named demo records. Use empty booking data, neutral metrics, and helpful empty states unless demo/sample data was requested.",
    };
  }

  if (detectAppDataResetRestoresSeed(content)) {
    return {
      ok: false,
      reason:
        "KForge blocked this app-build write before approval because the app-data reset appears to restore seeded or starter records. Reset should clear user-managed booking data and derived metrics to empty or neutral values.",
    };
  }

  if (detectGenericBookingDashboardInsteadOfScheduleSurface(content)) {
    return {
      ok: false,
      reason:
        "KForge blocked this app-build write before approval because the booking app still appears to use a generic stats/form/list structure without a calendar, timeline, schedule board, or availability surface as the main organizing view.",
    };
  }

  return { ok: true };
}
