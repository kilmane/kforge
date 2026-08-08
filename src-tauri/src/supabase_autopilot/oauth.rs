use std::{sync::Arc, time::Duration};

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{Html, IntoResponse, Response},
    routing::get,
    Router,
};
use rmcp::transport::auth::{AuthorizationManager, AuthorizationRequest, OAuthState};
use serde::Deserialize;
use tauri_plugin_opener::OpenerExt;
use tokio::sync::{oneshot, Mutex};
use url::Url;

use super::{mcp, token_store::WindowsCredentialStore};

const CALLBACK_PATH: &str = "/callback";
const CALLBACK_TIMEOUT: Duration = Duration::from_secs(300);
const CALLBACK_OK_HTML: &str = "<!doctype html><title>KForge Supabase</title><p>Supabase authorization returned to KForge. You may close this window.</p>";
const CALLBACK_ERROR_HTML: &str = "<!doctype html><title>KForge Supabase</title><p>KForge rejected this authorization response. Return to KForge and reconnect.</p>";

#[derive(Debug, Deserialize)]
struct CallbackQuery {
    code: Option<String>,
    state: Option<String>,
    iss: Option<String>,
    error: Option<String>,
}

#[derive(Debug)]
struct CallbackPayload {
    code: String,
    state: String,
    issuer: Option<String>,
}

#[derive(Clone)]
struct CallbackState {
    expected_state: String,
    sender: Arc<Mutex<Option<oneshot::Sender<Result<CallbackPayload, String>>>>>,
}

pub async fn authorize(
    app: &tauri::AppHandle,
    server_url: &str,
    store: WindowsCredentialStore,
) -> Result<AuthorizationManager, String> {
    let (listener, redirect_uri) = bind_callback_listener().await?;

    let challenge = mcp::capture_auth_challenge(server_url).await?;
    let mut manager = AuthorizationManager::new(server_url)
        .await
        .map_err(|error| safe_oauth_error("OAuth discovery", error))?;
    manager.set_credential_store(store);

    let mut oauth_state = OAuthState::Unauthorized(manager);
    oauth_state
        .start_authorization(
            AuthorizationRequest::new(&redirect_uri)
                .with_client_name("KForge Supabase Autopilot")
                .with_application_type("native")
                .with_challenge(challenge),
        )
        .await
        .map_err(|error| safe_oauth_error("OAuth dynamic client registration", error))?;

    let authorization_url = oauth_state
        .get_authorization_url()
        .await
        .map_err(|error| safe_oauth_error("OAuth authorization URL", error))?;

    complete_browser_authorization(app, listener, authorization_url, oauth_state).await
}

