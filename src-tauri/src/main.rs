#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_fs::FsExt;

/// Allow a user-selected directory to be used by the FS plugin.
/// This updates the runtime FS scope (safer than broad wildcards).
#[tauri::command]
fn fs_allow_directory(app: tauri::AppHandle, path: String) -> Result<(), String> {
  app
    .fs_scope()
    // true = recursive
    .allow_directory(path, true)
    .map_err(|e: tauri::Error| e.to_string())
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![fs_allow_directory])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
