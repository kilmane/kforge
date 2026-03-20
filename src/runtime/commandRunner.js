import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

let commandLogBuffer = [];
let commandStatusValue = "idle";

export function getCommandLogBuffer() {
  return commandLogBuffer.slice();
}

export function clearCommandLogBuffer() {
  commandLogBuffer = [];
}

export function appendCommandLog(entry) {
  commandLogBuffer = [...commandLogBuffer, entry].slice(-600);
}

export function getCommandStatusValue() {
  return commandStatusValue || "idle";
}

export function setCommandStatusValue(status) {
  commandStatusValue = String(status || "idle");
}

export function onCommandLog(cb) {
  return listen("kforge://command/log", (event) => cb(event.payload));
}

export function onCommandStatus(cb) {
  return listen("kforge://command/status", (event) => cb(event.payload));
}

export async function commandRun(command, cwd) {
  return invoke("command_run", {
    command,
    cwd,
  });
}