pub async fn authorize_database_write(
    app: &tauri::AppHandle,
    server_url: &str,
    store: WindowsCredentialStore,
) -> Result<(), String> {
    const REQUIRED_SCOPE: &str = "database:write";

    let (listener, redirect_uri) = bind_callback_listener().await?;

    let challenge = mcp::capture_auth_challenge(server_url).await?;
    let mut manager = AuthorizationManager::new(server_url)
        .await
        .map_err(|error| safe_oauth_error("OAuth mutation discovery", error))?;
    manager.set_credential_store(store);

    let resolution = manager
        .resolve_metadata_from_challenge(Some(&challenge))
        .await
        .map_err(|error| safe_oauth_error("OAuth mutation metadata discovery", error))?;
    manager.set_metadata(resolution.metadata);

    let restored = manager
        .initialize_from_store()
        .await
        .map_err(|error| safe_oauth_error("OAuth mutation session restore", error))?;
    if !restored {
        return Err(
            "The Supabase session must be reauthorized before approving a database change".into(),
        );
    }

    manager
        .get_access_token()
        .await
        .map_err(|error| safe_oauth_error("OAuth mutation token restore", error))?;

    let current_scopes = manager.get_current_scopes().await;
    if current_scopes.iter().any(|scope| scope == REQUIRED_SCOPE) {
        return Ok(());
    }

    let mut oauth_state = OAuthState::Authorized(manager);
    let authorization_url = oauth_state
        .request_scope_upgrade(REQUIRED_SCOPE, &redirect_uri)
        .await
        .map_err(|error| safe_oauth_error("OAuth database-write permission upgrade", error))?;

    complete_browser_authorization(app, listener, authorization_url, oauth_state).await?;
    Ok(())
}
async fn bind_callback_listener() -> Result<(tokio::net::TcpListener, String), String> {
    let listener = tokio::net::TcpListener::bind(("127.0.0.1", 0))
        .await
        .map_err(|error| format!("loopback callback listener failed: {error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| format!("loopback callback address failed: {error}"))?
        .port();

    Ok((
        listener,
        format!("http://127.0.0.1:{port}{CALLBACK_PATH}"),
    ))
}

async fn complete_browser_authorization(
    app: &tauri::AppHandle,
    listener: tokio::net::TcpListener,
    authorization_url: String,
    mut oauth_state: OAuthState,
) -> Result<AuthorizationManager, String> {
    let expected_state = validate_authorization_url(&authorization_url)?;

    let (callback_sender, callback_receiver) = oneshot::channel();
    let callback_state = CallbackState {
        expected_state,
        sender: Arc::new(Mutex::new(Some(callback_sender))),
    };
    let router = Router::new()
        .route(CALLBACK_PATH, get(callback_handler))
        .with_state(callback_state);

    let (shutdown_sender, shutdown_receiver) = oneshot::channel::<()>();
    let server_task = tokio::spawn(async move {
        let _ = axum::serve(listener, router)
            .with_graceful_shutdown(async {
                let _ = shutdown_receiver.await;
            })
            .await;
    });

    if let Err(error) = app.opener().open_url(&authorization_url, None::<&str>) {
        let _ = shutdown_sender.send(());
        let _ = server_task.await;
        return Err(format!("system browser could not be opened: {error}"));
    }

    let callback = tokio::time::timeout(CALLBACK_TIMEOUT, callback_receiver).await;
    let _ = shutdown_sender.send(());
    let _ = server_task.await;

    let payload = callback
        .map_err(|_| "Supabase authorization timed out; reconnect to try again".to_string())?
        .map_err(|_| "loopback callback listener closed unexpectedly".to_string())??;

    oauth_state
        .handle_callback_with_issuer(&payload.code, &payload.state, payload.issuer.as_deref())
        .await
        .map_err(|error| safe_oauth_error("OAuth code exchange", error))?;

    oauth_state
        .into_authorization_manager()
        .ok_or_else(|| "OAuth authorization did not produce an authorized session".to_string())
}

async fn callback_handler(
    Query(query): Query<CallbackQuery>,
    State(state): State<CallbackState>,
) -> Response {
    let outcome = callback_payload(query, &state.expected_state);
    let success = outcome.is_ok();
    if let Some(sender) = state.sender.lock().await.take() {
        let _ = sender.send(outcome);
    }

    if success {
        (StatusCode::OK, Html(CALLBACK_OK_HTML)).into_response()
    } else {
        (StatusCode::BAD_REQUEST, Html(CALLBACK_ERROR_HTML)).into_response()
    }
}

fn callback_payload(query: CallbackQuery, expected_state: &str) -> Result<CallbackPayload, String> {
    if query.error.is_some() {
        return Err("Supabase authorization was denied or cancelled".into());
    }
    let received_state = query
        .state
        .ok_or_else(|| "OAuth callback did not include state".to_string())?;
    validate_callback_state(expected_state, &received_state)?;
    let code = query
        .code
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "OAuth callback did not include an authorization code".to_string())?;
    Ok(CallbackPayload {
        code,
        state: received_state,
        issuer: query.iss,
    })
}

fn validate_authorization_url(authorization_url: &str) -> Result<String, String> {
    let url = Url::parse(authorization_url)
        .map_err(|_| "OAuth authorization URL was invalid".to_string())?;
    if url.scheme() != "https" {
        return Err("OAuth authorization URL did not use HTTPS".into());
    }

    let query: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();
    let state = query
        .get("state")
        .filter(|value| value.len() >= 22)
        .cloned()
        .ok_or_else(|| "OAuth authorization URL did not contain high-entropy state".to_string())?;
    let challenge = query
        .get("code_challenge")
        .filter(|value| value.len() >= 43)
        .ok_or_else(|| "OAuth authorization URL did not contain a PKCE challenge".to_string())?;
    if challenge.contains('=') {
        return Err("OAuth PKCE challenge was not base64url encoded".into());
    }
    if query.get("code_challenge_method").map(String::as_str) != Some("S256") {
        return Err("OAuth authorization URL did not require PKCE S256".into());
    }
    Ok(state)
}

fn validate_callback_state(expected: &str, received: &str) -> Result<(), String> {
    if expected.as_bytes() != received.as_bytes() {
        return Err("OAuth callback state validation failed".into());
    }
    Ok(())
}

fn safe_oauth_error(stage: &str, error: impl std::fmt::Display) -> String {
    format!("{stage} failed: {}", redact_sensitive(&error.to_string()))
}

pub fn redact_sensitive(value: &str) -> String {
    let mut redacted = value.to_string();
    for key in ["access_token", "refresh_token", "code", "state"] {
        redacted = redact_value_after_key(&redacted, key);
    }
    if redacted.len() > 700 {
        redacted.truncate(700);
        redacted.push_str("…");
    }
    redacted
}

fn redact_value_after_key(input: &str, key: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut remaining = input;

    while let Some(index) = remaining.find(key) {
        let (before, after_key) = remaining.split_at(index + key.len());
        output.push_str(before);
        let mut chars = after_key.char_indices();
        let mut value_start = 0;
        for (offset, character) in chars.by_ref() {
            if matches!(character, '=' | ':' | '"' | '\'' | ' ') {
                value_start = offset + character.len_utf8();
                output.push(character);
            } else {
                value_start = offset;
                break;
            }
        }
        let value_tail = &after_key[value_start..];
        let value_end = value_tail
            .find(|character: char| matches!(character, '&' | ',' | ' ' | '"' | '\'' | '}'))
            .unwrap_or(value_tail.len());
        output.push_str("[REDACTED]");
        remaining = &value_tail[value_end..];
    }
    output.push_str(remaining);
    output
}

#[cfg(test)]
mod tests {
    use super::{callback_payload, redact_sensitive, validate_authorization_url, CallbackQuery};

    const STATE: &str = "0123456789abcdefghijklmnopqrstuv";
    const CHALLENGE: &str = "abcdefghijklmnopqrstuvwxyzABCDE0123456789-_x";

    #[test]
    fn authorization_url_requires_high_entropy_state_and_pkce_s256() {
        let url = format!(
            "https://api.supabase.com/oauth/authorize?state={STATE}&code_challenge={CHALLENGE}&code_challenge_method=S256"
        );
        assert_eq!(validate_authorization_url(&url).unwrap(), STATE);

        assert!(validate_authorization_url(
            "https://api.supabase.com/oauth/authorize?state=short&code_challenge=x&code_challenge_method=plain"
        )
        .is_err());
    }

    #[test]
    fn callback_rejects_wrong_state_before_code_exchange() {
        let result = callback_payload(
            CallbackQuery {
                code: Some("authorization-code".into()),
                state: Some("wrong-state".into()),
                iss: None,
                error: None,
            },
            STATE,
        );
        assert!(result.is_err());
    }

    #[test]
    fn callback_accepts_exact_state_and_preserves_issuer() {
        let result = callback_payload(
            CallbackQuery {
                code: Some("authorization-code".into()),
                state: Some(STATE.into()),
                iss: Some("https://api.supabase.com".into()),
                error: None,
            },
            STATE,
        )
        .unwrap();
        assert_eq!(result.state, STATE);
        assert_eq!(result.issuer.as_deref(), Some("https://api.supabase.com"));
    }

    #[test]
    fn sensitive_oauth_values_are_redacted_from_errors() {
        let output = redact_sensitive(
            "code=secret-code&state=secret-state access_token: bearer-secret refresh_token=\"refresh-secret\"",
        );
        assert!(!output.contains("secret-code"));
        assert!(!output.contains("secret-state"));
        assert!(!output.contains("bearer-secret"));
        assert!(!output.contains("refresh-secret"));
    }
}
