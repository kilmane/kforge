use std::{
    fs,
    io::{BufRead, BufReader, Read, Write},
    net::TcpListener,
    path::{Component, Path, PathBuf},
    process::{Command, Stdio},
    sync::{mpsc, Mutex},
    thread,
    time::Duration,
};

use tauri::{AppHandle, Emitter, Manager};

pub struct PreviewState {
    active: Mutex<Option<ActivePreview>>,
}

enum ActivePreview {
    Child {
        pid: u32,
        label: String,
    },
    Static {
        stop_tx: mpsc::Sender<()>,
        url: String,
    },
}

impl Default for PreviewState {
    fn default() -> Self {
        Self {
            active: Mutex::new(None),
        }
    }
}

enum PreviewKind {
    PackageProject,
    StaticSite,
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

fn detect_preview_kind(project_path: &Path) -> Result<PreviewKind, String> {
    let package_json = project_path.join("package.json");
    if package_json.is_file() {
        return Ok(PreviewKind::PackageProject);
    }

    let index_html = project_path.join("index.html");
    if index_html.is_file() {
        return Ok(PreviewKind::StaticSite);
    }

    Err(
        "No supported preview target found. Expected either package.json or index.html."
            .to_string(),
    )
}

fn clear_active_child(app: &AppHandle, expected_pid: u32) {
    let state = app.state::<PreviewState>();
    let mut guard = match state.active.lock() {
        Ok(guard) => guard,
        Err(_) => return,
    };

    let should_clear = matches!(
        guard.as_ref(),
        Some(ActivePreview::Child { pid, .. }) if *pid == expected_pid
    );

    if should_clear {
        *guard = None;
    }
}

fn clear_active_static(app: &AppHandle, expected_url: &str) {
    let state = app.state::<PreviewState>();
    let mut guard = match state.active.lock() {
        Ok(guard) => guard,
        Err(_) => return,
    };

    let should_clear = matches!(
        guard.as_ref(),
        Some(ActivePreview::Static { url, .. }) if url == expected_url
    );

    if should_clear {
        *guard = None;
    }
}
fn completion_message(label: &str, exit_code: Option<i32>) -> String {
    if is_expected_stop(label, exit_code) {
        return "✔ Preview stopped".to_string();
    }

    match exit_code {
        Some(0) => match label {
            "pnpm install" => "✔ Dependencies installed successfully".to_string(),
            "pnpm dev" => "✔ Preview stopped".to_string(),
            _ => format!("✔ {} completed successfully", label),
        },
        Some(code) => match label {
            "pnpm install" => format!("❌ Install failed (exit code {})", code),
            "pnpm dev" => format!("❌ Preview failed (exit code {})", code),
            _ => format!("❌ {} failed (exit code {})", label, code),
        },
        None => match label {
            "pnpm install" => "Install process ended".to_string(),
            "pnpm dev" => "✔ Preview stopped".to_string(),
            _ => format!("{} ended", label),
        },
    }
}

fn is_expected_stop(label: &str, exit_code: Option<i32>) -> bool {
    label == "pnpm dev" && matches!(exit_code, Some(1) | Some(130) | Some(143) | None)
}

fn ensure_runner_idle(state: &tauri::State<PreviewState>) -> Result<(), String> {
    let guard = state
        .active
        .lock()
        .map_err(|_| "Preview state lock failed".to_string())?;

    if guard.is_some() {
        Err("A preview process is already running. Stop it first.".to_string())
    } else {
        Ok(())
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
    ensure_runner_idle(&state)?;

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
            .active
            .lock()
            .map_err(|_| "Preview state lock failed".to_string())?;
        *guard = Some(ActivePreview::Child {
            pid,
            label: label.to_string(),
        });
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
                    &completion_message(&label_wait, exit_status.code()),
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
        clear_active_child(&app_wait, pid);
    });

    Ok(())
}

fn decode_url_path(path: &str) -> String {
    let mut out = Vec::with_capacity(path.len());
    let bytes = path.as_bytes();
    let mut i = 0;

    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let h1 = bytes[i + 1];
            let h2 = bytes[i + 2];

            let v1 = (h1 as char).to_digit(16);
            let v2 = (h2 as char).to_digit(16);

            if let (Some(a), Some(b)) = (v1, v2) {
                out.push(((a * 16 + b) as u8) as char);
                i += 3;
                continue;
            }
        }

        if bytes[i] == b'+' {
            out.push(' ');
        } else {
            out.push(bytes[i] as char);
        }

        i += 1;
    }

    out.into_iter().collect()
}

fn safe_join(root: &Path, request_path: &str) -> PathBuf {
    let clean = request_path.trim_start_matches('/');
    let decoded = decode_url_path(clean);

    let mut joined = PathBuf::from(root);
    for component in Path::new(&decoded).components() {
        match component {
            Component::Normal(part) => joined.push(part),
            Component::CurDir => {}
            Component::RootDir | Component::ParentDir | Component::Prefix(_) => {}
        }
    }

    joined
}

