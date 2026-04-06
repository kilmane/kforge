// src-tauri/src/scaffold.rs
use std::{
    fs,
    io::{BufRead, BufReader},
    path::Path,
    process::{Command, Stdio},
    thread,
};

use serde::Serialize;
use serde_json::Value;
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

fn emit_preview_status(window: &tauri::Window, status: impl Into<String>) {
    let _ = window.emit(
        PREVIEW_STATUS_EVENT,
        PreviewStatusPayload {
            status: status.into(),
        },
    );
}

fn emit_preview_log(window: &tauri::Window, kind: &'static str, line: impl Into<String>) {
    let _ = window.emit(
        PREVIEW_LOG_EVENT,
        PreviewLogPayload {
            kind,
            line: line.into(),
        },
    );
}

fn validate_scaffold_inputs(parent_path: &str, app_name: &str) -> Result<(String, String), String> {
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

    Ok((parent_path, app_name))
}
fn ensure_expo_dev_script(project_path: &str) -> Result<(), String> {
    let package_json_path = Path::new(project_path).join("package.json");

    let package_text = fs::read_to_string(&package_json_path)
        .map_err(|e| format!("Failed to read package.json: {}", e))?;

    let mut package_json: Value = serde_json::from_str(&package_text)
        .map_err(|e| format!("Failed to parse package.json: {}", e))?;

    let scripts = package_json
        .as_object_mut()
        .and_then(|root| root.get_mut("scripts"))
        .and_then(|scripts| scripts.as_object_mut())
        .ok_or_else(|| "package.json is missing a scripts object".to_string())?;

    if !scripts.contains_key("dev") {
        scripts.insert("dev".to_string(), Value::String("expo start".to_string()));

        let updated = serde_json::to_string_pretty(&package_json)
            .map_err(|e| format!("Failed to serialize package.json: {}", e))?;

        fs::write(&package_json_path, format!("{}\n", updated))
            .map_err(|e| format!("Failed to write package.json: {}", e))?;
    }

    Ok(())
}
fn run_scaffold_blocking(
    window: tauri::Window,
    parent_path: String,
    app_name: String,
    command_label: &'static str,
    command_args: &'static [&'static str],
    failure_label: &'static str,
) -> Result<String, String> {
    let (parent_path, _app_name) = validate_scaffold_inputs(&parent_path, &app_name)?;

    emit_preview_status(&window, "scaffold:starting");
    emit_preview_log(
        &window,
        "stdout",
        format!("scaffold: running {}", command_label),
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
            emit_preview_log(&win_out, "stdout", line);
        }
    });

    let win_err = window.clone();
    let err_handle = thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            emit_preview_log(&win_err, "stderr", line);
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

    emit_preview_log(
        &window,
        "stdout",
        "Tip: In KForge use the Install → Preview buttons.",
    );
    emit_preview_log(
        &window,
        "stdout",
        format!("scaffold complete: {}", generated_path),
    );

    emit_preview_status(&window, "idle");
    emit_preview_status(&window, format!("scaffold:done:{generated_path}"));

    Ok(generated_path)
}

fn run_static_html_scaffold_blocking(
    window: tauri::Window,
    parent_path: String,
    app_name: String,
) -> Result<String, String> {
    let (parent_path, app_name) = validate_scaffold_inputs(&parent_path, &app_name)?;
    let parent = Path::new(&parent_path);

    emit_preview_status(&window, "scaffold:starting");
    emit_preview_log(&window, "stdout", "Generating Static HTML starter...");

    fs::create_dir_all(parent)
        .map_err(|e| format!("Failed to create target directory '{}': {}", parent_path, e))?;

    let index_html = format!(
        r#"<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{}</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="container">
      <h1>{}</h1>
      <p>Your static HTML project is ready.</p>
      <button id="hello-btn">Click me</button>
      <p id="output"></p>
    </main>

    <script src="./script.js"></script>
  </body>
</html>
"#,
        app_name, app_name
    );

    let styles_css = r#"* {
  box-sizing: border-box;
}

:root {
  font-family: Inter, system-ui, Arial, sans-serif;
  line-height: 1.5;
  color: #111827;
  background: #f9fafb;
}

body {
  margin: 0;
}

.container {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 20px;
}

h1 {
  margin-top: 0;
  font-size: 2rem;
}

button {
  border: 0;
  border-radius: 10px;
  padding: 12px 16px;
  font: inherit;
  cursor: pointer;
}
"#;

    let script_js = r#"const button = document.getElementById("hello-btn");
const output = document.getElementById("output");

button?.addEventListener("click", () => {
  if (output) {
    output.textContent = "Hello from KForge static HTML.";
  }
});
"#;

    fs::write(parent.join("index.html"), index_html)
        .map_err(|e| format!("Failed to write index.html: {}", e))?;
    fs::write(parent.join("styles.css"), styles_css)
        .map_err(|e| format!("Failed to write styles.css: {}", e))?;
    fs::write(parent.join("script.js"), script_js)
        .map_err(|e| format!("Failed to write script.js: {}", e))?;

    let generated_path = parent_path.clone();

    emit_preview_log(
        &window,
        "stdout",
        "Created: index.html, styles.css, script.js",
    );
    emit_preview_log(
        &window,
        "stdout",
        "Ready: Static HTML does not need Install. Click Preview, then Open.",
    );
    emit_preview_log(
        &window,
        "stdout",
        format!("scaffold complete: {}", generated_path),
    );

    emit_preview_status(&window, "idle");
    emit_preview_status(&window, format!("scaffold:done:{generated_path}"));

    Ok(generated_path)
}

#[tauri::command]
pub async fn scaffold_static_html(
    window: tauri::Window,
    parent_path: String,
    app_name: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_static_html_scaffold_blocking(window, parent_path, app_name)
    })
    .await
    .map_err(|e| format!("Scaffold task join error: {}", e))?
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
pub async fn scaffold_expo_react_native(
    window: tauri::Window,
    parent_path: String,
    app_name: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let generated_path = run_scaffold_blocking(
            window.clone(),
            parent_path,
            app_name,
            "pnpm dlx create-expo-app@latest . --template blank",
            &["dlx", "create-expo-app@latest", ".", "--template", "blank"],
            "Expo React Native",
        )?;

        ensure_expo_dev_script(&generated_path)?;
        emit_preview_log(
            &window,
            "stdout",
            "Expo package.json updated: added dev script -> expo start",
        );

        Ok(generated_path)
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
