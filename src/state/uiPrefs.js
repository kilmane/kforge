// src/state/uiPrefs.js

const KEY = "kforge.chat_ui"; // "classic" | "dock"
const DEFAULT = "classic";

export function getChatUiPref() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dock" || v === "classic" ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setChatUiPref(v) {
  try {
    if (v !== "dock" && v !== "classic") return;
    localStorage.setItem(KEY, v);
  } catch {
    // ignore
  }
}
