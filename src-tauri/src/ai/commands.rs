// src-tauri/src/ai/commands.rs

use crate::ai::{
  error::{AiError, AiErrorPayload},
  providers,
  secret_store,
  types::{AiRequest, AiResponse},
};

use serde::Deserialize;

// NOTE: We intentionally use camelCase argument names here
// so the frontend can invoke with { providerId, apiKey } reliably.

#[tauri::command]
pub fn ai_set_api_key(providerId: String, apiKey: String) -> Result<(), AiErrorPayload> {
  secret_store::set_api_key(&providerId, &apiKey).map_err(AiErrorPayload::from)
}

#[tauri::command]
pub fn ai_clear_api_key(providerId: String) -> Result<(), AiErrorPayload> {
  secret_store::clear_api_key(&providerId).map_err(AiErrorPayload::from)
}

#[tauri::command]
pub fn ai_has_api_key(providerId: String) -> Result<bool, AiErrorPayload> {
  let has = secret_store::get_api_key(&providerId)
    .map_err(AiErrorPayload::from)?
    .is_some();
  Ok(has)
}

#[tauri::command]
pub fn ai_generate(request: AiRequest) -> Result<AiResponse, AiErrorPayload> {
  let provider = providers::get_provider(&request.provider_id)
    .ok_or_else(|| AiErrorPayload::from(AiError::invalid(format!(
      "Unknown provider_id: {}",
      request.provider_id
    ))))?;

  provider.generate(&request).map_err(AiErrorPayload::from)
}

/// List available Ollama models (local).
///
/// - `endpoint` is optional and overrides the base URL (e.g. "http://localhost:11434").
/// - Uses Ollama endpoint: GET {base}/api/tags
/// - Returns a simple Vec of model names.
#[tauri::command]
pub fn ai_ollama_list_models(endpoint: Option<String>) -> Result<Vec<String>, AiErrorPayload> {
  let base_url = endpoint.unwrap_or_else(|| "http://localhost:11434".to_string());
  let url = format!("{}/api/tags", base_url.trim_end_matches('/'));

  let client = reqwest::blocking::Client::builder()
    .timeout(std::time::Duration::from_secs(30))
    .build()
    .map_err(|e| AiErrorPayload::from(AiError::unknown(format!("HTTP client build failed: {e}"))))?;

  let resp = client.get(url).send().map_err(|e| {
    let err = if e.is_connect() {
      AiError::provider(format!(
        "Could not connect to Ollama at {}. Is Ollama running? Try starting Ollama, then retry.",
        base_url
      ))
    } else {
      AiError::unknown(format!("Network error: {e}"))
    };
    AiErrorPayload::from(err)
  })?;

  let status = resp.status();
  let bytes = resp.bytes().map_err(|e| {
    AiErrorPayload::from(AiError::unknown(format!("Failed reading response: {e}")))
  })?;

  if !status.is_success() {
    let msg = match serde_json::from_slice::<OllamaErrorEnvelope>(&bytes) {
      Ok(env) => env.error,
      Err(_) => String::from_utf8_lossy(&bytes).to_string(),
    };

    let err = if status.as_u16() == 400 {
      AiError::invalid(msg)
    } else {
      AiError::provider(format!("Ollama HTTP {}: {}", status.as_u16(), msg))
    };

    return Err(AiErrorPayload::from(err));
  }

  let parsed: OllamaTagsResponse = serde_json::from_slice(&bytes)
    .map_err(|e| AiErrorPayload::from(AiError::provider(format!("Failed to parse Ollama JSON: {e}"))))?;

  let mut names: Vec<String> = parsed
    .models
    .into_iter()
    .filter_map(|m| m.name)
    .collect();

  // Nice to keep stable ordering for UI/debug
  names.sort();
  names.dedup();

  Ok(names)
}

// -------------------- Ollama JSON shapes (minimal) --------------------

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
  #[serde(default)]
  models: Vec<OllamaTagModel>,
}

#[derive(Debug, Deserialize)]
struct OllamaTagModel {
  name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OllamaErrorEnvelope {
  error: String,
}
