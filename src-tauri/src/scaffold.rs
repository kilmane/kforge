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

fn is_bad_app_name(name: &str) -> bool {
    // Keep light validation for now because the UI still supplies this field.
    // We no longer use it as a folder name, but we still reject obvious path-like input.
    name.contains('\\') || name.contains('/') || name.contains(':')
}

fn run_scaffold_blocking(
    window: tauri::Window,
    parent_path: String,
    app_name: String,
    command_label: &'static str,
    command_args: &'static [&'static str],
    failure_label: &'static str,
) -> Result<String, String> {
    let parent_path = parent_path.trim().to_string();
    let app_name = app_name.trim().to_string();

    if parent_path.is_empty() {
        return Err("parentPath cannot be empty".into());
    }
    if app_name.is_empty() {
        return Err("appName cannot be empty".into());
    }
    if is_bad_app_name(&app_name) {
        return Err(
            "App name should be plain text only and must not contain path characters.".into(),
        );
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
            line: format!("scaffold: running {}", command_label),
        },
    );

    // Windows spawn fix
    let pnpm = if cfg!(windows) { "pnpm.cmd" } else { "pnpm" };

    let mut child = Command::new(pnpm)
        .current_dir(&parent_path)
        .args(command_args)
        .env("CI", "1")
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
        return Err(format!(
            "{} scaffold failed with exit code: {:?}",
            failure_label,
            status.code()
        ));
    }

    let generated_path = parent_path.clone();

    let _ = window.emit(
        PREVIEW_LOG_EVENT,
        PreviewLogPayload {
            kind: "stdout",
            line: "Tip: In KForge use the Install → Preview buttons.".to_string(),
        },
    );

    let _ = window.emit(
        PREVIEW_LOG_EVENT,
        PreviewLogPayload {
            kind: "stdout",
            line: format!("scaffold complete: {}", generated_path),
        },
    );

    let _ = window.emit(
        PREVIEW_STATUS_EVENT,
        PreviewStatusPayload {
            status: "idle".to_string(),
        },
    );

    let _ = window.emit(
        PREVIEW_STATUS_EVENT,
        PreviewStatusPayload {
            status: format!("scaffold:done:{generated_path}"),
        },
    );

    Ok(generated_path)
}

#[tauri::command]
pub async fn scaffold_vite_react(
    window: tauri::Window,
    parent_path: String,
    app_name: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_scaffold_blocking(
            window,
            parent_path,
            app_name,
            "pnpm dlx create-vite@latest . --template react --no-interactive",
            &[
                "dlx",
                "create-vite@latest",
                ".",
                "--template",
                "react",
                "--no-interactive",
            ],
            "Vite",
        )
    })
    .await
    .map_err(|e| format!("Scaffold task join error: {}", e))?
}

#[tauri::command]
pub async fn scaffold_nextjs(
    window: tauri::Window,
    parent_path: String,
    app_name: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_scaffold_blocking(
            window,
            parent_path,
            app_name,
            "pnpm create next-app@latest . --yes",
            &["create", "next-app@latest", ".", "--yes"],
            "Next.js",
        )
    })
    .await
    .map_err(|e| format!("Scaffold task join error: {}", e))?
}
