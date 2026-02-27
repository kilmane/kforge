use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

#[derive(Default)]
pub struct PreviewState {
    child: Mutex<Option<CommandChild>>,
}

fn emit_log(app: &AppHandle, kind: &str, line: &str) {
    let _ = app.emit(
        "kforge://preview/log",
        serde_json::json!({
          "kind": kind,
          "line": line
        }),
    );
}

fn emit_status(app: &AppHandle, status: &str) {
    let _ = app.emit(
        "kforge://preview/status",
        serde_json::json!({ "status": status }),
    );
}

fn validate_project_path(path: &str) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("Project path is empty".to_string());
    }
    Ok(())
}

/// Clear stored child process handle (used on termination and stop).
/// IMPORTANT: uses AppHandle-managed state so we do not capture borrowed `State<>` in async tasks.
fn clear_child(app: &AppHandle) {
    let _ = (|| {
        let state = app.state::<PreviewState>();
        if let Ok(mut guard) = state.child.lock() {
            *guard = None;
        };
    })();
}

#[tauri::command]
pub fn preview_install(
    app: AppHandle,
    state: tauri::State<PreviewState>,
    project_path: String,
) -> Result<(), String> {
    validate_project_path(&project_path)?;

    // Block if already running
    {
        let guard = state
            .child
            .lock()
            .map_err(|_| "Preview state lock failed".to_string())?;
        if guard.is_some() {
            return Err("A preview process is already running. Stop it first.".to_string());
        }
    }

    emit_status(&app, "installing");
    emit_log(
        &app,
        "status",
        &format!("Running: pnpm install (cwd: {})", project_path),
    );

    let cmd = app
        .shell()
        .command("pnpm")
        .args(["install"])
        .current_dir(project_path);

    let (mut rx, child) = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn pnpm install: {}", e))?;

    {
        let mut guard = state
            .child
            .lock()
            .map_err(|_| "Preview state lock failed".to_string())?;
        *guard = Some(child);
    }

    // Stream logs in background (do NOT capture `state` here)
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    emit_log(&app, "stdout", &String::from_utf8_lossy(&line))
                }
                CommandEvent::Stderr(line) => {
                    emit_log(&app, "stderr", &String::from_utf8_lossy(&line))
                }
                CommandEvent::Error(err) => {
                    emit_log(&app, "stderr", &format!("Process error: {}", err))
                }
                CommandEvent::Terminated(payload) => {
                    emit_log(
                        &app,
                        "status",
                        &format!("Install terminated: {:?}", payload.code),
                    );
                    emit_status(&app, "idle");
                    clear_child(&app);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn preview_start(
    app: AppHandle,
    state: tauri::State<PreviewState>,
    project_path: String,
) -> Result<(), String> {
    validate_project_path(&project_path)?;

    // Block if already running
    {
        let guard = state
            .child
            .lock()
            .map_err(|_| "Preview state lock failed".to_string())?;
        if guard.is_some() {
            return Err("A preview process is already running. Stop it first.".to_string());
        }
    }

    emit_status(&app, "running");
    emit_log(
        &app,
        "status",
        &format!("Running: pnpm dev (cwd: {})", project_path),
    );

    let cmd = app
        .shell()
        .command("pnpm")
        .args(["dev"])
        .current_dir(project_path);

    let (mut rx, child) = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn pnpm dev: {}", e))?;

    {
        let mut guard = state
            .child
            .lock()
            .map_err(|_| "Preview state lock failed".to_string())?;
        *guard = Some(child);
    }

    // Stream logs in background (do NOT capture `state` here)
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    emit_log(&app, "stdout", &String::from_utf8_lossy(&line))
                }
                CommandEvent::Stderr(line) => {
                    emit_log(&app, "stderr", &String::from_utf8_lossy(&line))
                }
                CommandEvent::Error(err) => {
                    emit_log(&app, "stderr", &format!("Process error: {}", err))
                }
                CommandEvent::Terminated(payload) => {
                    emit_log(
                        &app,
                        "status",
                        &format!("Preview terminated: {:?}", payload.code),
                    );
                    emit_status(&app, "idle");
                    clear_child(&app);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn preview_stop(app: AppHandle, state: tauri::State<PreviewState>) -> Result<(), String> {
    let mut guard = state
        .child
        .lock()
        .map_err(|_| "Preview state lock failed".to_string())?;

    // Take ownership of the child (kill consumes it)
    if let Some(child) = guard.take() {
        emit_log(&app, "status", "Stopping preview process...");

        let pid = child.pid();
        let _ = child.kill();

        // Ensure full tree kill on Windows (prevents node/vite leftovers)
        #[cfg(target_os = "windows")]
        {
            let _ = app
                .shell()
                .command("taskkill")
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .spawn();
        }
    }

    emit_status(&app, "idle");
    Ok(())
}
