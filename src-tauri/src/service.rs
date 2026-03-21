use serde::Deserialize;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Emitter};

#[derive(Default)]
pub struct ServiceRunnerState {
    pub running: bool,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ServiceSetupOptions {
    pub repo_name: Option<String>,
    pub visibility: Option<String>,
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
        "github" => Ok("GitHub"),
        "supabase" => Ok("Supabase"),
        "stripe" => Ok("Stripe"),
        "openai" => Ok("OpenAI"),
        other => Err(format!("Unknown service: {}", other)),
    }
}

fn run_command_capture(
    app: &AppHandle,
    project_dir: &PathBuf,
    program: &str,
    args: &[&str],
) -> Result<String, String> {
    emit_log(app, "stdout", &format!("> {} {}", program, args.join(" ")));

    let output = Command::new(program)
        .args(args)
        .current_dir(project_dir)
        .output()
        .map_err(|error| format!("Failed to run {}: {}", program, error))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            emit_log(app, "stdout", trimmed);
        }
    }

    for line in stderr.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            emit_log(app, "stderr", trimmed);
        }
    }

    if !output.status.success() {
        return Err(format!("Command failed: {} {}", program, args.join(" ")));
    }

    Ok(stdout)
}

fn run_command_status(project_dir: &PathBuf, program: &str, args: &[&str]) -> Result<bool, String> {
    let status = Command::new(program)
        .args(args)
        .current_dir(project_dir)
        .status()
        .map_err(|error| format!("Failed to run {}: {}", program, error))?;

    Ok(status.success())
}

fn command_exists(project_dir: &PathBuf, program: &str) -> bool {
    run_command_status(project_dir, program, &["--version"]).unwrap_or(false)
}

fn git_dir_exists(project_dir: &PathBuf) -> bool {
    project_dir.join(".git").exists()
}

fn git_has_commits(project_dir: &PathBuf) -> bool {
    run_command_status(project_dir, "git", &["rev-parse", "--verify", "HEAD"]).unwrap_or(false)
}

fn git_remote_exists(project_dir: &PathBuf, remote_name: &str) -> bool {
    run_command_status(project_dir, "git", &["remote", "get-url", remote_name]).unwrap_or(false)
}

fn normalized_visibility(value: Option<String>) -> String {
    match value.unwrap_or_else(|| "public".to_string()).trim() {
        "private" => "private".to_string(),
        _ => "public".to_string(),
    }
}

fn normalized_repo_name(value: Option<String>) -> Result<String, String> {
    let raw = value.unwrap_or_default();
    let trimmed = raw.trim();

    if trimmed.is_empty() {
        return Err("GitHub repository name is required".to_string());
    }

    if trimmed.starts_with('.') || trimmed.ends_with('.') {
        return Err("Repository name cannot start or end with a dot".to_string());
    }

    let valid = trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.');

    if !valid {
        return Err(
            "Repository name may only contain letters, numbers, hyphens, underscores, and dots"
                .to_string(),
        );
    }

    Ok(trimmed.to_string())
}

fn run_github_setup(
    app: &AppHandle,
    project_dir: &PathBuf,
    options: Option<ServiceSetupOptions>,
) -> Result<(), String> {
    let opts = options.unwrap_or_default();
    let repo_name = normalized_repo_name(opts.repo_name)?;
    let visibility = normalized_visibility(opts.visibility);

    emit_log(
        app,
        "status",
        &format!("Preparing GitHub publish for repository '{}'", repo_name),
    );

    if !command_exists(project_dir, "git") {
        return Err("Git is not installed or not available in PATH".to_string());
    }

    if !command_exists(project_dir, "gh") {
        return Err("GitHub CLI (gh) is not installed or not available in PATH".to_string());
    }

    emit_log(app, "status", "Checking GitHub CLI authentication...");
    run_command_capture(app, project_dir, "gh", &["auth", "status"])?;

    if git_remote_exists(project_dir, "origin") {
        return Err(
            "This project already has a git remote named 'origin'. Refusing to overwrite it."
                .to_string(),
        );
    }

    if !git_dir_exists(project_dir) {
        emit_log(app, "status", "Initializing git repository...");
        run_command_capture(app, project_dir, "git", &["init"])?;
    } else {
        emit_log(app, "status", "Git repository already exists. Reusing it.");
    }

    emit_log(app, "status", "Staging project files...");
    run_command_capture(app, project_dir, "git", &["add", "."])?;

    if !git_has_commits(project_dir) {
        emit_log(app, "status", "Creating initial commit...");
        run_command_capture(
            app,
            project_dir,
            "git",
            &["commit", "-m", "Initial commit from KForge"],
        )?;
    } else {
        emit_log(
            app,
            "status",
            "Repository already has commits. Skipping initial commit.",
        );
    }

    emit_log(app, "status", "Ensuring branch name is main...");
    run_command_capture(app, project_dir, "git", &["branch", "-M", "main"])?;

    emit_log(
        app,
        "status",
        &format!("Creating {} GitHub repository and pushing...", visibility),
    );

    run_command_capture(
        app,
        project_dir,
        "gh",
        &[
            "repo",
            "create",
            &repo_name,
            if visibility == "private" {
                "--private"
            } else {
                "--public"
            },
            "--source",
            ".",
            "--remote",
            "origin",
            "--push",
        ],
    )?;

    emit_log(app, "status", "GitHub publish complete.");
    Ok(())
}

fn run_placeholder_setup(app: &AppHandle, label: &str, project_path: &str) {
    emit_log(
        app,
        "status",
        &format!("Starting {} setup in {}", label, project_path),
    );
    emit_log(
        app,
        "stdout",
        "This service is still on the Phase 4.5 foundation placeholder path. No real files are changed yet.",
    );
    emit_log(
        app,
        "stdout",
        "Future phases will attach real adapters for config generation, env setup, and guided install steps.",
    );
    emit_log(app, "stdout", &format!("{} adapter slot is ready.", label));
}

#[tauri::command]
pub fn service_setup(
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<ServiceRunnerState>>>,
    service_id: String,
    project_path: String,
    options: Option<ServiceSetupOptions>,
) -> Result<(), String> {
    let project_dir = validate_project_path(&project_path)?;
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
    let options_clone = options.clone();

    std::thread::spawn(move || {
        emit_status(&app_handle, &format!("running:{}", service_id_clone));

        let result = match service_id_clone.as_str() {
            "github" => run_github_setup(&app_handle, &project_dir, options_clone),
            "supabase" | "stripe" | "openai" => {
                run_placeholder_setup(&app_handle, &label, &project_path_clone);
                Ok(())
            }
            other => Err(format!("Unknown service: {}", other)),
        };

        match result {
            Ok(()) => {
                emit_status(&app_handle, &format!("done:{}", service_id_clone));
            }
            Err(error) => {
                emit_log(&app_handle, "error", &error);
                emit_status(&app_handle, &format!("error:{}", service_id_clone));
            }
        }

        if let Ok(mut guard) = state_handle.lock() {
            guard.running = false;
        }
    });

    Ok(())
}
