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

fn emit_output_lines(app: &AppHandle, stdout: &str, stderr: &str) {
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
}

fn first_non_empty_line(value: &str) -> Option<String> {
    value.lines().find_map(|line| {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
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

    emit_output_lines(app, &stdout, &stderr);

    if !output.status.success() {
        let detail = first_non_empty_line(&stderr)
            .or_else(|| first_non_empty_line(&stdout))
            .unwrap_or_else(|| "No additional error details were returned.".to_string());

        return Err(format!(
            "Command failed: {} {} — {}",
            program,
            args.join(" "),
            detail
        ));
    }

    Ok(stdout)
}

fn run_shell_command_capture(
    app: &AppHandle,
    project_dir: &PathBuf,
    command_line: &str,
) -> Result<String, String> {
    let trimmed = command_line.trim();
    if trimmed.is_empty() {
        return Err("Shell command is empty".to_string());
    }

    emit_log(app, "stdout", &format!("> {}", trimmed));

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", trimmed])
            .current_dir(project_dir)
            .output()
            .map_err(|error| format!("Failed to run shell command via cmd: {}", error))?
    } else {
        Command::new("sh")
            .args(["-lc", trimmed])
            .current_dir(project_dir)
            .output()
            .map_err(|error| format!("Failed to run shell command via sh: {}", error))?
    };

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    emit_output_lines(app, &stdout, &stderr);

    if !output.status.success() {
        let detail = first_non_empty_line(&stderr)
            .or_else(|| first_non_empty_line(&stdout))
            .unwrap_or_else(|| "No additional error details were returned.".to_string());

        return Err(format!("Command failed: {} — {}", trimmed, detail));
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

fn shell_command_exists(project_dir: &PathBuf, program: &str) -> bool {
    if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("where {}", program)])
            .current_dir(project_dir)
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    } else {
        Command::new("sh")
            .args(["-lc", &format!("command -v {}", program)])
            .current_dir(project_dir)
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    }
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

fn env_var_has_non_empty_value(path: &Path, key: &str) -> bool {
    let content = match read_text_file_if_exists(path) {
        Some(content) => content,
        None => return false,
    };

    for raw_line in content.lines() {
        let line = raw_line.trim();

        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let without_export = line.strip_prefix("export ").unwrap_or(line);

        let Some((left, right)) = without_export.split_once('=') else {
            continue;
        };

        if left.trim() != key {
            continue;
        }

        let value = right.trim().trim_matches('"').trim_matches('\'');
        return !value.is_empty();
    }

    false
}

fn any_env_var_has_non_empty_value(paths: &[PathBuf], key: &str) -> bool {
    paths
        .iter()
        .any(|path| path.exists() && env_var_has_non_empty_value(path, key))
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
        "# Vite frontend example:",
        "# VITE_SUPABASE_URL=https://your-project.supabase.co",
        "# VITE_SUPABASE_ANON_KEY=your-anon-key",
        "#",
        "# Local example:",
        "# SUPABASE_URL=http://127.0.0.1:54321",
        "# SUPABASE_ANON_KEY=your-local-anon-key",
        "",
        "SUPABASE_URL=",
        "SUPABASE_ANON_KEY=",
        "",
        "# If this project uses Vite, frontend code will usually read:",
        "VITE_SUPABASE_URL=",
        "VITE_SUPABASE_ANON_KEY=",
        "",
    ]
    .join("\n");

    fs::write(&env_example_path, content)
        .map_err(|error| format!("Failed to write .env.example: {}", error))?;

    Ok(true)
}
fn ensure_stripe_env_example(project_dir: &PathBuf) -> Result<bool, String> {
    let env_example_path = project_dir.join(".env.example");

    if env_example_path.exists() {
        let existing = fs::read_to_string(&env_example_path)
            .map_err(|error| format!("Failed to read .env.example: {}", error))?;

        let has_secret = existing.contains("STRIPE_SECRET_KEY=");
        let has_publishable = existing.contains("STRIPE_PUBLISHABLE_KEY=");
        let has_webhook_secret = existing.contains("STRIPE_WEBHOOK_SECRET=");

        if has_secret && has_publishable && has_webhook_secret {
            return Ok(false);
        }

        let mut next = existing;

        if !next.ends_with('\n') {
            next.push('\n');
        }
        if !next.ends_with("\n\n") {
            next.push('\n');
        }

        next.push_str("# Stripe environment template generated by KForge\n");
        next.push_str("# STRIPE_SECRET_KEY=sk_test_your_secret_key\n");
        next.push_str("# STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key\n");
        next.push_str("# STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret\n");
        next.push('\n');

        if !has_secret {
            next.push_str("STRIPE_SECRET_KEY=\n");
        }
        if !has_publishable {
            next.push_str("STRIPE_PUBLISHABLE_KEY=\n");
        }
        if !has_webhook_secret {
            next.push_str("STRIPE_WEBHOOK_SECRET=\n");
        }

        fs::write(&env_example_path, next)
            .map_err(|error| format!("Failed to update .env.example: {}", error))?;

        return Ok(true);
    }

    let content = [
        "# Stripe environment template generated by KForge",
        "#",
        "# Example test keys:",
        "# STRIPE_SECRET_KEY=sk_test_your_secret_key",
        "# STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key",
        "# STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret",
        "",
        "STRIPE_SECRET_KEY=",
        "STRIPE_PUBLISHABLE_KEY=",
        "STRIPE_WEBHOOK_SECRET=",
        "",
    ]
    .join("\n");

    fs::write(&env_example_path, content)
        .map_err(|error| format!("Failed to write .env.example: {}", error))?;

    Ok(true)
}

