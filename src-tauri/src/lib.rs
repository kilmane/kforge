// D:\kforge\src-tauri\src\lib.rs

use tauri::menu::{Menu, MenuItem, Submenu};
use tauri_plugin_fs::FsExt;
use tauri_plugin_shell::ShellExt;

mod ai;

/// Allow a user-selected directory to be used by the FS plugin.
/// This updates the runtime FS scope (safer than broad wildcards).
#[tauri::command]
fn fs_allow_directory(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.fs_scope()
        // true = recursive
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
        // ✅ Required for opening URLs in the system browser
        .plugin(tauri_plugin_shell::init())
        // Native menu bar: Help -> docs
        .menu(|handle| {
            let help = Submenu::with_items(
                handle,
                "Help",
                true,
                &[
                    &MenuItem::with_id(
                        handle,
                        "help.providers_and_models",
                        "Providers and Models",
                        true,
                        None::<&str>,
                    )?,
                    &MenuItem::with_id(
                        handle,
                        "help.models_color_labels",
                        "Models Color + Labels",
                        true,
                        None::<&str>,
                    )?,
                    &MenuItem::with_id(
                        handle,
                        "help.terminology",
                        "Terminology",
                        true,
                        None::<&str>,
                    )?,
                    &MenuItem::with_id(
                        handle,
                        "help.project_memory",
                        "What is Project Memory?",
                        true,
                        None::<&str>,
                    )?,
                    &MenuItem::with_id(
                        handle,
                        "help.custom_providers",
                        "Custom Provider (OpenAI-compatible)",
                        true,
                        None::<&str>,
                    )?,
                    &MenuItem::with_id(
                        handle,
                        "help.portability",
                        "Portability",
                        true,
                        None::<&str>,
                    )?,
                    &MenuItem::with_id(
                        handle,
                        "help.presets_inventory",
                        "Presets Inventory",
                        true,
                        None::<&str>,
                    )?,
                ],
            )?;

            Menu::with_items(handle, &[&help])
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "help.terminology" => {
                let url = "https://kilmane.github.io/kforge/terminology.html";
                let _ = app.shell().open(url, None);
            }

            "help.providers_and_models" => {
                let url = "https://kilmane.github.io/kforge/PROVIDERS_AND_MODELS.html";
                let _ = app.shell().open(url, None);
            }

            "help.models_color_labels" => {
                let url = "https://kilmane.github.io/kforge/MODELS_COLOR_LABELS.html";
                let _ = app.shell().open(url, None);
            }

            "help.project_memory" => {
                let url = "https://kilmane.github.io/kforge/project-memory.html";
                let _ = app.shell().open(url, None);
            }

            "help.custom_providers" => {
                let url = "https://kilmane.github.io/kforge/custom_provider.html";
                let _ = app.shell().open(url, None);
            }

            "help.portability" => {
                let url = "https://kilmane.github.io/kforge/portability.html";
                let _ = app.shell().open(url, None);
            }

            "help.presets_inventory" => {
                let url = "https://kilmane.github.io/kforge/PRESETS_INVENTORY.html";
                let _ = app.shell().open(url, None);
            }

            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            // Phase 2 command (keep)
            fs_allow_directory,
            open_url,
            // Phase 3.1.0 AI Core commands
            ai::commands::ai_set_api_key,
            ai::commands::ai_clear_api_key,
            ai::commands::ai_has_api_key,
            ai::commands::ai_clear_api_key,
            ai::commands::ai_is_key_persisted,
            ai::commands::ai_generate,
            // Phase 3.2 Ollama helper
            ai::commands::ai_ollama_list_models
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
