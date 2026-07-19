export const SMALL_CONTROL_EDIT_LABEL = "Prepare safe small control edit";

const SMALL_CONTROL_TARGET_PATHS = Object.freeze([
  "src/app.jsx",
  "src/app.js",
  "app/page.jsx",
  "app/page.tsx",
]);

function normalizePathKey(path = "") {
  return String(path || "").trim().replace(/\\/g, "/").toLowerCase();
}

function normalizeText(value = "") {
  return String(value || "").toLowerCase().trim();
}

export function getSmallControlEditOperation(goal = "") {
  const text = normalizeText(goal);
  const isExistingControlCopyChange =
    /\b(change|rename|update|replace|edit)\b[\s\S]{0,80}\b(label|text|wording|caption|copy)\b/.test(
      text,
    ) ||
    /\b(label|text|wording|caption|copy)\b[\s\S]{0,80}\b(change|rename|update|replace|edit)\b/.test(
      text,
    );

  if (isExistingControlCopyChange) {
    return {
      ok: false,
      kind: "",
      label: "",
      reason:
        "Changing an existing control label or text is not a reset-form creation edit.",
    };
  }

  if (
    /\b(reset|clear|clears|clearing)\b/.test(text) &&
    /\b(form|input|field|fields|control|button)\b/.test(text)
  ) {
    return {
      ok: true,
      kind: "reset_form",
      label: /\bclear/.test(text) && !/\breset\b/.test(text)
        ? "Clear form"
        : "Reset form",
    };
  }

  return {
    ok: false,
    kind: "",
    label: "",
    reason:
      "This small-control executor currently supports only safe reset/clear form edits after inspection.",
  };
}

export function isSmallControlEditGoal(goal = "") {
  return getSmallControlEditOperation(goal).ok;
}

function findResettableFormState(content = "") {
  const statePattern =
    /const\s*\[\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\]\s*=\s*useState\s*\(\s*([^)]+?)\s*\)\s*;/g;

  const candidates = [];
  let match;

  while ((match = statePattern.exec(content))) {
    candidates.push({
      stateName: match[1],
      setterName: match[2],
      initialValue: match[3].trim(),
      score:
        (/\bform\b/i.test(match[1]) ? 10 : 0) +
        (/empty|default|initial/i.test(match[3]) ? 5 : 0),
    });
  }

  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => b.score - a.score)[0];
}

function findFirstSubmittedFormRange(content = "") {
  const formOpenPattern = /<form\b[^>]*>/gi;
  let match;

  while ((match = formOpenPattern.exec(content))) {
    const openTag = match[0];
    const openIndex = match.index;
    const closeIndex = content.indexOf("</form>", formOpenPattern.lastIndex);

    if (closeIndex < 0) continue;
    if (!/\bonSubmit=\{[^}]+\}/.test(openTag)) continue;

    const closeLineStartIndex = content.lastIndexOf("\n", closeIndex) + 1;
    const closeLinePrefix = content.slice(closeLineStartIndex, closeIndex);
    const closeIndentMatch = closeLinePrefix.match(/^\s*$/);
    const closeIndent = closeIndentMatch ? closeLinePrefix : "";

    return {
      openIndex,
      closeIndex,
      closeLineStartIndex,
      closeIndent,
      closeEndIndex: closeIndex + "</form>".length,
      openTag,
      body: content.slice(formOpenPattern.lastIndex, closeIndex),
    };
  }

  return null;
}

