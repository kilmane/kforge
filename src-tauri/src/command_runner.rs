use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;

use tauri::{AppHandle, Emitter};

#[derive(Default)]
pub struct CommandRunnerState {
    pub running: bool,
    pub child_pid: Option<u32>,
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
    guard.child_pid = None;
    drop(guard);

    let app_handle = app.clone();
    let state_handle = Arc::clone(&state.inner());

    thread::spawn(move || {
        let trimmed = command.trim().to_string();

        if trimmed.is_empty() {
            let _ = app_handle.emit("kforge://command/log", "Empty command");
            if let Ok(mut guard) = state_handle.lock() {
                guard.running = false;
                guard.child_pid = None;
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
                    guard.child_pid = None;
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
                    guard.child_pid = None;
                }
                let _ = app_handle.emit("kforge://command/status", "idle");
                return;
            }
        };

        if let Ok(mut guard) = state_handle.lock() {
            guard.child_pid = Some(child.id());
        }

        let _ = app_handle.emit("kforge://command/status", "running");

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let stdout_handle = stdout.map(|stdout| {
            let app_clone = app_handle.clone();
            thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines().map_while(Result::ok) {
                    let _ = app_clone.emit("kforge://command/log", line);
                }
            })
        });

        let stderr_handle = stderr.map(|stderr| {
            let app_clone = app_handle.clone();
            thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines().map_while(Result::ok) {
                    let _ = app_clone.emit("kforge://command/log", line);
                }
            })
        });

        let _ = child.wait();

        if let Some(handle) = stdout_handle {
            let _ = handle.join();
        }

        if let Some(handle) = stderr_handle {
            let _ = handle.join();
        }

        if let Ok(mut guard) = state_handle.lock() {
            guard.running = false;
            guard.child_pid = None;
        }

        let _ = app_handle.emit("kforge://command/status", "idle");
    });

    Ok(())
}

#[tauri::command]
pub fn command_stop(
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<CommandRunnerState>>>,
) -> Result<(), String> {
    let pid = {
        let mut guard = state.lock().unwrap();

        if !guard.running {
            return Ok(());
        }

        let pid = guard.child_pid;
        guard.running = false;
        guard.child_pid = None;
        pid
    };

    if let Some(pid) = pid {
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

        let _ = app.emit("kforge://command/log", "Process stopped.");
    }

    let _ = app.emit("kforge://command/status", "idle");
    Ok(())
}
