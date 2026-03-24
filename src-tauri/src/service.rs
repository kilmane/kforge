use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::ShellExt;

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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubRepoState {
    pub is_repo: bool,
    pub has_commit: bool,
    pub has_remote: bool,
    pub remote_url: Option<String>,
    pub branch: Option<String>,
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

fn git_remote_url(project_dir: &PathBuf, remote_name: &str) -> Option<String> {
    Command::new("git")
        .args(["remote", "get-url", remote_name])
        .current_dir(project_dir)
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if value.is_empty() {
                    None
                } else {
                    Some(value)
                }
            } else {
                None
            }
        })
}

fn git_current_branch(project_dir: &PathBuf) -> Option<String> {
    Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(project_dir)
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if value.is_empty() {
                    None
                } else {
                    Some(value)
                }
            } else {
                None
            }
        })
}

fn github_remote_to_web_url(remote_url: &str) -> Option<String> {
    let trimmed = remote_url.trim();

    if trimmed.is_empty() {
        return None;
    }

    if let Some(rest) = trimmed.strip_prefix("https://github.com/") {
        let repo = rest.trim_end_matches(".git");
        return Some(format!("https://github.com/{}", repo));
    }

    if let Some(rest) = trimmed.strip_prefix("git@github.com:") {
        let repo = rest.trim_end_matches(".git");
        return Some(format!("https://github.com/{}", repo));
    }

    None
}