fn ensure_stripe_env_file_from_example(project_dir: &PathBuf) -> Result<bool, String> {
    let env_path = project_dir.join(".env");
    let env_example_path = project_dir.join(".env.example");

    if env_path.exists() {
        return Ok(false);
    }

    if !env_example_path.exists() {
        ensure_stripe_env_example(project_dir)?;
    }

    fs::copy(&env_example_path, &env_path)
        .map_err(|error| format!("Failed to create .env from .env.example: {}", error))?;

    Ok(true)
}
fn ensure_env_file_from_example(project_dir: &PathBuf) -> Result<bool, String> {
    let env_path = project_dir.join(".env");
    let env_example_path = project_dir.join(".env.example");

    if env_path.exists() {
        return Ok(false);
    }

    if !env_example_path.exists() {
        ensure_supabase_env_example(project_dir)?;
    }

    fs::copy(&env_example_path, &env_path)
        .map_err(|error| format!("Failed to create .env from .env.example: {}", error))?;

    Ok(true)
}

fn supabase_client_file_candidates(project_dir: &PathBuf) -> Vec<PathBuf> {
    vec![
        project_dir.join("src").join("lib").join("supabase.js"),
        project_dir.join("src").join("lib").join("supabase.ts"),
    ]
}

fn existing_supabase_client_file(project_dir: &PathBuf) -> Option<PathBuf> {
    supabase_client_file_candidates(project_dir)
        .into_iter()
        .find(|path| path.exists())
}

fn create_supabase_client_file(project_dir: &PathBuf) -> Result<PathBuf, String> {
    if let Some(existing) = existing_supabase_client_file(project_dir) {
        return Ok(existing);
    }

    let client_path = project_dir.join("src").join("lib").join("supabase.js");

    if let Some(parent) = client_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create client folder: {}", error))?;
    }

    let content = r#"import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
"#;

    fs::write(&client_path, content)
        .map_err(|error| format!("Failed to write Supabase client file: {}", error))?;

    Ok(client_path)
}
fn has_supabase_client_dependency(project_dir: &PathBuf) -> bool {
    let package_json_path = project_dir.join("package.json");

    if !package_json_path.exists() {
        return false;
    }

    read_text_file_if_exists(&package_json_path)
        .map(|content| {
            content.contains("@supabase/supabase-js") || content.contains("\"supabase\"")
        })
        .unwrap_or(false)
}

fn supabase_example_file_path(project_dir: &PathBuf) -> PathBuf {
    project_dir
        .join("src")
        .join("examples")
        .join("supabaseExample.js")
}