function chooseExistingButtonClass(content = "") {
  if (/className=["']ghost-button["']/.test(content)) return ' className="ghost-button"';
  if (/className=["']secondary-button["']/.test(content)) return ' className="secondary-button"';
  if (/className=["']outline-button["']/.test(content)) return ' className="outline-button"';

  return "";
}

function hasExistingResetControl(content = "") {
  return (
    /\bfunction\s+(reset|clear)[A-Za-z0-9_$]*\s*\(/i.test(content) ||
    /\bonClick=\{(?:reset|clear)[A-Za-z0-9_$]*\}/i.test(content) ||
    />\s*(Reset|Clear)\s+form\s*</i.test(content)
  );
}

export function canUseSmallControlEdit({
  goal = "",
  path = "",
  currentContent = "",
} = {}) {
  const operation = getSmallControlEditOperation(goal);
  const pathKey = normalizePathKey(path);
  const content = String(currentContent || "");

  if (!operation.ok) {
    return {
      ok: false,
      reason: operation.reason,
    };
  }

  if (!SMALL_CONTROL_TARGET_PATHS.includes(pathKey)) {
    return {
      ok: false,
      reason: "The inspected file is not a supported React app entry file.",
    };
  }

  if (!content.trim()) {
    return {
      ok: false,
      reason: "The current app file content is empty or unavailable.",
    };
  }

  if (hasExistingResetControl(content)) {
    return {
      ok: false,
      reason: "A reset/clear form control already appears to exist.",
    };
  }

  if (operation.kind === "reset_form") {
    const formState = findResettableFormState(content);
    if (!formState) {
      return {
        ok: false,
        reason: "No resettable React form state was found in the inspected file.",
      };
    }

    const formRange = findFirstSubmittedFormRange(content);
    if (!formRange) {
      return {
        ok: false,
        reason: "No submitted form element was found in the inspected file.",
      };
    }

    if (!/\breturn\s*\(/.test(content)) {
      return {
        ok: false,
        reason: "The inspected React component return block was not found.",
      };
    }
  }

  return {
    ok: true,
    reason: "The inspected file matches a supported small control edit pattern.",
  };
}

export function buildSmallControlEdit({
  goal = "",
  path = "",
  currentContent = "",
} = {}) {
  const operation = getSmallControlEditOperation(goal);
  const suitability = canUseSmallControlEdit({
    goal,
    path,
    currentContent,
  });

  const content = String(currentContent || "");

  if (!operation.ok || !suitability.ok) {
    return {
      ok: false,
      reason: suitability.reason || operation.reason,
      path: String(path || "").trim(),
      nextContent: content,
    };
  }

  if (operation.kind !== "reset_form") {
    return {
      ok: false,
      reason: "Unsupported small control edit operation.",
      path: String(path || "").trim(),
      nextContent: content,
    };
  }

  const formState = findResettableFormState(content);
  const formRange = findFirstSubmittedFormRange(content);

  if (!formState || !formRange) {
    return {
      ok: false,
      reason: "The inspected file no longer matches the supported form pattern.",
      path: String(path || "").trim(),
      nextContent: content,
    };
  }

  const resetFunctionName = "resetForm";
  const handler =
    `  function ${resetFunctionName}() {\n` +
    `    ${formState.setterName}(${formState.initialValue});\n` +
    "  }\n\n";

  const returnMatch = content.match(/\n\s*return\s*\(/);
  if (!returnMatch || typeof returnMatch.index !== "number") {
    return {
      ok: false,
      reason: "The component return block was not found.",
      path: String(path || "").trim(),
      nextContent: content,
    };
  }

  let nextContent =
    content.slice(0, returnMatch.index + 1) +
    handler +
    content.slice(returnMatch.index + 1);

  const updatedFormRange = findFirstSubmittedFormRange(nextContent);
  if (!updatedFormRange) {
    return {
      ok: false,
      reason: "The submitted form element could not be located after adding the handler.",
      path: String(path || "").trim(),
      nextContent: content,
    };
  }

  const buttonClass = chooseExistingButtonClass(nextContent);
  const buttonText = operation.label || "Reset form";
  const closeIndent = updatedFormRange.closeIndent || "        ";
  const buttonIndent = closeIndent + "  ";
  const labelIndent = buttonIndent + "  ";
  const buttonMarkup =
    `\n${buttonIndent}<button${buttonClass} type="button" onClick={${resetFunctionName}}>\n` +
    `${labelIndent}${buttonText}\n` +
    `${buttonIndent}</button>\n`;

  nextContent =
    nextContent.slice(0, updatedFormRange.closeLineStartIndex) +
    buttonMarkup +
    closeIndent +
    nextContent.slice(updatedFormRange.closeIndex);

  if (nextContent === content) {
    return {
      ok: false,
      reason: "The small control edit produced no content change.",
      path: String(path || "").trim(),
      nextContent: content,
    };
  }

  if (
    nextContent.length < content.length ||
    nextContent.length > content.length + 1600
  ) {
    return {
      ok: false,
      reason: "The small control edit was unexpectedly destructive or too large.",
      path: String(path || "").trim(),
      nextContent: content,
    };
  }

  return {
    ok: true,
    reason: "",
    path: String(path || "").trim(),
    nextContent,
    summary:
      "Added a small reset/clear form control using the inspected React form state.",
  };
}
