use std::{
    io::{BufRead, BufReader},
    process::{Command, Stdio},
    sync::Mutex,
    thread,
};

use tauri::{AppHandle, Emitter, Manager};

#[derive(Default)]
pub struct PreviewState {
    pid: Mutex<Option<u32>>,
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

fn clear_pid(app: &AppHandle, expected_pid: u32) {
    let state = app.state::<PreviewState>();
    let lock_result = state.pid.lock();

    if let Ok(mut guard) = lock_result {
        if guard.as_ref().copied() == Some(expected_pid) {
            *guard = None;
        }
    }
}

fn spawn_preview_process(
    app: AppHandle,
    state: tauri::State<PreviewState>,
    project_path: String,
    args: &[&str],
    running_status: &str,
    label: &str,
) -> Result<(), String> {
    validate_project_path(&project_path)?;

    {
        let guard = state
            .pid
            .lock()
            .map_err(|_| "Preview state lock failed".to_string())?;
        if guard.is_some() {
            return Err("A preview process is already running. Stop it first.".to_string());
        }
    }

    let pnpm = if cfg!(windows) { "pnpm.cmd" } else { "pnpm" };

    let mut child = if cfg!(windows) {
        Command::new("cmd")
            .arg("/C")
            .arg(pnpm)
            .args(args)
            .current_dir(&project_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
    } else {
        Command::new(pnpm)
            .current_dir(&project_path)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
    }
    .map_err(|e| format!("Failed to spawn {}: {}", label, e))?;

    let pid = child.id();

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture stderr".to_string())?;

    {
        let mut guard = state
            .pid
            .lock()
            .map_err(|_| "Preview state lock failed".to_string())?;
        *guard = Some(pid);
    }

    emit_status(&app, running_status);
    emit_log(
        &app,
        "status",
        &format!("Running: {} (cwd: {}) [pid={}]", label, project_path, pid),
    );

    let app_out = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            emit_log(&app_out, "stdout", &line);
        }
    });

    let app_err = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            emit_log(&app_err, "stderr", &line);
        }
    });

    let app_wait = app.clone();
    let label_wait = label.to_string();
    thread::spawn(move || {
        let status = child.wait();

        match status {
            Ok(exit_status) => {
                emit_log(
                    &app_wait,
                    "status",
                    &format!("{} terminated: {:?}", label_wait, exit_status.code()),
                );
            }
            Err(err) => {
                emit_log(
                    &app_wait,
                    "stderr",
                    &format!("{} wait failed: {}", label_wait, err),
                );
            }
        }

        emit_status(&app_wait, "idle");
        clear_pid(&app_wait, pid);
    });

    Ok(())
}

#[tauri::command]
pub fn preview_get_status(state: tauri::State<PreviewState>) -> Result<String, String> {
    let guard = state
        .pid
        .lock()
        .map_err(|_| "Preview state lock failed".to_string())?;

    if guard.is_some() {
        Ok("running".to_string())
    } else {
        Ok("idle".to_string())
    }
}

#[tauri::command]
pub fn preview_install(
    app: AppHandle,
    state: tauri::State<PreviewState>,
    project_path: String,
) -> Result<(), String> {
    spawn_preview_process(
        app,
        state,
        project_path,
        &["install"],
        "installing",
        "pnpm install",
    )
}

#[tauri::command]
pub fn preview_start(
    app: AppHandle,
    state: tauri::State<PreviewState>,
    project_path: String,
) -> Result<(), String> {
    spawn_preview_process(app, state, project_path, &["dev"], "running", "pnpm dev")
}

#[tauri::command]
pub fn preview_stop(app: AppHandle, state: tauri::State<PreviewState>) -> Result<(), String> {
    let pid = {
        let mut guard = state
            .pid
            .lock()
            .map_err(|_| "Preview state lock failed".to_string())?;
        guard.take()
    };

    if let Some(pid) = pid {
        emit_log(
            &app,
            "status",
            &format!("Stopping preview process... [tracked pid={}]", pid),
        );

        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .status();
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = Command::new("kill")
                .args(["-TERM", &pid.to_string()])
                .status();
        }
    }

    emit_status(&app, "idle");
    Ok(())
}
