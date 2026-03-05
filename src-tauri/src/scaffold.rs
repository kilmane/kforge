// src-tauri/src/scaffold.rs
use std::{
    io::{BufRead, BufReader},
    process::{Command, Stdio},
    thread,
};

use serde::Serialize;
use tauri::Emitter;

const PREVIEW_LOG_EVENT: &str = "kforge://preview/log";
const PREVIEW_STATUS_EVENT: &str = "kforge://preview/status";

#[derive(Serialize, Clone)]
struct PreviewLogPayload {
    kind: &'static str, // "stdout" | "stderr"
    line: String,
}

#[derive(Serialize, Clone)]
struct PreviewStatusPayload {
    status: String,
}

fn join_path(parent: &str, child: &str) -> String {
    // Normalize to forward slashes for the UI; Windows accepts them fine in most places.
    format!(
        "{}/{}",
        parent.trim_end_matches(['/', '\\']),
        child.trim_matches(['/', '\\'])
    )
}

#[tauri::command]
pub fn scaffold_vite_react(
    window: tauri::Window,
    parent_path: String,
    app_name: String,
) -> Result<String, String> {
    let parent_path = parent_path.trim().to_string();
    let app_name = app_name.trim().to_string();

    if parent_path.is_empty() {
        return Err("parent_path cannot be empty".into());
    }
    if app_name.is_empty() {
        return Err("app_name cannot be empty".into());
    }

    let _ = window.emit(
        PREVIEW_STATUS_EVENT,
        PreviewStatusPayload {
            status: "scaffold:starting".to_string(),
        },
    );

    let _ = window.emit(
        PREVIEW_LOG_EVENT,
        PreviewLogPayload {
            kind: "stdout",
            line: format!(
                "scaffold: running pnpm create vite@latest {} --template react",
                app_name
            ),
        },
    );

    // Scaffold only (no install/dev). Use pnpm.cmd on Windows.
    let pnpm = if cfg!(windows) { "pnpm.cmd" } else { "pnpm" };

    let mut child = Command::new(pnpm)
        .current_dir(&parent_path)
        .arg("create")
        .arg("vite@latest")
        .arg(&app_name)
        .arg("--template")
        .arg("react")
        // try to suppress prompts where possible
        .arg("--yes")
        // vite's internal prompts sometimes respect this
        .arg("--")
        .arg("--no-interactive")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            format!(
                "Failed to spawn pnpm. Is pnpm installed and on PATH? ({})",
                e
            )
        })?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture stderr".to_string())?;

    // Stream stdout lines into the existing PreviewPanel log
    let win_out = window.clone();
    let out_handle = thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let _ = win_out.emit(
                PREVIEW_LOG_EVENT,
                PreviewLogPayload {
                    kind: "stdout",
                    line,
                },
            );
        }
    });

    // Stream stderr lines into the same log
    let win_err = window.clone();
    let err_handle = thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            let _ = win_err.emit(
                PREVIEW_LOG_EVENT,
                PreviewLogPayload {
                    kind: "stderr",
                    line,
                },
            );
        }
    });

    let status = child
        .wait()
        .map_err(|e| format!("Failed waiting for pnpm process: {}", e))?;

    let _ = out_handle.join();
    let _ = err_handle.join();

    if !status.success() {
        let _ = window.emit(
            PREVIEW_STATUS_EVENT,
            PreviewStatusPayload {
                status: "scaffold:failed".to_string(),
            },
        );

        return Err(format!(
            "Vite scaffold failed with exit code: {:?}",
            status.code()
        ));
    }

    let generated_path = join_path(&parent_path, &app_name);

    let _ = window.emit(
        PREVIEW_STATUS_EVENT,
        PreviewStatusPayload {
            status: format!("scaffold:done:{generated_path}"),
        },
    );

    Ok(generated_path)
}
