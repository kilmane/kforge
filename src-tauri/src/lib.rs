#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      ai::commands::ai_set_api_key,
      ai::commands::ai_clear_api_key,
      ai::commands::ai_has_api_key,
      ai::commands::ai_generate
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