fn github_repo_slug_from_remote(remote_url: &str) -> Option<String> {
    let trimmed = remote_url.trim();

    if trimmed.is_empty() {
        return None;
    }

    if let Some(rest) = trimmed.strip_prefix("https://github.com/") {
        let repo = rest.trim_end_matches(".git").trim_end_matches('/');
        if !repo.is_empty() {
            return Some(repo.to_string());
        }
    }

    if let Some(rest) = trimmed.strip_prefix("git@github.com:") {
        let repo = rest.trim_end_matches(".git").trim_end_matches('/');
        if !repo.is_empty() {
            return Some(repo.to_string());
        }
    }

    None
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

fn read_text_file_if_exists(path: &Path) -> Option<String> {
    fs::read_to_string(path).ok()
}

fn file_contains_token(path: &Path, token: &str) -> bool {
    read_text_file_if_exists(path)
        .map(|content| content.contains(token))
        .unwrap_or(false)
}

fn ensure_supabase_env_example(project_dir: &PathBuf) -> Result<bool, String> {
    let env_example_path = project_dir.join(".env.example");

    if env_example_path.exists() {
        return Ok(false);
    }

    let content = [
        "# Supabase environment template generated by KForge",
        "#",
        "# Cloud example:",
        "# SUPABASE_URL=https://your-project.supabase.co",
        "# SUPABASE_ANON_KEY=your-anon-key",
        "#",
        "# Local example:",
        "# SUPABASE_URL=http://127.0.0.1:54321",
        "# SUPABASE_ANON_KEY=your-local-anon-key",
        "",
        "SUPABASE_URL=",
        "SUPABASE_ANON_KEY=",
        "",
    ]
    .join("\n");

    fs::write(&env_example_path, content)
        .map_err(|error| format!("Failed to write .env.example: {}", error))?;

    Ok(true)
}

fn run_supabase_setup(app: &AppHandle, project_dir: &PathBuf) -> Result<(), String> {
    emit_log(app, "status", "Checking this project for Supabase setup...");

    let env_paths = vec![
        project_dir.join(".env"),
        project_dir.join(".env.local"),
        project_dir.join(".env.development"),
        project_dir.join(".env.example"),
    ];

    let existing_env_files: Vec<String> = env_paths
        .iter()
        .filter(|path| path.exists())
        .filter_map(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .map(|name| name.to_string())
        })
        .collect();

    let has_supabase_url = env_paths
        .iter()
        .any(|path| file_contains_token(path, "SUPABASE_URL"));

    let has_supabase_anon_key = env_paths
        .iter()
        .any(|path| file_contains_token(path, "SUPABASE_ANON_KEY"));

    let supabase_dir_exists = project_dir.join("supabase").exists();
    let supabase_config_exists = project_dir.join("supabase").join("config.toml").exists();

    let package_json_path = project_dir.join("package.json");
    let package_json_exists = package_json_path.exists();

    let has_supabase_js = if package_json_exists {
        read_text_file_if_exists(&package_json_path)
            .map(|content| {
                content.contains("@supabase/supabase-js") || content.contains("\"supabase\"")
            })
            .unwrap_or(false)
    } else {
        false
    };

    let created_env_example = ensure_supabase_env_example(project_dir)?;

    emit_log(
        app,
        "stdout",
        &format!(
            "Environment files: {}",
            if existing_env_files.is_empty() {
                "none found".to_string()
            } else {
                existing_env_files.join(", ")
            }
        ),
    );

    emit_log(
        app,
        "stdout",
        &format!(
            "SUPABASE_URL: {}",
            if has_supabase_url { "set" } else { "not set" }
        ),
    );

    emit_log(
        app,
        "stdout",
        &format!(
            "SUPABASE_ANON_KEY: {}",
            if has_supabase_anon_key {
                "set"
            } else {
                "not set"
            }
        ),
    );

    emit_log(
        app,
        "stdout",
        &format!(
            "Local Supabase config: {}",
            if supabase_config_exists {
                "found (supabase/config.toml)"
            } else if supabase_dir_exists {
                "supabase folder found, but config.toml is missing"
            } else {
                "not found"
            }
        ),
    );

    emit_log(
        app,
        "stdout",
        &format!(
            "Supabase client library: {}",
            if has_supabase_js {
                "found in package.json"
            } else if package_json_exists {
                "not found in package.json"
            } else {
                "package.json not found"
            }
        ),
    );

    if created_env_example {
        emit_log(
            app,
            "stdout",
            "Created .env.example with Supabase connection variables.",
        );
    } else {
        emit_log(
            app,
            "stdout",
            ".env.example already exists. Leaving it unchanged.",
        );
    }

    if supabase_config_exists {
        emit_log(
            app,
            "stdout",
            "Local Supabase setup looks available. Typical local URL: http://127.0.0.1:54321",
        );
    } else {
        emit_log(
            app,
            "stdout",
            "Cloud Supabase setup is fine. You can add local Supabase later if needed.",
        );
    }

    if has_supabase_url && has_supabase_anon_key {
        emit_log(
            app,
            "status",
            "Supabase setup looks good. Next step: add these values to your app.",
        );
    } else {
        emit_log(
            app,
            "status",
            "Supabase setup is not complete yet. Add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file.",
        );
    }

    Ok(())
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
pub fn github_detect_repo(project_path: String) -> Result<GithubRepoState, String> {
    let project_dir = validate_project_path(&project_path)?;

    if !git_dir_exists(&project_dir) {
        return Ok(GithubRepoState {
            is_repo: false,
            has_commit: false,
            has_remote: false,
            remote_url: None,
            branch: None,
        });
    }

    let has_commit = git_has_commits(&project_dir);
    let has_remote = git_remote_exists(&project_dir, "origin");

    Ok(GithubRepoState {
        is_repo: true,
        has_commit,
        has_remote,
        remote_url: if has_remote {
            git_remote_url(&project_dir, "origin")
        } else {
            None
        },
        branch: git_current_branch(&project_dir),
    })
}

#[tauri::command]
pub fn github_open_repo(app: AppHandle, project_path: String) -> Result<(), String> {
    let project_dir = validate_project_path(&project_path)?;

    if !git_dir_exists(&project_dir) {
        return Err("This folder is not a git repository".to_string());
    }

    let remote_url = git_remote_url(&project_dir, "origin")
        .ok_or_else(|| "No git remote named 'origin' was found".to_string())?;

    let web_url = github_remote_to_web_url(&remote_url)
        .ok_or_else(|| "Origin remote is not a supported GitHub URL".to_string())?;

    app.shell()
        .open(&web_url, None)
        .map_err(|error| format!("Failed to open browser: {}", error))?;

    Ok(())
}

#[tauri::command]
pub fn deploy_open_vercel(app: AppHandle, project_path: String) -> Result<(), String> {
    let project_dir = validate_project_path(&project_path)?;

    if !git_dir_exists(&project_dir) {
        return Err("This folder is not a git repository".to_string());
    }

    let remote_url = git_remote_url(&project_dir, "origin")
        .ok_or_else(|| "No git remote named 'origin' was found".to_string())?;

    let repo_slug = github_repo_slug_from_remote(&remote_url)
        .ok_or_else(|| "Origin remote is not a supported GitHub URL".to_string())?;

    let web_url = format!(
        "https://vercel.com/new/clone?repository-url=https://github.com/{}",
        repo_slug
    );

    app.shell()
        .open(&web_url, None)
        .map_err(|error| format!("Failed to open browser: {}", error))?;

    Ok(())
}

#[tauri::command]
pub fn deploy_open_netlify(app: AppHandle, project_path: String) -> Result<(), String> {
    let project_dir = validate_project_path(&project_path)?;

    if !git_dir_exists(&project_dir) {
        return Err("This folder is not a git repository".to_string());
    }

    let remote_url = git_remote_url(&project_dir, "origin")
        .ok_or_else(|| "No git remote named 'origin' was found".to_string())?;

    let _repo_slug = github_repo_slug_from_remote(&remote_url)
        .ok_or_else(|| "Origin remote is not a supported GitHub URL".to_string())?;

    let web_url = "https://app.netlify.com/start";

    app.shell()
        .open(web_url, None)
        .map_err(|error| format!("Failed to open browser: {}", error))?;

    Ok(())
}

#[tauri::command]
pub fn github_pull(app: AppHandle, project_path: String) -> Result<(), String> {
    let project_dir = validate_project_path(&project_path)?;

    if !command_exists(&project_dir, "git") {
        return Err("Git is not installed or not available in PATH".to_string());
    }

    if !git_dir_exists(&project_dir) {
        return Err("This folder is not a git repository".to_string());
    }

    if !git_remote_exists(&project_dir, "origin") {
        return Err("No git remote named 'origin' was found".to_string());
    }

    emit_log(&app, "status", "Pulling latest changes from origin...");
    run_command_capture(&app, &project_dir, "git", &["pull"])?;
    emit_log(&app, "status", "Git pull complete.");

    Ok(())
}

#[tauri::command]
pub fn github_clone_repo(
    app: tauri::AppHandle,
    repo_url: String,
    parent_dir: String,
    folder_name: String,
) -> Result<String, String> {
    use std::process::Command;

    if repo_url.trim().is_empty() {
        return Err("Repository URL is required".into());
    }

    if parent_dir.trim().is_empty() {
        return Err("Destination folder is required".into());
    }

    let repo_name = if folder_name.trim().is_empty() {
        repo_url
            .split('/')
            .last()
            .unwrap_or("repo")
            .replace(".git", "")
    } else {
        folder_name.trim().to_string()
    };

    let target_path = Path::new(&parent_dir).join(&repo_name);

    let output = Command::new("git")
        .arg("clone")
        .arg(repo_url.trim())
        .arg(&target_path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let _ = app;

    Ok(target_path.to_string_lossy().to_string())
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
            "supabase" => run_supabase_setup(&app_handle, &project_dir),
            "stripe" | "openai" => {
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
