use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

use tauri::{AppHandle, Emitter};

#[derive(Default)]
pub struct CommandRunnerState {
    pub running: bool,
    pub child_pid: Option<u32>,
}

fn strip_ansi_sequences(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut chars = value.chars().peekable();

    while let Some(character) = chars.next() {
        if character != '\u{1b}' {
            output.push(character);
            continue;
        }

        match chars.next() {
            Some('[') => {
                while let Some(control_character) = chars.next() {
                    if ('@'..='~').contains(&control_character) {
                        break;
                    }
                }
            }
            Some(']') => {
                while let Some(control_character) = chars.next() {
                    if control_character == '\u{7}' {
                        break;
                    }

                    if control_character == '\u{1b}' && chars.peek().copied() == Some('\\') {
                        chars.next();
                        break;
                    }
                }
            }
            Some(_) | None => {}
        }
    }

    output
}
fn is_git_status_short(command: &str) -> bool {
    let normalized = command
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_ascii_lowercase();

    normalized == "git status --short"
}

fn emit_clean_line(app: &AppHandle, line: String, had_visible_output: &AtomicBool) {
    let clean_line = strip_ansi_sequences(&line);

    if !clean_line.trim().is_empty() {
        had_visible_output.store(true, Ordering::Relaxed);
    }

    let _ = app.emit("kforge://command/log", clean_line);
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
        let mut child = {
            let mut command = Command::new("cmd");
            command
                .args(["/D", "/S", "/C"])
                .raw_arg(&trimmed)
                .current_dir(&cwd)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .creation_flags(CREATE_NO_WINDOW);

            match command.spawn() {
                Ok(child) => child,
                Err(e) => {
                    let _ =
                        app_handle.emit("kforge://command/log", format!("Failed to start: {}", e));

                    if let Ok(mut guard) = state_handle.lock() {
                        guard.running = false;
                        guard.child_pid = None;
                    }

                    let _ = app_handle.emit("kforge://command/status", "idle");
                    return;
                }
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

        let had_visible_output = Arc::new(AtomicBool::new(false));
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let stdout_handle = stdout.map(|stdout| {
            let app_clone = app_handle.clone();
            let output_seen = Arc::clone(&had_visible_output);

            thread::spawn(move || {
                let reader = BufReader::new(stdout);

                for line in reader.lines().map_while(Result::ok) {
                    emit_clean_line(&app_clone, line, &output_seen);
                }
            })
        });

        let stderr_handle = stderr.map(|stderr| {
            let app_clone = app_handle.clone();
            let output_seen = Arc::clone(&had_visible_output);

            thread::spawn(move || {
                let reader = BufReader::new(stderr);

                for line in reader.lines().map_while(Result::ok) {
                    emit_clean_line(&app_clone, line, &output_seen);
                }
            })
        });

        let exit_status = child.wait();

        if let Some(handle) = stdout_handle {
            let _ = handle.join();
        }

        if let Some(handle) = stderr_handle {
            let _ = handle.join();
        }

        let completed_successfully = exit_status
            .as_ref()
            .map(|status| status.success())
            .unwrap_or(false);

        if completed_successfully && !had_visible_output.load(Ordering::Relaxed) {
            if is_git_status_short(&trimmed) {
                let _ = app_handle.emit("kforge://command/log", "Working tree clean.");
            } else {
                let _ = app_handle.emit("kforge://command/log", "Command completed successfully.");
                let _ = app_handle.emit("kforge://command/log", "No output returned.");
            }
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
            let mut command = Command::new("taskkill");
            command
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .creation_flags(CREATE_NO_WINDOW);
            let _ = command.status();
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
