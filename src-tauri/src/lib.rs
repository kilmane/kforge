#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