fn supabase_insert_example_file_path(project_dir: &PathBuf) -> PathBuf {
    project_dir
        .join("src")
        .join("examples")
        .join("supabaseInsertExample.js")
}

fn supabase_queries_file_path(project_dir: &PathBuf) -> PathBuf {
    project_dir
        .join("src")
        .join("lib")
        .join("supabaseQueries.js")
}

fn create_supabase_example_file(project_dir: &PathBuf) -> Result<PathBuf, String> {
    let example_path = supabase_example_file_path(project_dir);

    if example_path.exists() {
        return Ok(example_path);
    }

    if let Some(parent) = example_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create examples folder: {}", error))?;
    }

    let content = r#"import { supabase } from "../lib/supabase";

export async function loadExampleData() {
  const { data, error } = await supabase
    .from("your_table")
    .select("*");

  if (error) {
    console.error("Supabase query failed:", error);
    return [];
  }

  return data;
}
"#;

    fs::write(&example_path, content)
        .map_err(|error| format!("Failed to write Supabase example file: {}", error))?;

    Ok(example_path)
}

fn create_supabase_insert_example_file(project_dir: &PathBuf) -> Result<PathBuf, String> {
    let example_path = supabase_insert_example_file_path(project_dir);

    if example_path.exists() {
        return Ok(example_path);
    }

    if let Some(parent) = example_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create examples folder: {}", error))?;
    }

    let content = r#"import { supabase } from "../lib/supabase";

export async function insertExampleRow() {
  const { data, error } = await supabase
    .from("your_table")
    .insert([
      {
        name: "Example row",
      },
    ])
    .select();

  if (error) {
    console.error("Supabase insert failed:", error);
    return null;
  }

  return data;
}
"#;

    fs::write(&example_path, content)
        .map_err(|error| format!("Failed to write Supabase insert example file: {}", error))?;

    Ok(example_path)
}

fn create_supabase_queries_file(project_dir: &PathBuf) -> Result<PathBuf, String> {
    let queries_path = supabase_queries_file_path(project_dir);

    if queries_path.exists() {
        return Ok(queries_path);
    }

    if let Some(parent) = queries_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create lib folder: {}", error))?;
    }

    let content = r#"import { supabase } from "./supabase";

export async function fetchRows(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*");

  if (error) {
    throw error;
  }

  return data;
}

