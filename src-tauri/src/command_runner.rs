use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Emitter};

#[derive(Default)]
pub struct CommandRunnerState {
    pub running: bool,
}

#[tauri::command]
pub fn command_run(
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<CommandRunnerState>>>,
    command: String,
    cwd: String,
) -> Result<(), String> {
    let mut guard = state.lock().unwrap();

    if guard.running {
        return Err("Command already running".into());
    }

    guard.running = true;
    drop(guard);

    let app_handle = app.clone();
    let state_handle = Arc::clone(&state.inner());

    std::thread::spawn(move || {
        let trimmed = command.trim().to_string();

        if trimmed.is_empty() {
            let _ = app_handle.emit("kforge://command/log", "Empty command");
            if let Ok(mut guard) = state_handle.lock() {
                guard.running = false;
            }
            let _ = app_handle.emit("kforge://command/status", "idle");
            return;
        }

        #[cfg(target_os = "windows")]
        let mut child = match Command::new("cmd")
            .args(["/C", &trimmed])
            .current_dir(&cwd)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(child) => child,
            Err(e) => {
                let _ = app_handle.emit("kforge://command/log", format!("Failed to start: {}", e));
                if let Ok(mut guard) = state_handle.lock() {
                    guard.running = false;
                }
                let _ = app_handle.emit("kforge://command/status", "idle");
                return;
            }
        };

        #[cfg(not(target_os = "windows"))]
        let mut child = match Command::new("sh")
            .args(["-lc", &trimmed])
            .current_dir(&cwd)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(child) => child,
            Err(e) => {
                let _ = app_handle.emit("kforge://command/log", format!("Failed to start: {}", e));
                if let Ok(mut guard) = state_handle.lock() {
                    guard.running = false;
                }
                let _ = app_handle.emit("kforge://command/status", "idle");
                return;
            }
        };

        let _ = app_handle.emit("kforge://command/status", "running");

        if let Some(stdout) = child.stdout.take() {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let _ = app_handle.emit("kforge://command/log", line);
                }
            }
        }

        if let Some(stderr) = child.stderr.take() {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let _ = app_handle.emit("kforge://command/log", line);
                }
            }
        }

        let _ = child.wait();

        if let Ok(mut guard) = state_handle.lock() {
            guard.running = false;
        }

        let _ = app_handle.emit("kforge://command/status", "idle");
    });

    Ok(())
}
