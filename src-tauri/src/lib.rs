// D:\kforge\src-tauri\src\lib.rs

use std::sync::{Arc, Mutex};

use tauri_plugin_fs::FsExt;
use tauri_plugin_shell::ShellExt;

mod ai;
mod command_runner;
mod preview;
mod scaffold;
mod service;

/// Allow a user-selected directory to be used by the FS plugin.
/// This updates the runtime FS scope (safer than broad wildcards).
#[tauri::command]
fn fs_allow_directory(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.fs_scope()
        .allow_directory(path, true)
        .map_err(|e: tauri::Error| e.to_string())
}

/// Open an external URL in the system browser (reuses tauri_plugin_shell).
#[tauri::command]
fn open_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    app.shell().open(&url, None).map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(preview::PreviewState::default())
        .manage(Arc::new(Mutex::new(
            command_runner::CommandRunnerState::default(),
        )))
        .manage(Arc::new(Mutex::new(service::ServiceRunnerState::default())))
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            fs_allow_directory,
            open_url,
            ai::commands::ai_set_api_key,
            ai::commands::ai_clear_api_key,
            ai::commands::ai_has_api_key,
            ai::commands::ai_clear_api_key,
            ai::commands::ai_is_key_persisted,
            ai::commands::ai_generate,
            ai::commands::ai_ollama_list_models,
            preview::preview_detect_kind,
            preview::preview_get_status,
            preview::preview_install,
            preview::preview_start,
            preview::preview_stop,
            command_runner::command_run,
            command_runner::command_stop,
            service::service_setup,
            service::github_detect_repo,
            service::github_open_repo,
            service::supabase_create_env_file,
            service::stripe_create_env_file,
            service::openai_create_env_file,
            service::openai_install_sdk,
            service::openai_create_client_file,
            service::openai_create_example,
            service::supabase_install_client,
            service::supabase_create_client_file,
            service::supabase_create_read_example,
            service::supabase_create_insert_example,
            service::supabase_create_query_helper,
            service::supabase_quick_connect,
            service::github_pull,
            service::github_clone_repo,
            service::deploy_open_vercel,
            service::deploy_open_netlify,
            scaffold::scaffold_static_html,
            scaffold::scaffold_vite_react,
            scaffold::scaffold_expo_react_native,
            scaffold::scaffold_nextjs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
