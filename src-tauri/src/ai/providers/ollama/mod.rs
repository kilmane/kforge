// src-tauri/src/ai/providers/ollama/mod.rs

use crate::ai::{
    error::AiError,
    secret_store,
    types::{AiRequest, AiResponse, AiUsage},
};

use serde::{Deserialize, Serialize};

/// Canonical default base URL for Ollama endpoint access.
pub const OLLAMA_DEFAULT_BASE_URL: &str = "http://localhost:11434";

/// Canonical default base URL for direct Ollama Cloud API access.
///
/// The Ollama native API path is appended by this provider:
/// - POST {base}/api/chat
/// - GET  {base}/api/tags
///
/// So this value must NOT include `/api`.
pub const OLLAMA_CLOUD_DEFAULT_BASE_URL: &str = "https://ollama.com";

/// Normalize Ollama base URLs so local, remote, and cloud endpoints behave consistently.
///
/// Rules:
/// - trim whitespace
/// - trim trailing slash
/// - if user pasted `/v1` out of habit, strip it
/// - if user pasted `/api`, strip it because this adapter appends `/api/chat`
pub fn normalize_ollama_base_url(raw: &str) -> String {
    let mut s = raw.trim().trim_end_matches('/').to_string();

    loop {
        let before = s.clone();

        if s.ends_with("/v1") {
            s.truncate(s.len().saturating_sub(3));
            s = s.trim_end_matches('/').to_string();
        }

        if s.ends_with("/api") {
            s.truncate(s.len().saturating_sub(4));
            s = s.trim_end_matches('/').to_string();
        }

        if s == before {
            break;
        }
    }

    s
}

/// Ollama provider.
///
/// Variants:
/// - `ollama`: endpoint-based access, normally local Ollama, no API key required.
/// - `ollama_cloud`: direct Ollama Cloud API access, API key required.
///
/// Notes:
/// - Sync provider to match the current AiProvider trait.
/// - Uses `reqwest::blocking`.
/// - Supports `AiRequest.endpoint` override, although the UI only exposes this for endpoint mode.
///
/// API:
/// - POST {base}/api/chat
pub struct OllamaProvider {
    provider_id: &'static str,
    display_name: &'static str,
    base_url: String,
    needs_api_key: bool,
}

impl OllamaProvider {

    pub fn new_endpoint() -> Self {
        Self {
            provider_id: "ollama",
            display_name: "Ollama endpoint",
            base_url: OLLAMA_DEFAULT_BASE_URL.to_string(),
            needs_api_key: false,
        }
    }

    pub fn new_cloud() -> Self {
        Self {
            provider_id: "ollama_cloud",
            display_name: "Ollama Cloud",
            base_url: OLLAMA_CLOUD_DEFAULT_BASE_URL.to_string(),
            needs_api_key: true,
        }
    }

    fn provider_id(&self) -> &'static str {
        self.provider_id
    }

    fn resolve_base_url(&self, req: &AiRequest) -> String {
        let raw = req
            .endpoint
            .clone()
            .unwrap_or_else(|| self.base_url.clone());

        normalize_ollama_base_url(&raw)
    }

    fn resolve_api_key(&self) -> Result<Option<String>, AiError> {
        if !self.needs_api_key {
            return Ok(None);
        }

        match secret_store::get_api_key(self.provider_id())? {
            Some(key) if !key.trim().is_empty() => Ok(Some(key)),
            _ => Err(AiError::provider(
                "No Ollama Cloud API key set. Add it in Settings first.",
            )),
        }
    }

    fn friendly_network_error(&self, base_url: &str, e: &reqwest::Error) -> AiError {
        if e.is_connect() {
            if self.needs_api_key {
                return AiError::provider(format!(
                    "Could not connect to Ollama Cloud at {}. Check your internet connection, then retry.",
                    base_url
                ));
            }

            return AiError::provider(format!(
                "Could not connect to Ollama endpoint at {}. Is Ollama running? Try starting Ollama, then retry.",
                base_url
            ));
        }

        AiError::unknown(format!("Network error: {e}"))
    }

    fn extract_output_text(resp: &OllamaChatResponse) -> String {
        resp.message
            .as_ref()
            .and_then(|m| m.content.clone())
            .unwrap_or_default()
    }
}

impl super::AiProvider for OllamaProvider {
    fn id(&self) -> &'static str {
        self.provider_id()
    }

    fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError> {
        let base_url = self.resolve_base_url(req);
        let api_key = self.resolve_api_key()?;

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

        let mut request = client.post(url).json(&body);

        if let Some(key) = api_key {
            request = request.bearer_auth(key);
        }

        let resp = request
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

            if self.needs_api_key && matches!(status.as_u16(), 401 | 403) {
                return Err(AiError::provider(format!(
                    "{} authentication failed (HTTP {}): {}. Check your Ollama API key.",
                    self.display_name,
                    status.as_u16(),
                    msg
                )));
            }

            return Err(AiError::provider(format!(
                "{} HTTP {}: {}",
                self.display_name,
                status.as_u16(),
                msg
            )));
        }

        let parsed: OllamaChatResponse = serde_json::from_slice(&bytes)
            .map_err(|e| AiError::provider(format!("Failed to parse Ollama JSON: {e}")))?;

        let output_text = Self::extract_output_text(&parsed);

        // Token-ish counts if Ollama provides them.
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
            id: parsed.id.clone().unwrap_or_else(|| self.provider_id().to_string()),
            provider_id: self.provider_id().to_string(),
            model: parsed.model.clone().unwrap_or_else(|| req.model.clone()),
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

    /// Max tokens to generate.
    #[serde(skip_serializing_if = "Option::is_none")]
    num_predict: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct OllamaChatResponse {
    // Present in many Ollama responses, but not guaranteed.
    id: Option<String>,
    model: Option<String>,

    message: Option<OllamaAssistantMessage>,

    // Token-ish counters, if available.
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
