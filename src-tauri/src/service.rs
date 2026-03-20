use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Emitter};

#[derive(Default)]
pub struct ServiceRunnerState {
    pub running: bool,
}

fn emit_log(app: &AppHandle, kind: &str, line: &str) {
    let _ = app.emit(
        "kforge://service/log",
        serde_json::json!({
            "kind": kind,
            "line": line,
        }),
    );
}

fn emit_status(app: &AppHandle, status: &str) {
    let _ = app.emit(
        "kforge://service/status",
        serde_json::json!({
            "status": status,
        }),
    );
}

fn validate_project_path(path: &str) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Project path is empty".to_string());
    }

    let pb = PathBuf::from(trimmed);
    if !pb.exists() {
        return Err(format!("Project path does not exist: {}", trimmed));
    }
    if !pb.is_dir() {
        return Err(format!("Project path is not a folder: {}", trimmed));
    }

    Ok(pb)
}

fn service_label(service_id: &str) -> Result<&'static str, String> {
    match service_id.trim() {
        "supabase" => Ok("Supabase"),
        "stripe" => Ok("Stripe"),
        "openai" => Ok("OpenAI"),
        other => Err(format!("Unknown service: {}", other)),
    }
}

#[tauri::command]
pub fn service_setup(
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<ServiceRunnerState>>>,
    service_id: String,
    project_path: String,
) -> Result<(), String> {
    validate_project_path(&project_path)?;
    let label = service_label(&service_id)?.to_string();

    let mut guard = state.lock().unwrap();
    if guard.running {
        return Err("A service setup is already running".into());
    }
    guard.running = true;
    drop(guard);

    let app_handle = app.clone();
    let state_handle = Arc::clone(&state.inner());
    let service_id_clone = service_id.clone();
    let project_path_clone = project_path.clone();

    std::thread::spawn(move || {
        emit_status(&app_handle, &format!("running:{}", service_id_clone));
        emit_log(
            &app_handle,
            "status",
            &format!("Starting {} setup in {}", label, project_path_clone),
        );
        emit_log(
            &app_handle,
            "stdout",
            "This is the Phase 4.5 foundation placeholder. No real files are changed yet.",
        );
        emit_log(
            &app_handle,
            "stdout",
            "Future phases will attach real adapters for config generation, env setup, and guided install steps.",
        );
        emit_log(
            &app_handle,
            "stdout",
            &format!("{} adapter slot is ready.", label),
        );

        if let Ok(mut guard) = state_handle.lock() {
            guard.running = false;
        }

        emit_status(&app_handle, &format!("done:{}", service_id));
    });

    Ok(())
}
