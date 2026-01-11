#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_fs::FsExt;

mod ai;

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
    .invoke_handler(tauri::generate_handler![
      // Phase 2 command (keep)
      fs_allow_directory,

      // Phase 3.1.0 AI Core commands
      ai::commands::ai_set_api_key,
      ai::commands::ai_clear_api_key,
      ai::commands::ai_has_api_key,
      ai::commands::ai_generate,

      // Phase 3.2 Ollama helper
      ai::commands::ai_ollama_list_models
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
