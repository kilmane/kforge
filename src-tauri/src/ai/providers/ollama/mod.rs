// src-tauri/src/ai/providers/ollama/mod.rs

use crate::ai::{
  error::AiError,
  types::{AiRequest, AiResponse, AiUsage},
};

use serde::{Deserialize, Serialize};

/// Canonical default base URL for Ollama (local).
pub const OLLAMA_DEFAULT_BASE_URL: &str = "http://localhost:11434";

/// Normalize Ollama base URLs so "local default" and "remote override" behave consistently.
///
/// Rules:
/// - trim whitespace
/// - trim trailing slash
/// - if user pasted `/v1` out of habit, strip it
pub fn normalize_ollama_base_url(raw: &str) -> String {
  let mut s = raw.trim().trim_end_matches('/').to_string();

  if s.ends_with("/v1") {
    s.truncate(s.len().saturating_sub(3));
    s = s.trim_end_matches('/').to_string();
  }

  s
}

/// Ollama provider (local).
///
/// Notes:
/// - Sync provider to match the current AiProvider trait.
/// - Uses `reqwest::blocking`.
/// - Default endpoint: http://localhost:11434
/// - Supports `AiRequest.endpoint` override (treated as base URL).
///
/// API:
/// - POST {base}/api/chat
///   https://github.com/ollama/ollama/blob/main/docs/api.md (reference)
pub struct OllamaProvider {
  base_url: String,
}

impl OllamaProvider {
  pub fn new() -> Self {
    Self {
      base_url: OLLAMA_DEFAULT_BASE_URL.to_string(),
    }
  }

  fn provider_id(&self) -> &'static str {
    "ollama"
  }

  fn resolve_base_url(&self, req: &AiRequest) -> String {
    let raw = req
      .endpoint
      .clone()
      .unwrap_or_else(|| self.base_url.clone());

    normalize_ollama_base_url(&raw)
  }

  fn friendly_network_error(&self, base_url: &str, e: &reqwest::Error) -> AiError {
    // Common “Ollama not running” case on localhost
    if e.is_connect() {
      return AiError::provider(format!(
        "Could not connect to Ollama at {}. Is Ollama running? Try starting Ollama, then retry.",
        base_url
      ));
    }

    AiError::unknown(format!("Network error: {e}"))
  }

  fn extract_output_text(resp: &OllamaChatResponse) -> String {
    resp
      .message
      .as_ref()
      .and_then(|m| m.content.clone())
      .unwrap_or_default()
  }
}

impl super::AiProvider for OllamaProvider {
  fn id(&self) -> &'static str {
    "ollama"
  }

  fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError> {
    let base_url = self.resolve_base_url(req);

    let url = format!("{}/api/chat", base_url.trim_end_matches('/'));

    let mut messages: Vec<OllamaMessage> = Vec::new();
    if let Some(sys) = req.system.as_ref().filter(|s| !s.trim().is_empty()) {
      messages.push(OllamaMessage {
        role: "system".to_string(),
        content: sys.to_string(),
      });
    }
    messages.push(OllamaMessage {
      role: "user".to_string(),
      content: req.input.clone(),
    });

    // Ollama uses an `options` object for sampling / generation controls.
    // We map:
    // - temperature -> options.temperature
    // - max_output_tokens -> options.num_predict
    let options = if req.temperature.is_some() || req.max_output_tokens.is_some() {
      Some(OllamaOptions {
        temperature: req.temperature,
        num_predict: req.max_output_tokens,
      })
    } else {
      None
    };

    let body = OllamaChatRequest {
      model: req.model.clone(),
      messages,
      stream: Some(false),
      options,
    };

    let client = reqwest::blocking::Client::builder()
      .timeout(std::time::Duration::from_secs(120))
      .build()
      .map_err(|e| AiError::unknown(format!("HTTP client build failed: {e}")))?;

    let resp = client
      .post(url)
      .json(&body)
      .send()
      .map_err(|e| self.friendly_network_error(&base_url, &e))?;

    let status = resp.status();
    let bytes = resp
      .bytes()
      .map_err(|e| AiError::unknown(format!("Failed reading response: {e}")))?;

    if !status.is_success() {
      // Ollama often returns: { "error": "..." }
      let msg = match serde_json::from_slice::<OllamaErrorEnvelope>(&bytes) {
        Ok(env) => env.error,
        Err(_) => String::from_utf8_lossy(&bytes).to_string(),
      };

      if status.as_u16() == 400 {
        return Err(AiError::invalid(msg));
      }

      return Err(AiError::provider(format!(
        "Ollama HTTP {}: {}",
        status.as_u16(),
        msg
      )));
    }

    let parsed: OllamaChatResponse = serde_json::from_slice(&bytes)
      .map_err(|e| AiError::provider(format!("Failed to parse Ollama JSON: {e}")))?;

    let output_text = Self::extract_output_text(&parsed);

    // Token-ish counts (if Ollama provides them)
    // Ollama typically returns:
    // - prompt_eval_count
    // - eval_count
    let usage = match (parsed.prompt_eval_count, parsed.eval_count) {
      (None, None) => None,
      (p, c) => Some(AiUsage {
        input_tokens: p,
        output_tokens: c,
        total_tokens: match (p, c) {
          (Some(p), Some(c)) => Some(p.saturating_add(c)),
          _ => None,
        },
      }),
    };

    Ok(AiResponse {
      id: parsed
        .id
        .clone()
        .unwrap_or_else(|| "ollama".to_string()),
      provider_id: self.provider_id().to_string(),
      model: parsed
        .model
        .clone()
        .unwrap_or_else(|| req.model.clone()),
      output_text,
      usage,
    })
  }
}

// -------------------- Ollama JSON shapes (minimal) --------------------

#[derive(Debug, Serialize)]
struct OllamaChatRequest {
  model: String,
  messages: Vec<OllamaMessage>,

  #[serde(skip_serializing_if = "Option::is_none")]
  stream: Option<bool>,

  #[serde(skip_serializing_if = "Option::is_none")]
  options: Option<OllamaOptions>,
}

#[derive(Debug, Serialize)]
struct OllamaMessage {
  role: String,
  content: String,
}

#[derive(Debug, Serialize)]
struct OllamaOptions {
  #[serde(skip_serializing_if = "Option::is_none")]
  temperature: Option<f32>,

  /// Max tokens to generate
  #[serde(skip_serializing_if = "Option::is_none")]
  num_predict: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct OllamaChatResponse {
  // Present in many Ollama responses (not guaranteed)
  id: Option<String>,
  model: Option<String>,

  message: Option<OllamaAssistantMessage>,

  // Token-ish counters (if available)
  #[serde(default)]
  prompt_eval_count: Option<u32>,
  #[serde(default)]
  eval_count: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct OllamaAssistantMessage {
  content: Option<String>,
}

// -------------------- Ollama error envelope --------------------

#[derive(Debug, Deserialize)]
struct OllamaErrorEnvelope {
  error: String,
}
