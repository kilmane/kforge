export const SIMPLE_FORM_CONTROL_EDIT_LABEL =
  "Prepare safe reset-button edit";

const SIMPLE_FORM_CONTROL_TARGET_PATHS = Object.freeze([
  "src/app.jsx",
  "src/app.js",
  "app/page.jsx",
  "app/page.tsx",
]);

function normalizePathKey(path = "") {
  return String(path || "").trim().replace(/\\/g, "/").toLowerCase();
}

export function isSimpleFormControlEditGoal(goal = "") {
  const text = String(goal || "").toLowerCase();

  return (
    (
      /\b(reset|clear|clears|clearing)\b/.test(text) &&
      /\b(form|input|field|button|control)\b/.test(text)
    ) ||
    (
      /\b(add|create|show|include)\b.*\bbutton\b/.test(text) &&
      /\b(form|input|field|control)\b/.test(text)
    )
  );
}

export function canUseSimpleFormControlEdit({
  goal = "",
  path = "",
  currentContent = "",
} = {}) {
  const pathKey = normalizePathKey(path);
  const content = String(currentContent || "");

  if (!isSimpleFormControlEditGoal(goal)) {
    return {
      ok: false,
      reason: "The request is not a narrow reset/clear form-control edit.",
    };
  }

  if (!SIMPLE_FORM_CONTROL_TARGET_PATHS.includes(pathKey)) {
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

  if (
    /\bfunction\s+resetForm\s*\(/.test(content) ||
    /\bonClick=\{resetForm\}/.test(content) ||
    />\s*Reset form\s*</i.test(content)
  ) {
    return {
      ok: false,
      reason: "A reset form handler or reset button already appears to exist.",
    };
  }

  if (!content.includes("STARTER_CONFIG.emptyForm")) {
    return {
      ok: false,
      reason: "The file does not expose the built-in starter empty form value.",
    };
  }

  if (!/\bsetForm\s*\(\s*STARTER_CONFIG\.emptyForm\s*\)/.test(content)) {
    return {
      ok: false,
      reason: "The file does not reset form state with STARTER_CONFIG.emptyForm.",
    };
  }

  if (!/\bfunction\s+addItem\s*\(\s*event\s*\)/.test(content)) {
    return {
      ok: false,
      reason: "The expected built-in starter submit handler was not found.",
    };
  }

  if (!/<form\b[^>]*\bonSubmit=\{addItem\}/.test(content)) {
    return {
      ok: false,
      reason: "The expected built-in starter form submit binding was not found.",
    };
  }

  if (
    !content.includes(
      '          <button className="primary-button" type="submit">\n' +
        "            {STARTER_CONFIG.primaryAction}\n" +
        "          </button>",
    )
  ) {
    return {
      ok: false,
      reason: "The expected primary submit button snippet was not found.",
    };
  }

  return {
    ok: true,
    reason: "The file matches the supported built-in starter form pattern.",
  };
}

export function buildSimpleFormControlEdit({
  goal = "",
  path = "",
  currentContent = "",
} = {}) {
  const suitability = canUseSimpleFormControlEdit({
    goal,
    path,
    currentContent,
  });

  if (!suitability.ok) {
    return {
      ok: false,
      reason: suitability.reason,
      path: String(path || "").trim(),
      nextContent: String(currentContent || ""),
    };
  }

  const content = String(currentContent || "");

  const submitResetAnchor =
    "    setItems((current) => [nextItem, ...current]);\n" +
    "    setForm(STARTER_CONFIG.emptyForm);\n" +
    "  }\n\n" +
    "  function removeItem";

  if (!content.includes(submitResetAnchor)) {
    return {
      ok: false,
      reason: "The expected submit handler end anchor was not found.",
      path: String(path || "").trim(),
      nextContent: content,
    };
  }

  const handlerReplacement =
    "    setItems((current) => [nextItem, ...current]);\n" +
    "    setForm(STARTER_CONFIG.emptyForm);\n" +
    "  }\n\n" +
    "  function resetForm() {\n" +
    "    setForm(STARTER_CONFIG.emptyForm);\n" +
    "  }\n\n" +
    "  function removeItem";

  const submitButtonAnchor =
    '          <button className="primary-button" type="submit">\n' +
    "            {STARTER_CONFIG.primaryAction}\n" +
    "          </button>";

  const buttonReplacement =
    '          <button className="primary-button" type="submit">\n' +
    "            {STARTER_CONFIG.primaryAction}\n" +
    "          </button>\n\n" +
    '          <button className="ghost-button" type="button" onClick={resetForm}>\n' +
    "            Reset form\n" +
    "          </button>";

  if (!content.includes(submitButtonAnchor)) {
    return {
      ok: false,
      reason: "The expected primary submit button anchor was not found.",
      path: String(path || "").trim(),
      nextContent: content,
    };
  }

  let nextContent = content
    .replace(submitResetAnchor, handlerReplacement)
    .replace(submitButtonAnchor, buttonReplacement);

  if (nextContent === content) {
    return {
      ok: false,
      reason: "The deterministic reset-button edit produced no content change.",
      path: String(path || "").trim(),
      nextContent: content,
    };
  }

  if (
    nextContent.length < content.length ||
    nextContent.length > content.length + 1200
  ) {
    return {
      ok: false,
      reason: "The deterministic reset-button edit was unexpectedly destructive or too large.",
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
      "Added a resetForm handler and a secondary Reset form button for the existing built-in starter form.",
  };
}