export async function insertRow(table, values) {
  const { data, error } = await supabase
    .from(table)
    .insert([values])
    .select();

  if (error) {
    throw error;
  }

  return data;
}
"#;

    fs::write(&queries_path, content)
        .map_err(|error| format!("Failed to write Supabase queries file: {}", error))?;

    Ok(queries_path)
}
fn run_supabase_setup(app: &AppHandle, project_dir: &PathBuf) -> Result<(), String> {
    emit_log(app, "status", "Checking this project for Supabase setup...");

    let created_env_example = ensure_supabase_env_example(project_dir)?;

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

    let has_supabase_url = any_env_var_has_non_empty_value(&env_paths, "SUPABASE_URL");
    let has_supabase_anon_key = any_env_var_has_non_empty_value(&env_paths, "SUPABASE_ANON_KEY");
    let has_vite_supabase_url = any_env_var_has_non_empty_value(&env_paths, "VITE_SUPABASE_URL");
    let has_vite_supabase_anon_key =
        any_env_var_has_non_empty_value(&env_paths, "VITE_SUPABASE_ANON_KEY");

    let has_backend_env_pair = has_supabase_url && has_supabase_anon_key;
    let has_vite_env_pair = has_vite_supabase_url && has_vite_supabase_anon_key;
    let has_any_complete_env_pair = has_backend_env_pair || has_vite_env_pair;

    let env_file_exists = project_dir.join(".env").exists();

    let supabase_dir_exists = project_dir.join("supabase").exists();
    let supabase_config_exists = project_dir.join("supabase").join("config.toml").exists();

    let package_json_path = project_dir.join("package.json");
    let package_json_exists = package_json_path.exists();
    let has_supabase_js = has_supabase_client_dependency(project_dir);

    let existing_client_file = existing_supabase_client_file(project_dir);
    let example_file_exists = supabase_example_file_path(project_dir).exists();
    let insert_example_file_exists = supabase_insert_example_file_path(project_dir).exists();
    let queries_file_exists = supabase_queries_file_path(project_dir).exists();

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
            "VITE_SUPABASE_URL: {}",
            if has_vite_supabase_url {
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
            "VITE_SUPABASE_ANON_KEY: {}",
            if has_vite_supabase_anon_key {
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

    emit_log(
        app,
        "stdout",
        &format!(
            "Supabase client file: {}",
            if let Some(path) = existing_client_file.as_ref() {
                path.strip_prefix(project_dir)
                    .ok()
                    .and_then(|p| p.to_str())
                    .unwrap_or("found")
                    .to_string()
            } else {
                "not found".to_string()
            }
        ),
    );

    emit_log(
        app,
        "stdout",
        &format!(
            "Read example file: {}",
            if example_file_exists {
                "found (src/examples/supabaseExample.js)"
            } else {
                "not found"
            }
        ),
    );

    emit_log(
        app,
        "stdout",
        &format!(
            "Insert example file: {}",
            if insert_example_file_exists {
                "found (src/examples/supabaseInsertExample.js)"
            } else {
                "not found"
            }
        ),
    );

    emit_log(
        app,
        "stdout",
        &format!(
            "Query helper file: {}",
            if queries_file_exists {
                "found (src/lib/supabaseQueries.js)"
            } else {
                "not found"
            }
        ),
    );

    if created_env_example {
        emit_log(
            app,
            "stdout",
            "Created .env.example with Supabase connection variables.",
        );
        emit_log(
            app,
            "stdout",
            "Next suggested action: Click \"Create .env file\" to create a working local env file for this project.",
        );
    } else {
        emit_log(
            app,
            "stdout",
            ".env.example already exists. Leaving it unchanged.",
        );
    }

    if supabase_config_exists {
        emit_log(app, "stdout", "Local Supabase config detected.");
        emit_log(
            app,
            "stdout",
            "Typical local Project URL: http://127.0.0.1:54321",
        );
        emit_log(
            app,
            "stdout",
            "Local Studio is usually available at: http://127.0.0.1:54323",
        );
        emit_log(
            app,
            "stdout",
            "If this app should connect to the local stack, use the values reported by `supabase start`.",
        );
    } else {
        emit_log(
            app,
            "stdout",
            "Cloud Supabase setup is fine. You can add local Supabase later if needed.",
        );
    }

    emit_log(
        app,
        "stdout",
        "If this project uses Vite, frontend code will usually read VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );

    if !env_file_exists {
        if supabase_config_exists {
            emit_log(
                app,
                "status",
                "Local Supabase config was found. Start by creating a .env file, then add the local connection values this app should use.",
            );
            emit_log(
                app,
                "stdout",
                "Next suggested action: Click \"Create .env file\". Then add the local Project URL and local publishable/public key from your running local Supabase stack.",
            );
        } else {
            emit_log(
                app,
                "status",
                "Supabase setup is not complete yet. Start by creating a .env file, then add your Supabase connection values.",
            );
            emit_log(
                app,
                "stdout",
                "Next suggested action: Click \"Create .env file\". This creates the local env file where this project will store its Supabase connection values.",
            );
        }
        return Ok(());
    }

    if !has_any_complete_env_pair {
        if supabase_config_exists {
            emit_log(
                app,
                "status",
                "Local Supabase config was found, but this app still needs connection values in .env. Add the local Project URL and local publishable/public key. If this is a Vite frontend, you will usually also want VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
            );
        } else {
            emit_log(
                app,
                "status",
                "Supabase setup is not complete yet. Add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file. If this is a Vite frontend, you will usually also want VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
            );
        }

        if !has_supabase_js {
            emit_log(
                app,
                "stdout",
                "Next suggested action: Click \"Install Supabase client\". This adds the official Supabase library your app uses to connect to your database from code.",
            );
        } else if existing_client_file.is_none() {
            emit_log(
                app,
                "stdout",
                "Next suggested action: Click \"Create Supabase client file\" so your project has a ready-to-use Supabase client at src/lib/supabase.js.",
            );
        }

        return Ok(());
    }

    if supabase_config_exists {
        emit_log(
            app,
            "status",
            "Local Supabase connection values look available for this project. The next steps are to make sure the Supabase client library is installed and the Supabase client file exists.",
        );
    } else {
        emit_log(
            app,
            "status",
            "Supabase configuration looks good. Your project has connection values ready. The next steps are to make sure the Supabase client library is installed and the Supabase client file exists.",
        );
    }

    if !has_supabase_js {
        emit_log(
            app,
            "stdout",
            "Next suggested action: Click \"Install Supabase client\". This adds the official Supabase library your app uses to connect to your database from code.",
        );
    }

    if existing_client_file.is_none() {
        emit_log(
            app,
            "stdout",
            "Next suggested action: Click \"Create Supabase client file\". This creates src/lib/supabase.js so your app has a single place to connect to Supabase.",
        );
    }

    if has_supabase_js && existing_client_file.is_some() {
        if !example_file_exists {
            emit_log(
                app,
                "stdout",
                "Next suggested action: Click \"Create Supabase read example\". This generates src/examples/supabaseExample.js with a safe starter query.",
            );
            return Ok(());
        }

        if !queries_file_exists {
            emit_log(
                app,
                "stdout",
                "Next suggested action: Click \"Create Supabase query helper\". This generates src/lib/supabaseQueries.js with simple reusable read and insert helpers.",
            );
            return Ok(());
        }

        if !insert_example_file_exists {
            emit_log(
                app,
                "stdout",
                "Next suggested action: Click \"Create Supabase insert example\". This generates src/examples/supabaseInsertExample.js with a safe starter insert pattern.",
            );
            return Ok(());
        }

        emit_log(
            app,
            "status",
            "Supabase developer-assist files look ready. Your next step is to open the generated starter files and wire them into your real app code.",
        );
        emit_log(
            app,
            "stdout",
            "Suggested coding path: start with src/lib/supabase.js, then review src/lib/supabaseQueries.js, then adapt the examples in src/examples/ to your real table names and app flows.",
        );
    }

    Ok(())
}
fn run_stripe_setup(app: &AppHandle, project_dir: &PathBuf) -> Result<(), String> {
    emit_log(app, "status", "Checking this project for Stripe setup...");

    let created_or_updated_env_example = ensure_stripe_env_example(project_dir)?;

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

    let has_secret_key = any_env_var_has_non_empty_value(&env_paths, "STRIPE_SECRET_KEY");
    let has_publishable_key = any_env_var_has_non_empty_value(&env_paths, "STRIPE_PUBLISHABLE_KEY");
    let has_webhook_secret = any_env_var_has_non_empty_value(&env_paths, "STRIPE_WEBHOOK_SECRET");

    let has_core_env_pair = has_secret_key && has_publishable_key;
    let env_file_exists = project_dir.join(".env").exists();

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
            "STRIPE_SECRET_KEY: {}",
            if has_secret_key { "set" } else { "not set" }
        ),
    );

    emit_log(
        app,
        "stdout",
        &format!(
            "STRIPE_PUBLISHABLE_KEY: {}",
            if has_publishable_key {
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
            "STRIPE_WEBHOOK_SECRET: {}",
            if has_webhook_secret { "set" } else { "not set" }
        ),
    );
    if created_or_updated_env_example {
        emit_log(
            app,
            "stdout",
            "Prepared .env.example with Stripe connection placeholders.",
        );
        emit_log(
            app,
            "stdout",
            "Next suggested action: Click \"Create .env file\" to create a working local env file for this project.",
        );
    } else {
        emit_log(
            app,
            "stdout",
            ".env.example already includes Stripe placeholders. Leaving it unchanged.",
        );
    }

    emit_log(
        app,
        "stdout",
        "Stripe secret keys should stay server-side. Do not expose STRIPE_SECRET_KEY to client code.",
    );

    emit_log(
        app,
        "stdout",
        "STRIPE_PUBLISHABLE_KEY is the client-safe key used by frontend Stripe integrations.",
    );
    emit_log(
        app,
        "stdout",
        "STRIPE_WEBHOOK_SECRET is needed when your app verifies Stripe webhook events on the server.",
    );
    if !env_file_exists {
        emit_log(
            app,
            "status",
            "Stripe setup is not complete yet. Start by creating a .env file, then add your Stripe keys.",
        );
        emit_log(
            app,
            "stdout",
            "Next suggested action: Click \"Create .env file\". Then paste your Stripe secret key and publishable key into that file.",
        );
        return Ok(());
    }

    if !has_core_env_pair {
        emit_log(
            app,
            "status",
            "Stripe setup is not complete yet. Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to your .env file.",
        );
        emit_log(
            app,
            "stdout",
            "Next suggested action: Open your Stripe dashboard to copy the keys for this project, then update .env.",
        );
        return Ok(());
    }

    if has_webhook_secret {
        emit_log(
            app,
            "status",
            "Stripe configuration looks good. This project has the core payment keys and a webhook signing secret available.",
        );
    } else {
        emit_log(
            app,
            "status",
            "Stripe core configuration looks good. This project has the main payment keys available, but webhook signing is not configured yet.",
        );
        emit_log(
            app,
            "stdout",
            "If this app handles checkout completion, subscriptions, or Stripe event callbacks on the server, add STRIPE_WEBHOOK_SECRET next.",
        );
    }

    emit_log(
        app,
        "stdout",
        "Next suggested action: open Stripe to review products, prices, and webhook settings if your app needs them.",
    );
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
pub fn supabase_create_env_file(app: AppHandle, project_path: String) -> Result<(), String> {
    let project_dir = validate_project_path(&project_path)?;
    let supabase_config_exists = project_dir.join("supabase").join("config.toml").exists();

    let created = ensure_env_file_from_example(&project_dir)?;

    if created {
        emit_log(&app, "stdout", "Created .env file from .env.example");
        if supabase_config_exists {
            emit_log(
                &app,
                "status",
                ".env file is ready. Next, add the local Supabase connection values this app should use.",
            );
        } else {
            emit_log(
                &app,
                "status",
                ".env file is ready. Next, add your Supabase connection values.",
            );
        }
        emit_log(
            &app,
            "stdout",
            "Next suggested action: Click \"Install Supabase client\". This adds the official Supabase library your app uses to connect to your database from code.",
        );
    } else {
        emit_log(&app, "stdout", ".env already exists. No changes made.");
        if supabase_config_exists {
            emit_log(
                &app,
                "status",
                ".env already exists. Update it with the local Supabase connection values if needed.",
            );
        } else {
            emit_log(
                &app,
                "status",
                ".env already exists. Update it with your Supabase connection values if needed.",
            );
        }
        emit_log(
            &app,
            "stdout",
            "Next suggested action: Click \"Install Supabase client\". This adds the official Supabase library your app uses to connect to your database from code.",
        );
    }

    Ok(())
}
#[tauri::command]
pub fn stripe_create_env_file(app: AppHandle, project_path: String) -> Result<(), String> {
    let project_dir = validate_project_path(&project_path)?;

    let created = ensure_stripe_env_file_from_example(&project_dir)?;

    if created {
        emit_log(&app, "stdout", "Created .env file from .env.example");
        emit_log(
            &app,
            "status",
            ".env file is ready. Next, add your Stripe secret key and publishable key.",
        );
        emit_log(
            &app,
            "stdout",
            "Next suggested action: Open Stripe in the browser, copy the keys for this project, and paste them into .env.",
        );
    } else {
        emit_log(&app, "stdout", ".env already exists. No changes made.");
        emit_log(
            &app,
            "status",
            ".env already exists. Update it with your Stripe keys if needed.",
        );
        emit_log(
            &app,
            "stdout",
            "Next suggested action: Open Stripe in the browser and confirm this project has the correct keys in .env.",
        );
    }

    Ok(())
}
#[tauri::command]
pub fn supabase_install_client(app: AppHandle, project_path: String) -> Result<(), String> {
    let project_dir = validate_project_path(&project_path)?;

    if !project_dir.join("package.json").exists() {
        return Err("package.json not found in this project".to_string());
    }

    if !shell_command_exists(&project_dir, "pnpm") {
        return Err(
            "pnpm could not be found from KForge. Install pnpm globally or restart KForge after making pnpm available in your PATH."
                .to_string(),
        );
    }

    emit_log(&app, "status", "Installing Supabase client with pnpm...");
    emit_log(
        &app,
        "stdout",
        "KForge is running the same package install through a shell so it works more reliably on Windows.",
    );

    match run_shell_command_capture(&app, &project_dir, "pnpm add @supabase/supabase-js") {
        Ok(_) => {
            emit_log(
                &app,
                "status",
                "Supabase client install complete. Re-run \"Check Supabase setup\" to confirm it was found.",
            );
            Ok(())
        }
        Err(error) => {
            emit_log(
                &app,
                "stderr",
                "Supabase client install failed. Read the command output above for the exact package manager message.",
            );
            Err(format!("Could not install the Supabase client. {}", error))
        }
    }
}
#[tauri::command]
pub fn supabase_create_client_file(app: AppHandle, project_path: String) -> Result<(), String> {
    let project_dir = validate_project_path(&project_path)?;

    if let Some(existing) = existing_supabase_client_file(&project_dir) {
        let display_path = existing
            .strip_prefix(&project_dir)
            .ok()
            .and_then(|p| p.to_str())
            .unwrap_or("src/lib/supabase.js");

        emit_log(
            &app,
            "stdout",
            &format!(
                "Supabase client file already exists at {}. No changes made.",
                display_path
            ),
        );

        emit_log(
            &app,
            "status",
            "Supabase client file already exists. Leaving it unchanged.",
        );

        return Ok(());
    }

    let created_path = create_supabase_client_file(&project_dir)?;

    let display_path = created_path
        .strip_prefix(&project_dir)
        .ok()
        .and_then(|p| p.to_str())
        .unwrap_or("src/lib/supabase.js");

    emit_log(
        &app,
        "stdout",
        &format!("Created Supabase client file at {}", display_path),
    );

    emit_log(
        &app,
        "status",
        &format!(
            "Your project now has a Supabase client file at {}. The next step is to use this file inside your app when you want to read or write Supabase data.",
            display_path
        ),
    );

    Ok(())
}
#[tauri::command]
pub fn supabase_create_read_example(app: AppHandle, project_path: String) -> Result<(), String> {
    let project_dir = validate_project_path(&project_path)?;

    let created_path = create_supabase_example_file(&project_dir)?;
    let display_path = created_path
        .strip_prefix(&project_dir)
        .ok()
        .and_then(|p| p.to_str())
        .unwrap_or("src/examples/supabaseExample.js");

    emit_log(
        &app,
        "stdout",
        &format!("Supabase read example ready at {}", display_path),
    );

    emit_log(
        &app,
        "status",
        "You can now open this file and adapt the table name and query fields to your real database schema.",
    );

    Ok(())
}

#[tauri::command]
pub fn supabase_create_insert_example(app: AppHandle, project_path: String) -> Result<(), String> {
    let project_dir = validate_project_path(&project_path)?;

    let created_path = create_supabase_insert_example_file(&project_dir)?;
    let display_path = created_path
        .strip_prefix(&project_dir)
        .ok()
        .and_then(|p| p.to_str())
        .unwrap_or("src/examples/supabaseInsertExample.js");

    emit_log(
        &app,
        "stdout",
        &format!("Supabase insert example ready at {}", display_path),
    );

    emit_log(
        &app,
        "status",
        "You can now adapt this example to insert rows into your own Supabase tables.",
    );

    Ok(())
}

#[tauri::command]
pub fn supabase_create_query_helper(app: AppHandle, project_path: String) -> Result<(), String> {
    let project_dir = validate_project_path(&project_path)?;

    let created_path = create_supabase_queries_file(&project_dir)?;
    let display_path = created_path
        .strip_prefix(&project_dir)
        .ok()
        .and_then(|p| p.to_str())
        .unwrap_or("src/lib/supabaseQueries.js");

    emit_log(
        &app,
        "stdout",
        &format!("Supabase query helper ready at {}", display_path),
    );

    emit_log(
        &app,
        "status",
        "This helper file contains reusable read and insert functions you can call from your app code.",
    );

    Ok(())
}
#[tauri::command]
pub fn supabase_quick_connect(app: AppHandle, project_path: String) -> Result<(), String> {
    emit_status(&app, "running:supabase");

    let result = (|| -> Result<(), String> {
        let project_dir = validate_project_path(&project_path)?;
        let supabase_config_exists = project_dir.join("supabase").join("config.toml").exists();

        emit_log(&app, "status", "Running Supabase quick connect...");
        emit_log(&app, "stdout", "Checking project setup...");

        run_supabase_setup(&app, &project_dir)?;

        let env_created = ensure_env_file_from_example(&project_dir)?;
        if env_created {
            emit_log(&app, "stdout", ".env file ready");
        } else {
            emit_log(&app, "stdout", ".env file already exists");
        }

        if !project_dir.join("package.json").exists() {
            return Err("package.json not found in this project".to_string());
        }

        if has_supabase_client_dependency(&project_dir) {
            emit_log(&app, "stdout", "Supabase client library already installed");
        } else {
            if !shell_command_exists(&project_dir, "pnpm") {
                return Err(
                    "pnpm could not be found from KForge. Install pnpm globally or restart KForge after making pnpm available in your PATH."
                        .to_string(),
                );
            }

            emit_log(&app, "status", "Installing Supabase client...");
            emit_log(
                &app,
                "stdout",
                "KForge is running the package install through a shell so it works more reliably on Windows.",
            );

            match run_shell_command_capture(&app, &project_dir, "pnpm add @supabase/supabase-js") {
                Ok(_) => emit_log(&app, "stdout", "Supabase client library installed"),
                Err(error) => {
                    emit_log(
                        &app,
                        "stderr",
                        "Supabase client install failed. Read the command output above for the exact package manager message.",
                    );
                    return Err(format!("Could not install the Supabase client. {}", error));
                }
            }
        }

        if let Some(existing) = existing_supabase_client_file(&project_dir) {
            let display_path = existing
                .strip_prefix(&project_dir)
                .ok()
                .and_then(|p| p.to_str())
                .unwrap_or("src/lib/supabase.js");

            emit_log(
                &app,
                "stdout",
                &format!("Supabase client file already exists at {}", display_path),
            );
        } else {
            let created_path = create_supabase_client_file(&project_dir)?;
            let display_path = created_path
                .strip_prefix(&project_dir)
                .ok()
                .and_then(|p| p.to_str())
                .unwrap_or("src/lib/supabase.js");

            emit_log(
                &app,
                "stdout",
                &format!("Supabase client file ready at {}", display_path),
            );
        }

        let example_path = supabase_example_file_path(&project_dir);
        if example_path.exists() {
            let display_path = example_path
                .strip_prefix(&project_dir)
                .ok()
                .and_then(|p| p.to_str())
                .unwrap_or("src/examples/supabaseExample.js");

            emit_log(
                &app,
                "stdout",
                &format!("Supabase example query already exists at {}", display_path),
            );
        } else {
            let created_path = create_supabase_example_file(&project_dir)?;
            let display_path = created_path
                .strip_prefix(&project_dir)
                .ok()
                .and_then(|p| p.to_str())
                .unwrap_or("src/examples/supabaseExample.js");

            emit_log(
                &app,
                "stdout",
                &format!("Generated example query at {}", display_path),
            );
        }

        emit_log(&app, "status", "Supabase quick connect completed.");
        if supabase_config_exists {
            emit_log(
                &app,
                "stdout",
                "Next step: if this app should use your local Supabase stack, add the local Project URL and local publishable/public key to this project's .env file. Use the values reported by `supabase start`.",
            );
        } else {
            emit_log(
                &app,
                "stdout",
                "Next step: open your Supabase project dashboard, copy the Project URL and anon public key, then paste them into this project's .env file.",
            );
        }
        Ok(())
    })();

    match result {
        Ok(()) => {
            emit_status(&app, "done:supabase");
            Ok(())
        }
        Err(error) => {
            emit_log(&app, "error", &error);
            emit_status(&app, "error:supabase");
            Err(error)
        }
    }
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
            "stripe" => run_stripe_setup(&app_handle, &project_dir),
            "openai" => {
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