fn content_type_for(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "html" | "htm" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "ico" => "image/x-icon",
        "txt" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

fn write_http_response(
    stream: &mut impl Write,
    status: &str,
    content_type: &str,
    body: &[u8],
) -> std::io::Result<()> {
    write!(
        stream,
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        status,
        content_type,
        body.len()
    )?;
    stream.write_all(body)?;
    stream.flush()
}

fn handle_static_connection(mut stream: std::net::TcpStream, root: &Path) -> std::io::Result<()> {
    let mut buffer = [0_u8; 8192];
    let bytes_read = stream.read(&mut buffer)?;

    if bytes_read == 0 {
        return Ok(());
    }

    let request = String::from_utf8_lossy(&buffer[..bytes_read]);
    let mut lines = request.lines();

    let request_line = match lines.next() {
        Some(line) => line,
        None => {
            return write_http_response(
                &mut stream,
                "400 Bad Request",
                "text/plain; charset=utf-8",
                b"Bad Request",
            );
        }
    };

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let raw_target = parts.next().unwrap_or("/");

    if method != "GET" && method != "HEAD" {
        return write_http_response(
            &mut stream,
            "405 Method Not Allowed",
            "text/plain; charset=utf-8",
            b"Method Not Allowed",
        );
    }

    let target = raw_target.split('?').next().unwrap_or("/");
    let mut file_path = if target == "/" || target.is_empty() {
        root.join("index.html")
    } else {
        safe_join(root, target)
    };

    if file_path.is_dir() {
        file_path = file_path.join("index.html");
    }

    if !file_path.exists() || !file_path.is_file() {
        return write_http_response(
            &mut stream,
            "404 Not Found",
            "text/plain; charset=utf-8",
            b"Not Found",
        );
    }

    let body = fs::read(&file_path)?;
    let content_type = content_type_for(&file_path);

    if method == "HEAD" {
        write!(
            stream,
            "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
            content_type,
            body.len()
        )?;
        stream.flush()
    } else {
        write_http_response(&mut stream, "200 OK", content_type, &body)
    }
}

fn start_static_preview(
    app: AppHandle,
    state: tauri::State<PreviewState>,
    project_path: String,
) -> Result<(), String> {
    let root = validate_project_path(&project_path)?;
    ensure_runner_idle(&state)?;

    let index_html = root.join("index.html");
    if !index_html.is_file() {
        return Err(format!(
            "Static preview requires index.html in: {}",
            project_path
        ));
    }

    let listener = TcpListener::bind(("127.0.0.1", 0))
        .map_err(|e| format!("Failed to bind localhost: {}", e))?;
    listener
        .set_nonblocking(true)
        .map_err(|e| format!("Failed to configure static preview server: {}", e))?;

    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to read static preview address: {}", e))?
        .port();

    let url = format!("http://127.0.0.1:{}/", port);
    let (stop_tx, stop_rx) = mpsc::channel::<()>();

    {
        let mut guard = state
            .active
            .lock()
            .map_err(|_| "Preview state lock failed".to_string())?;
        *guard = Some(ActivePreview::Static {
            stop_tx,
            url: url.clone(),
        });
    }

    emit_status(&app, "running");
    emit_log(
        &app,
        "status",
        &format!("Serving static site from {}", project_path),
    );
    emit_log(&app, "status", &format!("Preview ready: {}", url));

    let app_server = app.clone();
    let url_for_thread = url.clone();

    thread::spawn(move || {
        loop {
            if stop_rx.try_recv().is_ok() {
                break;
            }

            match listener.accept() {
                Ok((stream, _addr)) => {
                    if let Err(err) = handle_static_connection(stream, &root) {
                        emit_log(
                            &app_server,
                            "stderr",
                            &format!("Static preview request failed: {}", err),
                        );
                    }
                }
                Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(100));
                }
                Err(err) => {
                    emit_log(
                        &app_server,
                        "stderr",
                        &format!("Static preview server failed: {}", err),
                    );
                    break;
                }
            }
        }

        emit_log(&app_server, "status", "✔ Preview stopped");
        emit_status(&app_server, "idle");
        clear_active_static(&app_server, &url_for_thread);
    });

    Ok(())
}

#[tauri::command]
pub fn preview_get_status(state: tauri::State<PreviewState>) -> Result<String, String> {
    let guard = state
        .active
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
    let root = validate_project_path(&project_path)?;
    match detect_preview_kind(&root)? {
        PreviewKind::PackageProject => spawn_preview_process(
            app,
            state,
            project_path,
            &["install"],
            "installing",
            "pnpm install",
        ),
        PreviewKind::StaticSite => {
            ensure_runner_idle(&state)?;
            emit_log(&app, "status", "Install not needed for static preview.");
            Ok(())
        }
    }
}

#[tauri::command]
pub fn preview_start(
    app: AppHandle,
    state: tauri::State<PreviewState>,
    project_path: String,
) -> Result<(), String> {
    let root = validate_project_path(&project_path)?;
    match detect_preview_kind(&root)? {
        PreviewKind::PackageProject => {
            spawn_preview_process(app, state, project_path, &["dev"], "running", "pnpm dev")
        }
        PreviewKind::StaticSite => start_static_preview(app, state, project_path),
    }
}

#[tauri::command]
pub fn preview_stop(app: AppHandle, state: tauri::State<PreviewState>) -> Result<(), String> {
    let active = {
        let mut guard = state
            .active
            .lock()
            .map_err(|_| "Preview state lock failed".to_string())?;
        guard.take()
    };

    match active {
        Some(ActivePreview::Child { pid, label }) => {
            emit_log(&app, "status", "Stopping preview…");

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

            emit_log(&app, "status", &format!("Stopping {}", label));
        }
        Some(ActivePreview::Static { stop_tx, .. }) => {
            emit_log(&app, "status", "Stopping preview…");
            let _ = stop_tx.send(());
        }
        None => {}
    }

    emit_status(&app, "idle");
    Ok(())
}
